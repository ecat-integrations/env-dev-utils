#!/bin/bash
# ECAT开发环境停止脚本
# 用于终止运行中的前后端服务
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
echo -e "${BLUE}ECAT 开发环境停止脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# ============================================
# 1. 终止前端服务
# ============================================
echo -e "${YELLOW}检查前端服务...${NC}"

FRONTEND_PID_FILE="$SCRIPT_DIR/pids/ecat-frontend.pid"
FRONTEND_STOPPED=false

if [ -f "$FRONTEND_PID_FILE" ]; then
    SAVED_PID=$(cat "$FRONTEND_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
        echo -e "${YELLOW}终止前端进程 (PID: $SAVED_PID)...${NC}"
        kill "$SAVED_PID" 2>/dev/null || true
        FRONTEND_STOPPED=true

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
            sleep 1
            if ! kill -0 "$SAVED_PID" 2>/dev/null; then
                echo -e "${GREEN}前端服务已强制终止${NC}"
            fi
        fi
    else
        echo -e "${GREEN}前端进程未运行 (PID 文件存在但进程不存在)${NC}"
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
BACKEND_STOPPED=false

if [ -f "$BACKEND_PID_FILE" ]; then
    SAVED_PID=$(cat "$BACKEND_PID_FILE" 2>/dev/null || echo "")
    if [ -n "$SAVED_PID" ] && kill -0 "$SAVED_PID" 2>/dev/null; then
        echo -e "${YELLOW}终止后端进程 (PID: $SAVED_PID)...${NC}"
        kill "$SAVED_PID" 2>/dev/null || true
        BACKEND_STOPPED=true

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
            sleep 1
            if ! kill -0 "$SAVED_PID" 2>/dev/null; then
                echo -e "${GREEN}后端服务已强制终止${NC}"
            fi
        fi
    else
        echo -e "${GREEN}后端进程未运行 (PID 文件存在但进程不存在)${NC}"
    fi
    rm -f "$BACKEND_PID_FILE"
else
    echo -e "${GREEN}没有运行中的后端服务${NC}"
fi
echo ""

# ============================================
# 3. 额外检查：查找可能遗留的进程
# ============================================
echo -e "${YELLOW}检查端口占用情况...${NC}"

BACKEND_PORT_PID=$(lsof -ti:8080 2>/dev/null || echo "")
FRONTEND_PORT_PID=$(lsof -ti:8081 2>/dev/null || echo "")

if [ -n "$BACKEND_PORT_PID" ]; then
    echo -e "${YELLOW}发现端口 8080 仍被占用 (PID: $BACKEND_PORT_PID)，正在清理...${NC}"
    kill "$BACKEND_PORT_PID" 2>/dev/null || true
    sleep 1
    if kill -0 "$BACKEND_PORT_PID" 2>/dev/null; then
        kill -9 "$BACKEND_PORT_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}端口 8080 已清理${NC}"
fi

if [ -n "$FRONTEND_PORT_PID" ]; then
    echo -e "${YELLOW}发现端口 8081 仍被占用 (PID: $FRONTEND_PORT_PID)，正在清理...${NC}"
    kill "$FRONTEND_PORT_PID" 2>/dev/null || true
    sleep 1
    if kill -0 "$FRONTEND_PORT_PID" 2>/dev/null; then
        kill -9 "$FRONTEND_PORT_PID" 2>/dev/null || true
    fi
    echo -e "${GREEN}端口 8081 已清理${NC}"
fi

if [ -z "$BACKEND_PORT_PID" ] && [ -z "$FRONTEND_PORT_PID" ]; then
    echo -e "${GREEN}端口 8080 和 8081 均未被占用${NC}"
fi
echo ""

# ============================================
# 完成
# ============================================
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}ECAT 开发环境已停止${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 显示状态摘要
if [ "$FRONTEND_STOPPED" = true ] || [ "$BACKEND_STOPPED" = true ]; then
    echo -e "${GREEN}已停止的服务:${NC}"
    [ "$FRONTEND_STOPPED" = true ] && echo -e "  - 前端服务 (端口 8081)"
    [ "$BACKEND_STOPPED" = true ] && echo -e "  - 后端服务 (端口 8080)"
else
    echo -e "${YELLOW}没有运行中的服务需要停止${NC}"
fi
echo ""

echo -e "${YELLOW}日志文件位置:${NC}"
echo -e "  - 后端: $PROJECT_ROOT/logs/ecat-backend.log"
echo -e "  - 前端: $PROJECT_ROOT/logs/ecat-frontend.log"
echo ""

echo -e "${YELLOW}如需重新启动服务，请运行:${NC}"
echo -e "${BLUE}bash $SCRIPT_DIR/restart-ecat-dev.sh${NC}"
echo ""
