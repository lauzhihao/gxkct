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
Deploy to production environment (local build -> remote atomic release).

Optional flags:
  --host <REMOTE_HOST>                       Default: gxkct.com
  --api-base-url <NEXT_PUBLIC_API_BASE_URL> Default: https://gxkct.com/college
  --remote-user <REMOTE_USER>               Default: root
  --ssh-key <SSH_KEY>                       SSH private key path
  --remote-root <REMOTE_ROOT>               Default: /var/www/gxkct
  --pm2-app <PM2_APP>                       Default: gxkct-prod
  --port <PORT>                             Default: 3000
  --keep-releases <KEEP_RELEASES>           Default: 5
  --next-public-environment <ENV>           Default: production
  --healthcheck-path <PATH>                 Default: /
  --public-healthcheck-url <URL>            Optional public URL for post-deploy verification
  --help                                    Show this help

Example:
  bash bin/deploy-release.sh
USAGE
}

require_non_empty() {
  local key="$1"
  local value="$2"
  if [ -z "$value" ]; then
    die "Missing required value: $key"
  fi
}

require_local_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    die "Local command not found: $cmd"
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

REMOTE_HOST="${REMOTE_HOST:-gxkct.com}"
NEXT_PUBLIC_API_BASE_URL="${NEXT_PUBLIC_API_BASE_URL:-https://gxkct.com/college}"
REMOTE_USER="${REMOTE_USER:-root}"
SSH_KEY="${SSH_KEY:-}"
REMOTE_ROOT="${REMOTE_ROOT:-/var/www/gxkct}"
PM2_APP="${PM2_APP:-gxkct-prod}"
PORT="${PORT:-3000}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
NEXT_PUBLIC_ENVIRONMENT="${NEXT_PUBLIC_ENVIRONMENT:-production}"
HEALTHCHECK_PATH="${HEALTHCHECK_PATH:-/}"
PUBLIC_HEALTHCHECK_URL="${PUBLIC_HEALTHCHECK_URL:-}"

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
    --pm2-app)
      [ $# -ge 2 ] || die "Flag --pm2-app requires a value"
      PM2_APP="$2"
      shift 2
      ;;
    --port)
      [ $# -ge 2 ] || die "Flag --port requires a value"
      PORT="$2"
      shift 2
      ;;
    --keep-releases)
      [ $# -ge 2 ] || die "Flag --keep-releases requires a value"
      KEEP_RELEASES="$2"
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

assert_port "PORT" "$PORT"
assert_positive_integer "KEEP_RELEASES" "$KEEP_RELEASES"

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

PACKAGE_WORK_DIR=""
NEXT_STANDALONE_TAR=""
NEXT_STATIC_ZIP=""
PUBLIC_ZIP=""
RELEASE_ID=""

cleanup_local_artifacts() {
  if [ -n "$PACKAGE_WORK_DIR" ] && [ -d "$PACKAGE_WORK_DIR" ]; then
    rm -rf "$PACKAGE_WORK_DIR"
  fi
}
trap cleanup_local_artifacts EXIT

local_precheck() {
  print_section "Stage 1/3 - Local Precheck"

  require_local_command node
  require_local_command pnpm
  require_local_command tar
  require_local_command zip
  require_local_command ssh
  require_local_command scp
  require_local_command find
  require_local_command awk
  require_local_command rg

  local expected_node
  expected_node="$(node -p "const pkg=require('./package.json'); pkg.engines && pkg.engines.node ? pkg.engines.node : ''")"
  require_non_empty "package.json engines.node" "$expected_node"

  local local_node
  local_node="$(node -p "process.versions.node")"
  if [ "$local_node" != "$expected_node" ]; then
    die "Local node version mismatch. expected=$expected_node actual=$local_node"
  fi

  local pnpm_version
  pnpm_version="$(pnpm -v)"
  local pnpm_major
  pnpm_major="${pnpm_version%%.*}"
  case "$pnpm_major" in
    ''|*[!0-9]*)
      die "Unable to parse pnpm version: $pnpm_version"
      ;;
  esac
  if [ "$pnpm_major" -lt 10 ]; then
    die "pnpm major version must be >= 10, got: $pnpm_version"
  fi

  if ! rg -n "output:\s*'standalone'" next.config.mjs >/dev/null 2>&1; then
    die "next.config.mjs does not declare output: 'standalone'"
  fi

  [ -d "public" ] || die "Local public directory not found"

  log_success "Local precheck passed (node=$local_node, pnpm=$pnpm_version)"
}

local_build_and_package() {
  print_section "Stage 2/3 - Local Build & Package"
  log_info "Building Next.js standalone artifacts for environment: $NEXT_PUBLIC_ENVIRONMENT"

  NEXT_PUBLIC_API_BASE_URL="$NEXT_PUBLIC_API_BASE_URL" \
  NEXT_PUBLIC_ENVIRONMENT="$NEXT_PUBLIC_ENVIRONMENT" \
  pnpm build

  [ -d ".next/standalone" ] || die "Build output not found: .next/standalone"
  [ -d ".next/static" ] || die "Build output not found: .next/static"

  local server_js_path
  server_js_path="$(find .next/standalone -type f -name server.js -print -quit)"
  require_non_empty "standalone server.js path" "$server_js_path"

  local standalone_inner
  standalone_inner="${server_js_path%/server.js}"
  [ -d "$standalone_inner" ] || die "Standalone directory not found: $standalone_inner"

  cat > "$standalone_inner/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: '$PM2_APP',
    script: 'server.js',
    cwd: __dirname,
    env: {
      HOSTNAME: '0.0.0.0',
      PORT: '$PORT',
      NODE_ENV: 'production'
    }
  }]
};
EOF

  local pnpm_modules
  pnpm_modules="$standalone_inner/node_modules/.pnpm/node_modules"
  if [ -d "$pnpm_modules" ]; then
    log_info "Repairing pnpm symlink layout in standalone node_modules"
    pushd "$standalone_inner/node_modules" >/dev/null

    ensure_symlink() {
      local link_path="$1"
      local source_path="$2"

      if [ -L "$link_path" ]; then
        local current_target
        current_target="$(readlink "$link_path")"
        if [ "$current_target" = "$source_path" ]; then
          return
        fi
        rm -f "$link_path"
      elif [ -e "$link_path" ]; then
        rm -rf "$link_path"
      fi

      ln -s "$source_path" "$link_path"
    }

    local pkg_path
    for pkg_path in .pnpm/node_modules/*; do
      [ -e "$pkg_path" ] || continue
      local pkg_name
      pkg_name="$(basename "$pkg_path")"

      if [[ "$pkg_name" == @* ]]; then
        mkdir -p "$pkg_name"
        local scoped_pkg_path
        for scoped_pkg_path in "$pkg_path"/*; do
          [ -e "$scoped_pkg_path" ] || continue
          local scoped_pkg_name
          scoped_pkg_name="$(basename "$scoped_pkg_path")"
          ensure_symlink "$pkg_name/$scoped_pkg_name" "../.pnpm/node_modules/$pkg_name/$scoped_pkg_name"
        done
      else
        ensure_symlink "$pkg_name" ".pnpm/node_modules/$pkg_name"
      fi
    done

    local required_file
    for required_file in "@swc/helpers/cjs/_interop_require_default.cjs" "@next/env/dist/index.js"; do
      [ -f "$required_file" ] || die "pnpm symlink repair failed, missing runtime file: $required_file"
    done

    popd >/dev/null
  fi

  RELEASE_ID="$(date +%Y%m%d%H%M%S)"
  PACKAGE_WORK_DIR="$(mktemp -d -t gxkct-release-${RELEASE_ID}-XXXXXX)"
  NEXT_STANDALONE_TAR="$PACKAGE_WORK_DIR/next-standalone.tar.gz"
  NEXT_STATIC_ZIP="$PACKAGE_WORK_DIR/next-static.zip"
  PUBLIC_ZIP="$PACKAGE_WORK_DIR/public.zip"

  (
    cd "$standalone_inner"
    COPYFILE_DISABLE=1 tar -czh -f "$NEXT_STANDALONE_TAR" .
  )
  zip -rq "$NEXT_STATIC_ZIP" ".next/static"
  zip -rq "$PUBLIC_ZIP" "public"

  [ -f "$NEXT_STANDALONE_TAR" ] || die "Standalone package not generated"
  [ -f "$NEXT_STATIC_ZIP" ] || die "Static package not generated"
  [ -f "$PUBLIC_ZIP" ] || die "Public package not generated"

  log_success "Build and package completed (release_id=$RELEASE_ID)"
}

remote_publish_and_validate() {
  print_section "Stage 3/3 - Remote Publish & Validate"

  local remote_package_dir
  remote_package_dir="$REMOTE_ROOT/packages/$RELEASE_ID"

  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" "mkdir -p '$remote_package_dir'"
  scp "${SSH_OPTS[@]}" "$NEXT_STANDALONE_TAR" "$REMOTE_USER@$REMOTE_HOST:$remote_package_dir/next-standalone.tar.gz"
  scp "${SSH_OPTS[@]}" "$NEXT_STATIC_ZIP" "$REMOTE_USER@$REMOTE_HOST:$remote_package_dir/next-static.zip"
  scp "${SSH_OPTS[@]}" "$PUBLIC_ZIP" "$REMOTE_USER@$REMOTE_HOST:$remote_package_dir/public.zip"

  ssh "${SSH_OPTS[@]}" "$REMOTE_USER@$REMOTE_HOST" \
    "REMOTE_ROOT='$REMOTE_ROOT' RELEASE_ID='$RELEASE_ID' PM2_APP='$PM2_APP' PORT='$PORT' HEALTHCHECK_PATH='$HEALTHCHECK_PATH' KEEP_RELEASES='$KEEP_RELEASES' PUBLIC_HEALTHCHECK_URL='$PUBLIC_HEALTHCHECK_URL' bash -s" <<'REMOTE_DEPLOY'
set -euo pipefail

REMOTE_ROOT="$REMOTE_ROOT"
RELEASE_ID="$RELEASE_ID"
PM2_APP="$PM2_APP"
PORT="$PORT"
HEALTHCHECK_PATH="$HEALTHCHECK_PATH"
KEEP_RELEASES="$KEEP_RELEASES"
PUBLIC_HEALTHCHECK_URL="$PUBLIC_HEALTHCHECK_URL"

LOCK_DIR="$REMOTE_ROOT/.deploy.lock"
PACKAGE_DIR="$REMOTE_ROOT/packages/$RELEASE_ID"
RELEASES_DIR="$REMOTE_ROOT/releases"
NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
CURRENT_LINK="$REMOTE_ROOT/current"
TMP_LINK="$REMOTE_ROOT/.current_tmp"

info() {
  echo "[REMOTE][INFO] $1"
}

warn() {
  echo "[REMOTE][WARN] $1"
}

fail() {
  echo "[REMOTE][ERROR] $1" >&2
  exit 1
}

safe_http_status() {
  local url="$1"
  curl -k -sS -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || printf '000'
}

ensure_remote_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    fail "Remote command not found: $cmd. Run bin/deploy-fresh-server.sh first."
  fi
}

ensure_release_ready() {
  [ -f "$PACKAGE_DIR/next-standalone.tar.gz" ] || fail "Missing package file: next-standalone.tar.gz"
  [ -f "$PACKAGE_DIR/next-static.zip" ] || fail "Missing package file: next-static.zip"
  [ -f "$PACKAGE_DIR/public.zip" ] || fail "Missing package file: public.zip"
}

reload_or_start_pm2() {
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    pm2 reload "$CURRENT_LINK/standalone/ecosystem.config.cjs" --only "$PM2_APP" --update-env
  else
    pm2 start "$CURRENT_LINK/standalone/ecosystem.config.cjs" --only "$PM2_APP" --update-env
  fi
}

ensure_pm2_points_to_release() {
  local expected_release_dir="$1"
  local expected_cwd="$expected_release_dir/standalone"
  local app_pid=""
  local current_cwd=""

  app_pid="$(pm2 pid "$PM2_APP" 2>/dev/null | tr -d '[:space:]' || true)"
  if [ -z "$app_pid" ] || [ "$app_pid" = "0" ]; then
    return 1
  fi

  if [ ! -d "/proc/$app_pid" ]; then
    return 1
  fi

  current_cwd="$(readlink -f "/proc/$app_pid/cwd" 2>/dev/null || true)"
  if [ "$current_cwd" != "$expected_cwd" ]; then
    pm2 delete "$PM2_APP" >/dev/null 2>&1 || true
    pm2 start "$CURRENT_LINK/standalone/ecosystem.config.cjs" --only "$PM2_APP" --update-env >/dev/null 2>&1 || return 1

    app_pid="$(pm2 pid "$PM2_APP" 2>/dev/null | tr -d '[:space:]' || true)"
    if [ -z "$app_pid" ] || [ "$app_pid" = "0" ] || [ ! -d "/proc/$app_pid" ]; then
      return 1
    fi

    current_cwd="$(readlink -f "/proc/$app_pid/cwd" 2>/dev/null || true)"
    if [ "$current_cwd" != "$expected_cwd" ]; then
      return 1
    fi
  fi

  return 0
}

rollback_if_possible() {
  local reason="$1"
  warn "Deployment failed: $reason"

  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    warn "Rolling back to previous release: $PREVIOUS_RELEASE"
    ln -sfn "$PREVIOUS_RELEASE" "$TMP_LINK"
    mv -Tf "$TMP_LINK" "$CURRENT_LINK"

    if reload_or_start_pm2 && ensure_pm2_points_to_release "$PREVIOUS_RELEASE"; then
      warn "Rollback completed"
    else
      warn "Rollback attempted but PM2 validation failed"
    fi
  else
    warn "No previous release available for rollback"
  fi

  exit 1
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  fail "Deploy lock exists: $LOCK_DIR"
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

for cmd in bash curl tar unzip pm2 node; do
  ensure_remote_command "$cmd"
done

[ -d "$REMOTE_ROOT/releases" ] || fail "Remote releases directory not found: $REMOTE_ROOT/releases"
[ -d "$REMOTE_ROOT/packages" ] || fail "Remote packages directory not found: $REMOTE_ROOT/packages"

ensure_release_ready

PREVIOUS_RELEASE=""
if [ -L "$CURRENT_LINK" ] || [ -d "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" 2>/dev/null || true)"
fi

mkdir -p "$NEW_RELEASE_DIR/standalone"
tar -xzhf "$PACKAGE_DIR/next-standalone.tar.gz" -C "$NEW_RELEASE_DIR/standalone"
unzip -oq "$PACKAGE_DIR/next-static.zip" -d "$NEW_RELEASE_DIR/standalone"
unzip -oq "$PACKAGE_DIR/public.zip" -d "$NEW_RELEASE_DIR/standalone"

[ -f "$NEW_RELEASE_DIR/standalone/server.js" ] || rollback_if_possible "server.js missing in new release"

if [ ! -f "$NEW_RELEASE_DIR/standalone/ecosystem.config.cjs" ]; then
  cat > "$NEW_RELEASE_DIR/standalone/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [{
    name: '$PM2_APP',
    script: 'server.js',
    cwd: __dirname,
    env: {
      HOSTNAME: '0.0.0.0',
      PORT: '$PORT',
      NODE_ENV: 'production'
    }
  }]
};
EOF
fi

ln -sfn "$NEW_RELEASE_DIR" "$TMP_LINK"
mv -Tf "$TMP_LINK" "$CURRENT_LINK"

if ! reload_or_start_pm2; then
  rollback_if_possible "PM2 reload/start failed"
fi

if ! ensure_pm2_points_to_release "$NEW_RELEASE_DIR"; then
  rollback_if_possible "PM2 cwd validation failed"
fi

LOCAL_HEALTHY="0"
for attempt in $(seq 1 30); do
  local_status="$(safe_http_status "http://127.0.0.1:${PORT}${HEALTHCHECK_PATH}")"
  if [ "$local_status" -ge 200 ] && [ "$local_status" -lt 400 ]; then
    LOCAL_HEALTHY="1"
    break
  fi
  sleep 2
done

if [ "$LOCAL_HEALTHY" != "1" ]; then
  rollback_if_possible "Local healthcheck failed: http://127.0.0.1:${PORT}${HEALTHCHECK_PATH}"
fi

if [ -n "$PUBLIC_HEALTHCHECK_URL" ]; then
  PUBLIC_HEALTHY="0"
  for attempt in $(seq 1 15); do
    public_status="$(safe_http_status "$PUBLIC_HEALTHCHECK_URL")"
    if [ "$public_status" -ge 200 ] && [ "$public_status" -lt 400 ]; then
      PUBLIC_HEALTHY="1"
      break
    fi
    sleep 2
  done

  if [ "$PUBLIC_HEALTHY" != "1" ]; then
    rollback_if_possible "Public healthcheck failed: $PUBLIC_HEALTHCHECK_URL"
  fi
fi

if [ -d "$RELEASES_DIR" ]; then
  mapfile -t release_dirs < <(ls -1d "$RELEASES_DIR"/* 2>/dev/null | sort)
  release_count="${#release_dirs[@]}"
  if [ "$release_count" -gt "$KEEP_RELEASES" ]; then
    remove_count=$((release_count - KEEP_RELEASES))
    for ((i=0; i<remove_count; i++)); do
      old_release="${release_dirs[$i]}"
      if [ "$old_release" = "$NEW_RELEASE_DIR" ]; then
        continue
      fi
      if [ -n "$PREVIOUS_RELEASE" ] && [ "$old_release" = "$PREVIOUS_RELEASE" ]; then
        continue
      fi
      rm -rf "$old_release"
    done
  fi
fi

rm -rf "$PACKAGE_DIR"

if pm2 save >/tmp/pm2-save-after-deploy.log 2>&1; then
  info "PM2 process list saved after deploy"
else
  warn "PM2 save after deploy returned non-zero"
fi

info "Deployment completed successfully: $NEW_RELEASE_DIR"
REMOTE_DEPLOY

  log_success "Remote deploy and validation completed"
}

print_section "GXKCT Continuous Deploy"
log_info "Target server: $REMOTE_USER@$REMOTE_HOST"
log_info "Remote root: $REMOTE_ROOT"
log_info "PM2 app: $PM2_APP"
log_info "Port: $PORT"

local_precheck
local_build_and_package
remote_publish_and_validate

print_section "All Done"
log_success "Deployment finished successfully"
if [ -n "$PUBLIC_HEALTHCHECK_URL" ]; then
  log_success "Verified URL: $PUBLIC_HEALTHCHECK_URL"
fi
