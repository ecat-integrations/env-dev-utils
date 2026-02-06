#!/bin/bash

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 切换到工作区根目录（从 ecat-integrations/env-dev-utils 向上两级）
cd "$SCRIPT_DIR/../.." || {
  echo "错误: 无法切换到工作区根目录"
  exit 1
}

# 定义模块列表
modules=(
  "env-alarm-manager"
  "env-maintenance-manager"
  "env-patrol-manager"
  "env-quality-control-manager"
  "env-device-manager"
  "env-material-manager"
  "env-access-control"
  "env-data-manager"
  "env-compare-manager"
)

# 遍历模块列表
for module in "${modules[@]}"; do
  echo "开始处理模块: $module"

  # 进入模块目录
  cd "ecat-integrations/$module/src/main/resources/vue-modules" || {
    echo "错误: 无法进入目录 ecat-integrations/$module/src/main/resources/vue-modules"
    continue
  }

  # 执行 npm 命令
  echo "在 $module 目录下执行: npm install"
  npm install

  echo "在 $module 目录下执行: npm run release"
  npm run release

  # 返回工作区根目录
  cd "$SCRIPT_DIR/../.." || exit 1
  echo "模块 $module 处理完毕"
  echo "-----------------------------------"
done

echo "所有模块处理完成"
