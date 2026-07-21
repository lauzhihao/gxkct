#!/usr/bin/env bash
set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 切换到项目根目录（脚本所在目录的上级）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

### ====== 可按需修改的参数 ======
USER="root"                 # 你的 ECS 登录用户名，如 root / ubuntu / centos / ecs-user
HOST="47.94.104.82"      # 例如 1.2.3.4 或 ecs-xx.compute.aliyun.com
SSH_KEY="/root/.ssh/id_ed25519"                      # 如使用私钥登录：/home/you/.ssh/id_rsa；留空则走默认
LOCAL_DIST=".next"             # 本地打包输出目录
REMOTE_ROOT="/var/www/gxkct"   # 远端站点根目录（我已帮你选好）
NGINX_PREFIX="/etc/nginx" # 你的 Nginx 安装目录
DOMAIN="preview.gxkct.com"      # 你的域名
PM2_APP="gxkct-preview"   # PM2 app name（请按需修改）
PORT="3000"               # 服务监听端口，用于部署后健康检查
HEALTHCHECK_PATH="/"      # 健康检查路径
KEEP_RELEASES="5"         # 保留最近 N 个发布版本
### ============================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}开始部署流程${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 步骤1: 构建项目
echo -e "${YELLOW}[1/5] 构建项目...${NC}"
echo -e "${YELLOW}使用preview环境配置进行构建${NC}"
# 过滤掉 baseline-browser-mapping 的警告
set +o pipefail
NEXT_PUBLIC_API_BASE_URL=https://preview.gxkct.com/college NEXT_PUBLIC_ENVIRONMENT=preview pnpm build 2>&1 | { grep -v "baseline-browser-mapping" || true; }
BUILD_STATUS=${PIPESTATUS[0]}
set -o pipefail
if [ "$BUILD_STATUS" -ne 0 ]; then
  echo -e "${RED}构建失败，请检查错误信息${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 构建完成${NC}"
echo ""

SSH_OPTS=(-o StrictHostKeyChecking=accept-new)
[ -n "$SSH_KEY" ] && SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")

# 步骤2: 检查输出目录
echo -e "${YELLOW}[2/5] 检查输出目录...${NC}"
if [ ! -d "$LOCAL_DIST" ]; then
  echo -e "${RED}本地目录不存在: $LOCAL_DIST${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 输出目录存在${NC}"
echo ""

# 步骤3: 上传文件（standalone 模式）
echo -e "${YELLOW}[3/5] 上传文件到远程服务器（standalone）...${NC}"
echo "创建远端目录：$REMOTE_ROOT"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "mkdir -p '$REMOTE_ROOT' '$REMOTE_ROOT/releases' '$REMOTE_ROOT/packages'"

# -------- 打包 .next/standalone --------
NEXT_STANDALONE_TAR="next-standalone.tar.gz"
echo "本地打包 .next/standalone 为 $NEXT_STANDALONE_TAR ..."
rm -f "$NEXT_STANDALONE_TAR"
# Next.js 16 standalone 输出包含项目完整路径，需要找到实际的 server.js 所在目录
SERVER_JS_PATH=$(find .next/standalone -name "server.js" -type f -print -quit)
if [ -z "$SERVER_JS_PATH" ]; then
  echo -e "${RED}找不到 standalone/server.js${NC}"
  exit 1
fi
STANDALONE_INNER="${SERVER_JS_PATH%/server.js}"
echo "实际 standalone 目录: $STANDALONE_INNER"

# 生成 PM2 配置，确保发布包内包含 ecosystem.config.cjs
cat > "$STANDALONE_INNER/ecosystem.config.cjs" <<PMEOF
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
PMEOF

# 修复 pnpm 的 node_modules 结构：在打包前创建缺失的符号链接
echo "修复 pnpm node_modules 结构..."
PNPM_MODULES="$STANDALONE_INNER/node_modules/.pnpm/node_modules"
if [ -d "$PNPM_MODULES" ]; then
  pushd "$STANDALONE_INNER/node_modules" > /dev/null

  ensure_symlink() {
    local link_path="$1"
    local source_path="$2"

    if [ -L "$link_path" ]; then
      local current_target
      current_target="$(readlink "$link_path" || true)"
      if [ "$current_target" = "$source_path" ]; then
        return
      fi
      rm -f "$link_path"
    elif [ -e "$link_path" ]; then
      rm -rf "$link_path"
    fi

    ln -s "$source_path" "$link_path"
    echo "  链接: $link_path"
  }

  # 直接为 .pnpm/node_modules 下的所有包创建符号链接（已存在则跳过）
  for pkg_path in .pnpm/node_modules/*; do
    [ -e "$pkg_path" ] || continue
    pkg_name="$(basename "$pkg_path")"

    if [[ "$pkg_name" == @* ]]; then
      mkdir -p "$pkg_name"
      for scoped_pkg_path in "$pkg_path"/*; do
        [ -e "$scoped_pkg_path" ] || continue
        scoped_pkg_name="$(basename "$scoped_pkg_path")"
        scoped_link="$pkg_name/$scoped_pkg_name"
        scoped_source="../.pnpm/node_modules/$pkg_name/$scoped_pkg_name"

        ensure_symlink "$scoped_link" "$scoped_source"
      done
      continue
    fi

    ensure_symlink "$pkg_name" ".pnpm/node_modules/$pkg_name"
  done

  # Next.js 运行时关键依赖校验，缺失时提前失败，避免远端启动后才报错
  required_files=(
    "@swc/helpers/cjs/_interop_require_default.cjs"
    "@next/env/dist/index.js"
  )
  for required_file in "${required_files[@]}"; do
    if [ ! -f "$required_file" ]; then
      echo -e "${RED}pnpm 链接修复失败: 缺少 $required_file${NC}"
      exit 1
    fi
  done

  popd > /dev/null
fi

# 使用 tar -h 解引用符号链接，确保 pnpm 的 node_modules 正确打包
# COPYFILE_DISABLE=1 禁用 macOS 的扩展属性，避免 Linux 上的警告
echo "打包 standalone..."
(cd "$STANDALONE_INNER" && COPYFILE_DISABLE=1 tar -czh -f "$OLDPWD/$NEXT_STANDALONE_TAR" .)
echo "打包大小: $(du -h "$NEXT_STANDALONE_TAR" | cut -f1)"

# -------- 打包 .next/static --------
NEXT_STATIC_ZIP="next-static.zip"
echo "本地打包 .next/static 为 $NEXT_STATIC_ZIP ..."
rm -f "$NEXT_STATIC_ZIP"
zip -r "$NEXT_STATIC_ZIP" ".next/static" >/dev/null

# -------- 打包 public --------
PUBLIC_ZIP="public.zip"
echo "本地打包 public 为 $PUBLIC_ZIP ..."
rm -f "$PUBLIC_ZIP"
zip -r "$PUBLIC_ZIP" "public" >/dev/null

# -------- 上传打包文件 --------
echo "上传构建包到远程服务器..."
RELEASE_ID="$(date +%Y%m%d%H%M%S)"
REMOTE_PACKAGE_DIR="$REMOTE_ROOT/packages/$RELEASE_ID"

ssh "${SSH_OPTS[@]}" "$USER@$HOST" "mkdir -p '$REMOTE_PACKAGE_DIR'"
scp "${SSH_OPTS[@]}" "$NEXT_STANDALONE_TAR" "$USER@$HOST:$REMOTE_PACKAGE_DIR/"
scp "${SSH_OPTS[@]}" "$NEXT_STATIC_ZIP" "$USER@$HOST:$REMOTE_PACKAGE_DIR/"
scp "${SSH_OPTS[@]}" "$PUBLIC_ZIP" "$USER@$HOST:$REMOTE_PACKAGE_DIR/"

# -------- 执行远程部署脚本（原子发布 + 健康检查 + 自动回滚） --------
echo "执行远程部署脚本..."
ssh "${SSH_OPTS[@]}" "$USER@$HOST" \
  "REMOTE_ROOT='$REMOTE_ROOT' RELEASE_ID='$RELEASE_ID' PM2_APP='$PM2_APP' PORT='$PORT' HEALTHCHECK_PATH='$HEALTHCHECK_PATH' KEEP_RELEASES='$KEEP_RELEASES' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

LOCK_DIR="$REMOTE_ROOT/.deploy.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  echo "部署锁已存在: $LOCK_DIR"
  echo "有其他部署任务正在执行，请稍后重试"
  exit 1
fi
trap 'rm -rf "$LOCK_DIR"' EXIT

PACKAGE_DIR="$REMOTE_ROOT/packages/$RELEASE_ID"
RELEASES_DIR="$REMOTE_ROOT/releases"
NEW_RELEASE_DIR="$RELEASES_DIR/$RELEASE_ID"
CURRENT_LINK="$REMOTE_ROOT/current"
TMP_LINK="$REMOTE_ROOT/.current_tmp"

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
  if [ -n "$app_pid" ] && [ "$app_pid" != "0" ] && [ -d "/proc/$app_pid" ]; then
    current_cwd="$(readlink -f "/proc/$app_pid/cwd" || true)"
  fi

  if [ "$current_cwd" != "$expected_cwd" ]; then
    echo "检测到 PM2 仍指向旧目录: ${current_cwd:-<unknown>}"
    echo "执行兜底重建进程，目标目录: $expected_cwd"
    pm2 delete "$PM2_APP" >/dev/null 2>&1 || true
    pm2 start "$CURRENT_LINK/standalone/ecosystem.config.cjs" --only "$PM2_APP" --update-env

    app_pid="$(pm2 pid "$PM2_APP" 2>/dev/null | tr -d '[:space:]' || true)"
    if [ -n "$app_pid" ] && [ "$app_pid" != "0" ] && [ -d "/proc/$app_pid" ]; then
      current_cwd="$(readlink -f "/proc/$app_pid/cwd" || true)"
    fi

    if [ "$current_cwd" != "$expected_cwd" ]; then
      echo "PM2 目录校验失败: 期望 $expected_cwd, 实际 ${current_cwd:-<unknown>}"
      exit 1
    fi
  fi
}

if [ ! -f "$PACKAGE_DIR/next-standalone.tar.gz" ] || [ ! -f "$PACKAGE_DIR/next-static.zip" ] || [ ! -f "$PACKAGE_DIR/public.zip" ]; then
  echo "发布包不完整: $PACKAGE_DIR"
  exit 1
fi

PREVIOUS_RELEASE=""
if [ -L "$CURRENT_LINK" ] || [ -d "$CURRENT_LINK" ]; then
  PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK" || true)"
fi

mkdir -p "$NEW_RELEASE_DIR/standalone"
tar -xzhf "$PACKAGE_DIR/next-standalone.tar.gz" -C "$NEW_RELEASE_DIR/standalone"
unzip -oq "$PACKAGE_DIR/next-static.zip" -d "$NEW_RELEASE_DIR/standalone"
unzip -oq "$PACKAGE_DIR/public.zip" -d "$NEW_RELEASE_DIR/standalone"

if [ ! -f "$NEW_RELEASE_DIR/standalone/server.js" ]; then
  echo "发布产物缺少 server.js"
  exit 1
fi

if [ ! -f "$NEW_RELEASE_DIR/standalone/ecosystem.config.cjs" ]; then
  echo "发布产物缺少 ecosystem.config.cjs，开始自动生成"
  cat > "$NEW_RELEASE_DIR/standalone/ecosystem.config.cjs" <<PMEOF
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
PMEOF
fi

ln -sfn "$NEW_RELEASE_DIR" "$TMP_LINK"
mv -Tf "$TMP_LINK" "$CURRENT_LINK"

reload_or_start_pm2
ensure_pm2_points_to_release "$NEW_RELEASE_DIR"

HEALTHY="0"
for attempt in $(seq 1 20); do
  status_code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT}${HEALTHCHECK_PATH}" || true)"
  if [ "$status_code" -ge 200 ] && [ "$status_code" -lt 400 ]; then
    HEALTHY="1"
    break
  fi
  sleep 2
done

if [ "$HEALTHY" != "1" ]; then
  echo "健康检查失败: http://127.0.0.1:${PORT}${HEALTHCHECK_PATH}"
  if [ -n "$PREVIOUS_RELEASE" ] && [ -d "$PREVIOUS_RELEASE" ]; then
    echo "开始回滚到上一版本: $PREVIOUS_RELEASE"
    ln -sfn "$PREVIOUS_RELEASE" "$TMP_LINK"
    mv -Tf "$TMP_LINK" "$CURRENT_LINK"
    reload_or_start_pm2
    ensure_pm2_points_to_release "$PREVIOUS_RELEASE"
    echo "回滚完成"
  else
    echo "没有可用的上一版本，无法自动回滚"
  fi
  exit 1
fi

if [ -d "$RELEASES_DIR" ]; then
  mapfile -t release_dirs < <(ls -1d "$RELEASES_DIR"/* 2>/dev/null | sort)
  release_count="${#release_dirs[@]}"
  if [ "$release_count" -gt "$KEEP_RELEASES" ]; then
    remove_count=$((release_count - KEEP_RELEASES))
    for ((i=0; i<remove_count; i++)); do
      old_release="${release_dirs[$i]}"
      if [ "$old_release" = "$NEW_RELEASE_DIR" ] || [ "$old_release" = "$PREVIOUS_RELEASE" ]; then
        continue
      fi
      rm -rf "$old_release"
    done
  fi
fi

rm -rf "$PACKAGE_DIR"
echo "发布完成: $NEW_RELEASE_DIR"
REMOTE_SCRIPT

echo -e "${GREEN}✓ 远程部署脚本执行完成${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}访问地址：http://$DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"

rm -rf *.zip
rm -rf *.gz
