#!/usr/bin/env bash
set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 切换到项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

# Prod环境配置（硬编码）
HOST="gxkct.com"
REMOTE_USER="root"
SSH_KEY=""
REMOTE_ROOT="/var/www/gxkct"
API_BASE_URL="https://www.gxkct.com/college"
ENVIRONMENT="production"
CONTAINER_NAME="gxkct-prod"
PORT="3000"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deploying to Prod (Docker)${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 步骤1: 构建Docker镜像
echo -e "${YELLOW}[1/3] Building Docker image...${NC}"
DOCKER_IMAGE_TAG="$(date +%s)-latest"
if ! docker build \
  --tag "gxkct:${DOCKER_IMAGE_TAG}" \
  --file Dockerfile \
  --build-arg "NEXT_PUBLIC_API_BASE_URL=${API_BASE_URL}" \
  --build-arg "NEXT_PUBLIC_ENVIRONMENT=${ENVIRONMENT}" \
  . 2>&1 | tail -20; then
  echo -e "${RED}Docker image build failed${NC}"
  exit 1
fi
echo -e "${GREEN}[OK] Docker image built${NC}"
echo ""

# 步骤2: 准备SSH连接选项
SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
  SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")
fi

# 步骤3: 导出并上传镜像
echo -e "${YELLOW}[2/3] Uploading Docker image to remote server...${NC}"

DOCKER_IMAGE_FILE="/tmp/gxkct-prod-${DOCKER_IMAGE_TAG}.tar"
DOCKER_IMAGE_SIZE=""

# 导出镜像
echo "Saving Docker image..."
docker save "gxkct:${DOCKER_IMAGE_TAG}" -o "$DOCKER_IMAGE_FILE"
DOCKER_IMAGE_SIZE=$(du -h "$DOCKER_IMAGE_FILE" | cut -f1)
echo "Image size: $DOCKER_IMAGE_SIZE"

# 创建远端目录
ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$HOST" "mkdir -p '$REMOTE_ROOT'"

# 上传镜像
echo "Uploading image to remote server..."
scp "${SSH_OPTS[@]}" "$DOCKER_IMAGE_FILE" "$REMOTE_USER@$HOST:$REMOTE_ROOT/gxkct-image.tar"

# 清理本地临时文件
rm -f "$DOCKER_IMAGE_FILE"

echo -e "${GREEN}[OK] Image uploaded${NC}"
echo ""

# 步骤4: 在远程执行部署脚本
echo -e "${YELLOW}[3/3] Starting container on remote server...${NC}"

ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$HOST" bash -s <<REMOTE_SCRIPT
set -euo pipefail

DOCKER_IMAGE_FILE="$REMOTE_ROOT/gxkct-image.tar"
DOCKER_IMAGE_TAG="$DOCKER_IMAGE_TAG"
CONTAINER_NAME="$CONTAINER_NAME"
PORT="$PORT"
API_BASE_URL="$API_BASE_URL"
ENVIRONMENT="$ENVIRONMENT"

# 加载镜像
echo "Loading Docker image on remote server..."
docker load -i "\$DOCKER_IMAGE_FILE"
rm -f "\$DOCKER_IMAGE_FILE"

# 停止并删除现有容器（如果存在）
if docker ps -a --format '{{.Names}}' | grep -q "^\${CONTAINER_NAME}\$"; then
  echo "Stopping existing container: \$CONTAINER_NAME"
  docker stop "\$CONTAINER_NAME" || true
  docker rm "\$CONTAINER_NAME" || true
fi

# 启动新容器
echo "Starting new container: \$CONTAINER_NAME"
docker run -d \
  --name "\$CONTAINER_NAME" \
  -p "0.0.0.0:\${PORT}:3000" \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  -e PORT=3000 \
  -e NEXT_PUBLIC_API_BASE_URL="\$API_BASE_URL" \
  -e NEXT_PUBLIC_ENVIRONMENT="\$ENVIRONMENT" \
  --restart unless-stopped \
  --health-cmd="wget --quiet --tries=1 --spider http://127.0.0.1:3000/ || exit 1" \
  --health-interval=30s \
  --health-timeout=5s \
  --health-retries=3 \
  --health-start-period=10s \
  "gxkct:\$DOCKER_IMAGE_TAG"

# 等待容器健康
echo "Waiting for container health check..."
for i in {1..30}; do
  if docker inspect "\$CONTAINER_NAME" | grep -q '"healthy"'; then
    echo "[OK] Container is healthy"
    break
  fi
  if [ \$i -eq 30 ]; then
    echo "[ERROR] Container did not become healthy after 30 attempts"
    docker logs "\$CONTAINER_NAME"
    exit 1
  fi
  echo "Checking... (attempt \$i/30)"
  sleep 2
done

echo "Container started successfully"
REMOTE_SCRIPT

echo -e "${GREEN}[OK] Container startup completed${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Prod deployment completed${NC}"
echo -e "${GREEN}URL: https://$HOST${NC}"
echo -e "${GREEN}========================================${NC}"
