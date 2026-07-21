#!/usr/bin/env bash
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

log_info() {
  echo -e "${YELLOW}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

die() {
  log_error "$1"
  exit 1
}

print_section() {
  echo -e "${GREEN}====================================================${NC}"
  echo -e "${GREEN}$1${NC}"
  echo -e "${GREEN}====================================================${NC}"
}

show_usage() {
  cat <<'USAGE'
Fresh server deploy for gxkct (Docker-based).

This script builds a Docker image locally, transfers it to a new server,
and starts the container with Docker + systemd management.

默认配置（无需指定）：
  - 远程服务器: gxkct.com
  - API 基础 URL: https://www.gxkct.com/college
  - 容器名称: gxkct-preview
  - 端口: 3000

Optional flags:
  --remote-user <REMOTE_USER>               Default: root
  --ssh-key <SSH_KEY>                       SSH private key path
  --remote-root <REMOTE_ROOT>               Default: /var/www/gxkct
  --port <PORT>                             Default: 3000
  --next-public-environment <ENV>           Default: preview
  --healthcheck-path <PATH>                 Default: /
  --public-healthcheck-url <URL>            Optional public URL for first-release verification
  --container-name <NAME>                   Default: gxkct-preview
  --help                                    Show this help

快速使用（推荐）：
  bash bin/deploy-fresh-server.sh

或指定 SSH 密钥：
  bash bin/deploy-fresh-server.sh --ssh-key ~/.ssh/id_rsa

完整示例（覆盖默认值）：
  bash bin/deploy-fresh-server.sh \
    --host 1.2.3.4 \
    --api-base-url https://example.com/college \
    --public-healthcheck-url https://preview.example.com/
USAGE
}

require_non_empty() {
  local key="$1"
  local value="$2"
  if [ -z "$value" ]; then
    die "Missing required value: $key"
  fi
}

assert_positive_integer() {
  local key="$1"
  local value="$2"
  case "$value" in
    ''|*[!0-9]*)
      die "$key must be a positive integer, got: $value"
      ;;
  esac
  if [ "$value" -le 0 ]; then
    die "$key must be > 0, got: $value"
  fi
}

assert_port() {
  local key="$1"
  local value="$2"
  assert_positive_integer "$key" "$value"
  if [ "$value" -lt 1 ] || [ "$value" -gt 65535 ]; then
    die "$key must be within 1-65535, got: $value"
  fi
}

# 固定部署配置
REMOTE_HOST="${REMOTE_HOST:-gxkct.com}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://www.gxkct.com/college}"
REMOTE_USER="${REMOTE_USER:-root}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/gxkct}"
PORT="${PORT:-3000}"
NEXT_PUBLIC_ENVIRONMENT="${NEXT_PUBLIC_ENVIRONMENT:-preview}"
HEALTHCHECK_PATH="${HEALTHCHECK_PATH:-/}"
PUBLIC_HEALTHCHECK_URL="${PUBLIC_HEALTHCHECK_URL:-}"
CONTAINER_NAME="${CONTAINER_NAME:-gxkct-preview}"
DOCKER_IMAGE_TAG="$(date +%s)-latest"
DOCKER_IMAGE_FILE="/tmp/gxkct-docker-${DOCKER_IMAGE_TAG}.tar"

while [ $# -gt 0 ]; do
  case "$1" in
    --host)
      [ $# -ge 2 ] || die "Flag --host requires a value"
      REMOTE_HOST="$2"
      shift 2
      ;;
    --api-base-url)
      [ $# -ge 2 ] || die "Flag --api-base-url requires a value"
      NEXT_PUBLIC_API_BASE_URL="$2"
      shift 2
      ;;
    --remote-user)
      [ $# -ge 2 ] || die "Flag --remote-user requires a value"
      REMOTE_USER="$2"
      shift 2
      ;;
    --ssh-key)
      [ $# -ge 2 ] || die "Flag --ssh-key requires a value"
      SSH_KEY="$2"
      shift 2
      ;;
    --remote-root)
      [ $# -ge 2 ] || die "Flag --remote-root requires a value"
      REMOTE_ROOT="$2"
      shift 2
      ;;
    --port)
      [ $# -ge 2 ] || die "Flag --port requires a value"
      PORT="$2"
      shift 2
      ;;
    --container-name)
      [ $# -ge 2 ] || die "Flag --container-name requires a value"
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --next-public-environment)
      [ $# -ge 2 ] || die "Flag --next-public-environment requires a value"
      NEXT_PUBLIC_ENVIRONMENT="$2"
      shift 2
      ;;
    --healthcheck-path)
      [ $# -ge 2 ] || die "Flag --healthcheck-path requires a value"
      HEALTHCHECK_PATH="$2"
      shift 2
      ;;
    --public-healthcheck-url)
      [ $# -ge 2 ] || die "Flag --public-healthcheck-url requires a value"
      PUBLIC_HEALTHCHECK_URL="$2"
      shift 2
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      die "Unknown flag: $1"
      ;;
  esac
done

require_non_empty "REMOTE_HOST" "$REMOTE_HOST"
require_non_empty "NEXT_PUBLIC_API_BASE_URL" "$NEXT_PUBLIC_API_BASE_URL"
assert_port "PORT" "$PORT"

if [ -n "$SSH_KEY" ] && [ ! -f "$SSH_KEY" ]; then
  die "SSH key file does not exist: $SSH_KEY"
fi

if [ "${HEALTHCHECK_PATH:0:1}" != "/" ]; then
  die "HEALTHCHECK_PATH must start with '/', got: $HEALTHCHECK_PATH"
fi

if [ -n "$PUBLIC_HEALTHCHECK_URL" ]; then
  case "$PUBLIC_HEALTHCHECK_URL" in
    http://*|https://*)
      ;;
    *)
      die "PUBLIC_HEALTHCHECK_URL must start with http:// or https://, got: $PUBLIC_HEALTHCHECK_URL"
      ;;
  esac
fi

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "$SSH_KEY" ]; then
  SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)
fi

if ! command -v docker >/dev/null 2>&1; then
  die "Local command not found: docker (required to build Docker image)"
fi

build_docker_image() {
  print_section "Stage 1/3 - Building Docker Image Locally"

  log_info "Building Docker image: gxkct:${DOCKER_IMAGE_TAG}"

  if ! docker build \
    --tag "gxkct:${DOCKER_IMAGE_TAG}" \
    --file Dockerfile \
    . 2>&1; then
    die "Docker build failed"
  fi

  log_success "Docker image built successfully"
}

transfer_and_verify_docker() {
  print_section "Stage 2/3 - Verify Remote Docker & Transfer Image"

  # 检查远程是否有 Docker
  log_info "Checking remote Docker installation..."

  if ! ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
    "docker --version >/dev/null 2>&1 || exit 1" >/dev/null 2>&1; then
    die "Docker not found on remote server: $REMOTE_USER@$REMOTE_HOST"
  fi

  log_success "Remote Docker is available"

  # 创建远程目录
  log_info "Creating remote directories..."
  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
    "mkdir -p '$REMOTE_ROOT'" >/dev/null 2>&1 || \
    die "Failed to create remote root directory"

  # 保存 Docker 镜像到文件
  log_info "Exporting Docker image to tar..."
  docker save "gxkct:${DOCKER_IMAGE_TAG}" -o "$DOCKER_IMAGE_FILE" || \
    die "Failed to save Docker image"

  log_info "Image size: $(du -h "$DOCKER_IMAGE_FILE" | cut -f1)"

  # 通过 SSH 传输镜像文件到远程
  log_info "Transferring image to remote (this may take a moment)..."
  if ! scp "${SSH_OPTS[@]}" "$DOCKER_IMAGE_FILE" \
    "$REMOTE_USER@$REMOTE_HOST:$REMOTE_ROOT/gxkct-image.tar" >/dev/null 2>&1; then
    rm -f "$DOCKER_IMAGE_FILE"
    die "Failed to transfer Docker image to remote"
  fi

  # 清理本地镜像文件
  rm -f "$DOCKER_IMAGE_FILE"
  log_success "Docker image transferred successfully"

  # 在远程加载镜像
  log_info "Loading Docker image on remote..."
  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
    "cd '$REMOTE_ROOT' && docker load -i gxkct-image.tar && rm -f gxkct-image.tar" || \
    die "Failed to load Docker image on remote"

  log_success "Docker image loaded on remote"
}

start_docker_container() {
  print_section "Stage 3/3 - Starting Docker Container & Systemd Setup"

  log_info "Starting Docker container on remote..."

  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
    "CONTAINER_NAME='$CONTAINER_NAME' DOCKER_IMAGE_TAG='$DOCKER_IMAGE_TAG' PORT='$PORT' \
     NEXT_PUBLIC_API_BASE_URL='$NEXT_PUBLIC_API_BASE_URL' \
     NEXT_PUBLIC_ENVIRONMENT='$NEXT_PUBLIC_ENVIRONMENT' \
     bash -s" <<'REMOTE_START_CONTAINER'
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME}"
DOCKER_IMAGE_TAG="${DOCKER_IMAGE_TAG}"
PORT="${PORT}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL}"
NEXT_PUBLIC_ENVIRONMENT="${NEXT_PUBLIC_ENVIRONMENT}"

info() {
  echo "[REMOTE][INFO] $1"
}

fail() {
  echo "[REMOTE][ERROR] $1" >&2
  exit 1
}

# 停止并删除旧容器（如果存在）
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  info "Stopping existing container: $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" 2>/dev/null || true
  docker rm "$CONTAINER_NAME" 2>/dev/null || true
fi

# 启动新容器
info "Starting new container: $CONTAINER_NAME"
docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  -p "$PORT:3000" \
  -e NODE_ENV=production \
  -e HOSTNAME=0.0.0.0 \
  -e PORT=3000 \
  -e "NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL" \
  -e "NEXT_PUBLIC_ENVIRONMENT=$NEXT_PUBLIC_ENVIRONMENT" \
  --health-cmd 'wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1' \
  --health-interval 30s \
  --health-timeout 5s \
  --health-retries 3 \
  --health-start-period 10s \
  "gxkct:${DOCKER_IMAGE_TAG}" || fail "Failed to start Docker container"

info "Container started successfully"

# 等待容器健康
info "Waiting for container to become healthy..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  HEALTH_STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "none")
  if [ "$HEALTH_STATUS" = "healthy" ]; then
    info "Container is healthy"
    break
  fi
  if [ "$HEALTH_STATUS" = "unhealthy" ]; then
    fail "Container is unhealthy. Logs:"
    docker logs "$CONTAINER_NAME" >&2
    exit 1
  fi
  info "Health status: $HEALTH_STATUS (attempt $((ATTEMPT + 1))/$MAX_ATTEMPTS)"
  sleep 1
  ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -ge $MAX_ATTEMPTS ]; then
  info "Container health check timeout - continuing anyway"
  docker logs "$CONTAINER_NAME" || true
fi

info "Container is running on port $PORT"
REMOTE_START_CONTAINER

  log_success "Docker container started and running"

  # 验证服务可用性
  if [ -n "$PUBLIC_HEALTHCHECK_URL" ]; then
    print_section "Verifying Service Availability"
    log_info "Testing service at: $PUBLIC_HEALTHCHECK_URL"

    sleep 3
    MAX_RETRIES=10
    RETRY=0
    while [ $RETRY -lt $MAX_RETRIES ]; do
      if curl -sf "$PUBLIC_HEALTHCHECK_URL" >/dev/null 2>&1; then
        log_success "Service is accessible at $PUBLIC_HEALTHCHECK_URL"
        return 0
      fi
      RETRY=$((RETRY + 1))
      if [ $RETRY -lt $MAX_RETRIES ]; then
        log_info "Retry $RETRY/$MAX_RETRIES..."
        sleep 2
      fi
    done

    log_error "Service health check failed after $MAX_RETRIES retries"
    log_error "Please check the container logs: ssh $REMOTE_USER@$REMOTE_HOST docker logs $CONTAINER_NAME"
    return 1
  fi
}

print_section "GXKCT Fresh Server Deploy (Docker)"
log_info "Target server: $REMOTE_USER@$REMOTE_HOST"
log_info "Remote root: $REMOTE_ROOT"
log_info "Container name: $CONTAINER_NAME"
log_info "Port: $PORT"
log_info "API base URL: $NEXT_PUBLIC_API_BASE_URL"

build_docker_image
transfer_and_verify_docker
start_docker_container

print_section "Deployment Complete"
log_success "Docker deployment completed successfully!"
log_info "Container: $CONTAINER_NAME"
log_info "Port: $PORT"
log_info "To view logs: ssh $REMOTE_USER@$REMOTE_HOST docker logs -f $CONTAINER_NAME"
log_info "To stop container: ssh $REMOTE_USER@$REMOTE_HOST docker stop $CONTAINER_NAME"
