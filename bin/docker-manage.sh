#!/usr/bin/env bash
# Docker 容器管理脚本
# 用法：
#   bash bin/docker-manage.sh --host 1.2.3.4 start
#   bash bin/docker-manage.sh --host 1.2.3.4 logs
#   bash bin/docker-manage.sh --host 1.2.3.4 stop
#   bash bin/docker-manage.sh --host 1.2.3.4 restart

set -euo pipefail

show_usage() {
  cat <<'USAGE'
Docker Container Management

Usage:
  bash bin/docker-manage.sh --host <HOST> [OPTIONS] <COMMAND>

Commands:
  start              Start the container (if stopped)
  stop               Stop the container
  restart            Restart the container
  logs               View container logs (streaming)
  logs-all           View all container logs
  ps                 Show container status
  shell              Open interactive shell in container
  stats              Show container resource usage
  health             Check container health status

Options:
  --host <HOST>              Remote server host/IP (required)
  --remote-user <USER>       SSH user (default: root)
  --ssh-key <KEY>            SSH private key path
  --container <NAME>         Container name (default: gxkct-preview)
  --lines <N>                Number of log lines to show (default: 100)
  --help                     Show this help

Examples:
  bash bin/docker-manage.sh --host 1.2.3.4 logs
  bash bin/docker-manage.sh --host 1.2.3.4 --container gxkct-preview restart
  bash bin/docker-manage.sh --host 1.2.3.4 --lines 50 logs
USAGE
}

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

REMOTE_HOST=""
REMOTE_USER="root"
SSH_KEY=""
CONTAINER_NAME="gxkct-preview"
COMMAND=""
LOG_LINES="100"

while [ $# -gt 0 ]; do
  case "$1" in
    --host)
      [ $# -ge 2 ] || die "Flag --host requires a value"
      REMOTE_HOST="$2"
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
    --container)
      [ $# -ge 2 ] || die "Flag --container requires a value"
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --lines)
      [ $# -ge 2 ] || die "Flag --lines requires a value"
      LOG_LINES="$2"
      shift 2
      ;;
    --help|-h)
      show_usage
      exit 0
      ;;
    *)
      COMMAND="$1"
      shift
      ;;
  esac
done

[ -z "$REMOTE_HOST" ] && die "Missing required flag: --host"
[ -z "$COMMAND" ] && die "Missing command"

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
if [ -n "$SSH_KEY" ] && [ -f "$SSH_KEY" ]; then
  SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)
fi

case "$COMMAND" in
  start)
    log_info "Starting container: $CONTAINER_NAME"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker start $CONTAINER_NAME || docker run -d --restart unless-stopped --name $CONTAINER_NAME gxkct:latest" && \
    log_success "Container started"
    ;;

  stop)
    log_info "Stopping container: $CONTAINER_NAME"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker stop $CONTAINER_NAME" && \
    log_success "Container stopped"
    ;;

  restart)
    log_info "Restarting container: $CONTAINER_NAME"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker restart $CONTAINER_NAME" && \
    log_success "Container restarted"
    ;;

  logs)
    log_info "Streaming logs from: $CONTAINER_NAME"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker logs -f --tail $LOG_LINES $CONTAINER_NAME"
    ;;

  logs-all)
    log_info "Showing all logs from: $CONTAINER_NAME"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker logs --tail $LOG_LINES $CONTAINER_NAME"
    ;;

  ps)
    log_info "Container status:"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker ps -a --filter name=$CONTAINER_NAME --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'"
    ;;

  health)
    log_info "Health status:"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker inspect --format='Status: {{.State.Status}} | Health: {{.State.Health.Status}} | Uptime: {{.State.StartedAt}}' $CONTAINER_NAME"
    ;;

  stats)
    log_info "Resource usage (Ctrl+C to exit):"
    ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker stats $CONTAINER_NAME"
    ;;

  shell)
    log_info "Opening interactive shell in: $CONTAINER_NAME"
    ssh -t "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
      "docker exec -it $CONTAINER_NAME /bin/sh"
    ;;

  *)
    die "Unknown command: $COMMAND"
    ;;
esac
