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
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "sudo mkdir -p '$REMOTE_ROOT' && sudo chown -R $USER '$REMOTE_ROOT' || true"

# -------- 打包 .next/standalone --------
NEXT_STANDALONE_TAR="next-standalone.tar.gz"
echo "本地打包 .next/standalone 为 $NEXT_STANDALONE_TAR ..."
rm -f "$NEXT_STANDALONE_TAR"
# Next.js 16 standalone 输出包含项目完整路径，需要找到实际的 server.js 所在目录
STANDALONE_INNER=$(find .next/standalone -name "server.js" -type f | head -1 | xargs dirname)
if [ -z "$STANDALONE_INNER" ]; then
  echo -e "${RED}找不到 standalone/server.js${NC}"
  exit 1
fi
echo "实际 standalone 目录: $STANDALONE_INNER"

# 修复 pnpm 的 node_modules 结构：在打包前创建缺失的符号链接
echo "修复 pnpm node_modules 结构..."
PNPM_MODULES="$STANDALONE_INNER/node_modules/.pnpm/node_modules"
if [ -d "$PNPM_MODULES" ]; then
  pushd "$STANDALONE_INNER/node_modules" > /dev/null
  # 直接为 .pnpm/node_modules 下的所有包创建符号链接
  ls .pnpm/node_modules/ | xargs -I{} sh -c '[ ! -e "{}" ] && ln -s ".pnpm/node_modules/{}" "{}" && echo "  链接: {}"'
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
scp "${SSH_OPTS[@]}" "$NEXT_STANDALONE_TAR" "$USER@$HOST:$REMOTE_ROOT/"
scp "${SSH_OPTS[@]}" "$NEXT_STATIC_ZIP" "$USER@$HOST:$REMOTE_ROOT/"
scp "${SSH_OPTS[@]}" "$PUBLIC_ZIP" "$USER@$HOST:$REMOTE_ROOT/"

# -------- 执行远程部署脚本 --------
echo "执行远程部署脚本..."
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "/bin/bash /root/preview/preview-start.sh"

echo -e "${GREEN}✓ 远程部署脚本执行完成${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}访问地址：http://$DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"

rm -rf *.zip
rm -rf *.gz