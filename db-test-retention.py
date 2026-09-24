#!/usr/bin/env python3
"""测试库数据保留清理（crontab 每天 06:00 跑）。

职责边界（用户裁定 2026-09-24：raw 7 天、只聚焦大表，日志/小表不清）：
- raw（adm/asm_data_sample）保留 7 天由 TimescaleDB add_retention_policy 原生执行，本脚本不动 raw；
- 本脚本只处理 stat 手工月分区「当月 + 上月」保留：更老的整分区 DROP
  （adm/asm × minute/5min/hour/day 八父表，分区由 PartitionManager 写路径 ensure，
   只建调度窗口覆盖的近月，与本脚本的隔月删除无交集）。

安全阀：
1. 白名单正则 ^ (adm|asm)_data_stat_(minute|5min|hour|day)_\\d{6}$ 且 pg_inherits 校验确为八父表分区；
2. 分区月份 < 上月（UTC 月，分区按 UTC 对齐）才删；
3. adm/asm compute_log 有活跃 job 时整场跳过（e2e 可能正在向目标分区写入，删了会砸在跑测试）；
4. --dry-run 只报不删。

用法：python3 db-test-retention.py [--dry-run]
凭据唯一来源：workspace 根 .env（POSTGRES_*）。
"""
import argparse
import datetime as dt
import os
import re
import sys

import psycopg2

WS_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ENV_FILE = os.path.join(WS_ROOT, '.env')

PARENTS = {'adm_data_stat_minute', 'adm_data_stat_5min', 'adm_data_stat_hour', 'adm_data_stat_day',
           'asm_stat_minute', 'asm_stat_5min', 'asm_stat_hour', 'asm_stat_day'}
PART_RE = re.compile(r'^(adm_data_stat|asm_stat)_(minute|5min|hour|day)_(\d{6})$')


def load_env():
    for line in open(ENV_FILE):
        m = re.match(r'\s*(POSTGRES_\w+)\s*=\s*(.*)\s*$', line)
        if m and not m.group(1).endswith('_FILE'):
            os.environ.setdefault(m.group(1), m.group(2).strip().strip('"'))


def keep_months(now_utc):
    """当月 + 上月（UTC），返回可保留的最小 YYYYMM 整数。"""
    prev = now_utc.replace(day=1) - dt.timedelta(days=1)
    return int(prev.strftime('%Y%m'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dry-run', action='store_true', help='只报告将删除的分区，不执行 DROP')
    args = ap.parse_args()
    load_env()
    conn = psycopg2.connect(host=os.environ['POSTGRES_HOST'], port=int(os.environ['POSTGRES_PORT']),
                            dbname=os.environ['POSTGRES_DB'], user=os.environ['POSTGRES_USER'],
                            password=os.environ['POSTGRES_PASSWORD'])
    cur = conn.cursor()

    # 安全阀 3：活跃 job 在跑即整场跳过（cron 场景退出码 0，不产噪音）
    for t in ('adm_stat_compute_log', 'asm_stat_compute_log'):
        cur.execute(f"select count(*) from {t} where status in ('RUNNING','PENDING','PAUSED')")
        if cur.fetchone()[0]:
            print(f'[跳过] {t} 有活跃 job，本次不删任何分区')
            conn.close()
            return 0

    now = dt.datetime.now(dt.timezone.utc)
    min_keep = keep_months(now)
    print(f'[规则] 保留 ≥ {min_keep}（当月+上月，UTC {now:%Y-%m-%d}），更老的 stat 分区整删'
          f'{"（DRY-RUN）" if args.dry_run else ""}')

    # 候选分区：白名单正则 + 确为八父表分区（pg_inherits 双向校验）
    cur.execute("""
        select c.relname, p.relname, pg_total_relation_size(c.oid)
        from pg_inherits i
        join pg_class c on c.oid = i.inhrelid
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        join pg_class p on p.oid = i.inhparent
    """)
    dropped, freed = [], 0
    for child, parent, size in cur.fetchall():
        m = PART_RE.match(child)
        if not m or parent not in PARENTS:
            continue
        if int(m.group(3)) >= min_keep:
            continue
        dropped.append((child, size))
        freed += size
        print(f'  将删 {child:36s} {size / 2**20:8.1f}MB')
    if not dropped:
        print('[结果] 无过期分区')
    else:
        print(f'[合计] {len(dropped)} 个分区 / {freed / 2**20:.1f}MB')
        if not args.dry_run:
            for child, _ in dropped:
                cur.execute(f'DROP TABLE IF EXISTS public."{child}"')
            conn.commit()
            print('[执行] DROP 已提交')
    conn.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
