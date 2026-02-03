#!/bin/bash
# ECAT开发环境重启脚本
# 用于终止旧的前后端服务并启动新的服务
# 使用方法：从项目根目录 /home/dev/app 运行此脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}ECAT 开发环境重启脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}项目根目录: $PROJECT_ROOT${NC}"
echo ""

# 检查Java环境
echo -e "${YELLOW}检查 Java 环境...${NC}"
if ! command -v java &> /dev/null; then
    echo -e "${RED}错误: 未找到 Java。请安装 Java 8 或更高版本。${NC}"
    exit 1
fi
echo -e "${GREEN}Java 版本: $(java -version 2>&1 | head -1)${NC}"
echo ""

# 检查Node.js环境
echo -e "${YELLOW}检查 Node.js 环境...${NC}"
if ! command -v node &> /dev/null; then
    echo -e "${RED}错误: 未找到 Node.js。请安装 Node.js。${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js 版本: $(node --version)${NC}"
echo ""

# 检查npm环境
if ! command -v npm &> /dev/null; then
    echo -e "${RED}错误: 未找到 npm。${NC}"
    exit 1
fi
echo -e "${GREEN}npm 版本: $(npm --version)${NC}"
echo ""

# ============================================
# 1. 终止前端服务
# ============================================
echo -e "${YELLOW}检查前端服务...${NC}"

FRONTEND_PID_FILE="$SCRIPT_DIR/pids/ecat-frontend.pid"

if [ -f "$FRONTEND_PID_FILE" ]; then
    SAVED_PID=$(cat "$FRONTEND_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
        echo -e "${YELLOW}终止前端进程 (PID: $SAVED_PID)${NC}"
        kill "$SAVED_PID" 2>/dev/null || true

        # 等待最多 5 秒让进程优雅退出
        for i in {1..5}; do
            if ! kill -0 "$SAVED_PID" 2>/dev/null; then
                echo -e "${GREEN}前端服务已终止${NC}"
                break
            fi
            sleep 1
        done

        # 如果进程仍然存在，强制终止
        if kill -0 "$SAVED_PID" 2>/dev/null; then
            echo -e "${YELLOW}强制终止前端进程...${NC}"
            kill -9 "$SAVED_PID" 2>/dev/null || true
        fi
    fi
    rm -f "$FRONTEND_PID_FILE"
else
    echo -e "${GREEN}没有运行中的前端服务${NC}"
fi
echo ""

# ============================================
# 2. 终止后端服务
# ============================================
echo -e "${YELLOW}检查后端服务...${NC}"

BACKEND_PID_FILE="$SCRIPT_DIR/pids/ecat-backend.pid"

if [ -f "$BACKEND_PID_FILE" ]; then
    SAVED_PID=$(cat "$BACKEND_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
        echo -e "${YELLOW}终止后端进程 (PID: $SAVED_PID)${NC}"
        kill "$SAVED_PID" 2>/dev/null || true

        # 等待最多 10 秒让进程优雅退出
        for i in {1..10}; do
            if ! kill -0 "$SAVED_PID" 2>/dev/null; then
                echo -e "${GREEN}后端服务已终止${NC}"
                break
            fi
            sleep 1
        done

        # 如果进程仍然存在，强制终止
        if kill -0 "$SAVED_PID" 2>/dev/null; then
            echo -e "${YELLOW}强制终止后端进程...${NC}"
            kill -9 "$SAVED_PID" 2>/dev/null || true
        fi
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${GREEN}没有运行中的后端服务${NC}"
fi
echo ""

# ============================================
# 3. 检查ecat-core JAR是否存在
# ============================================
echo -e "${YELLOW}检查 ecat-core JAR 文件...${NC}"
ECAT_CORE_JAR="$PROJECT_ROOT/ecat-core/target/ecat-core-1.0.1.jar"

if [ ! -f "$ECAT_CORE_JAR" ]; then
    echo -e "${RED}错误: ecat-core JAR 文件不存在: $ECAT_CORE_JAR${NC}"
    echo -e "${YELLOW}提示: 请先运行以下命令构建 ecat-core:${NC}"
    echo -e "${BLUE}cd $PROJECT_ROOT/ecat-core && mvn clean package -DskipTests${NC}"
    exit 1
fi
echo -e "${GREEN}找到 ecat-core JAR: $ECAT_CORE_JAR${NC}"
echo ""

# ============================================
# 4. 检查前端目录是否存在
# ============================================
echo -e "${YELLOW}检查前端项目目录...${NC}"
FRONTEND_DIR="$PROJECT_ROOT/ecat-integrations/ruoyi/ruoyi-ui-v3"

if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}错误: 前端目录不存在: $FRONTEND_DIR${NC}"
    exit 1
fi

if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo -e "${RED}错误: 前端 package.json 不存在${NC}"
    exit 1
fi
echo -e "${GREEN}前端目录: $FRONTEND_DIR${NC}"
echo ""

# 检查前端依赖是否已安装
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "${YELLOW}前端依赖未安装，正在安装...${NC}"
    cd "$FRONTEND_DIR"
    npm install
    echo -e "${GREEN}前端依赖安装完成${NC}"
    cd "$PROJECT_ROOT"
fi
echo ""

# ============================================
# 5. 启动后端服务 (8080)
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}启动后端服务...${NC}"
echo -e "${BLUE}========================================${NC}"

# 创建日志和 PID 目录
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$SCRIPT_DIR/pids"

# 启动后端 (在后台运行)
echo -e "${GREEN}启动 ecat-core (端口 8080)...${NC}"
cd "$PROJECT_ROOT"
nohup java -jar "$ECAT_CORE_JAR" \
    --server.port=8080 \
    > "$PROJECT_ROOT/logs/ecat-backend.log" 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > "$SCRIPT_DIR/pids/ecat-backend.pid"

echo -e "${GREEN}后端服务已启动 (PID: $BACKEND_PID)${NC}"
echo -e "${YELLOW}日志文件: $PROJECT_ROOT/logs/ecat-backend.log${NC}"
echo ""

# 等待后端启动
echo -e "${YELLOW}等待后端服务启动...${NC}"
for i in {1..30}; do
    if curl -s http://localhost:8080/ >/dev/null 2>&1 || \
       curl -s http://localhost:8080/index.html >/dev/null 2>&1 || \
       curl -s http://localhost:8080/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}后端服务启动成功！${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}后端服务可能仍在启动中，请稍后检查日志${NC}"
    fi
    sleep 1
done
echo ""

# ============================================
# 6. 启动前端服务 (8081)
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}启动前端服务...${NC}"
echo -e "${BLUE}========================================${NC}"

# 从前端目录启动 Vite（Vite 需要在项目根目录运行才能找到 index.html）
echo -e "${GREEN}启动前端开发服务器 (端口 8081)...${NC}"
echo -e "${YELLOW}注意: 从前端目录启动以正确加载静态文件${NC}"

cd "$FRONTEND_DIR"

# 启动 Vite
nohup ./node_modules/.bin/vite --port 8081 --host \
    > "$PROJECT_ROOT/logs/ecat-frontend.log" 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > "$SCRIPT_DIR/pids/ecat-frontend.pid"

echo -e "${GREEN}前端服务已启动 (PID: $FRONTEND_PID)${NC}"
echo -e "${YELLOW}日志文件: $PROJECT_ROOT/logs/ecat-frontend.log${NC}"
echo ""

# 等待前端启动
echo -e "${YELLOW}等待前端服务启动...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:8081/ >/dev/null 2>&1; then
        echo -e "${GREEN}前端服务启动成功！${NC}"
        break
    fi
    if [ $i -eq 20 ]; then
        echo -e "${YELLOW}前端服务可能仍在启动中，请稍后检查日志${NC}"
    fi
    sleep 1
done
echo ""

# ============================================
# 完成
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}ECAT 开发环境启动完成！${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}后端服务:${NC} http://localhost:8080"
echo -e "${GREEN}前端服务:${NC} http://localhost:8081"
echo ""
echo -e "${YELLOW}日志文件:${NC}"
echo -e "  - 后端: $PROJECT_ROOT/logs/ecat-backend.log"
echo -e "  - 前端: $PROJECT_ROOT/logs/ecat-frontend.log"
echo ""
echo -e "${YELLOW}进程 PID:${NC}"
echo -e "  - 后端: $BACKEND_PID ($SCRIPT_DIR/pids/ecat-backend.pid)"
echo -e "  - 前端: $FRONTEND_PID ($SCRIPT_DIR/pids/ecat-frontend.pid)"
echo ""
echo -e "${YELLOW}停止服务:${NC}"
echo -e "  - 后端: kill $BACKEND_PID 或 kill \$(cat $SCRIPT_DIR/pids/ecat-backend.pid)"
echo -e "  - 前端: kill $FRONTEND_PID 或 kill \$(cat $SCRIPT_DIR/pids/ecat-frontend.pid)"
echo -e "  - 或重新运行此脚本进行重启"
echo ""
echo -e "${YELLOW}查看日志:${NC}"
echo -e "  - 后端: tail -f $PROJECT_ROOT/logs/ecat-backend.log"
echo -e "  - 前端: tail -f $PROJECT_ROOT/logs/ecat-frontend.log"
echo ""
