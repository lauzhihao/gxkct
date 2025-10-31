#!/bin/bash

# 教育树系统 - 一键启动脚本
# 功能: 安装依赖、停止已存在服务、启动开发服务器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}教育树系统 - 一键启动脚本${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 步骤1: 检查pnpm是否安装
echo -e "${YELLOW}[1/4] 检查pnpm是否安装...${NC}"
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}错误: 未检测到pnpm${NC}"
    echo -e "${YELLOW}请先安装pnpm:${NC}"
    echo -e "  npm install -g pnpm"
    echo -e "  或访问: https://pnpm.io/installation"
    exit 1
fi
echo -e "${GREEN}✓ pnpm已安装 (版本: $(pnpm -v))${NC}"
echo ""

# 步骤2: 安装依赖
echo -e "${YELLOW}[2/4] 安装项目依赖...${NC}"
pnpm install
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 步骤3: 停止已存在的开发服务器
echo -e "${YELLOW}[3/4] 检查并停止已存在的服务...${NC}"
PORT=3000

# 检查端口是否被占用
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}检测到端口 $PORT 已被占用${NC}"
    
    # 获取占用端口的进程ID
    PID=$(lsof -ti:$PORT)
    
    if [ ! -z "$PID" ]; then
        echo -e "${YELLOW}正在停止进程 (PID: $PID)...${NC}"
        kill -9 $PID 2>/dev/null || true
        sleep 1
        
        # 再次检查端口是否已释放
        if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
            echo -e "${RED}警告: 端口 $PORT 仍被占用,请手动停止相关进程${NC}"
            exit 1
        else
            echo -e "${GREEN}✓ 已停止旧服务${NC}"
        fi
    fi
else
    echo -e "${GREEN}✓ 端口 $PORT 未被占用${NC}"
fi
echo ""

# 步骤4: 启动开发服务器
echo -e "${YELLOW}[4/4] 启动开发服务器...${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}开发服务器启动中...${NC}"
echo -e "${GREEN}访问地址: http://localhost:$PORT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 启动开发服务器
pnpm dev

