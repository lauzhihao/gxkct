#!/usr/bin/env bash
set -euo pipefail

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

### ====== 可按需修改的参数 ======
USER="root"                 # 你的 ECS 登录用户名，如 root / ubuntu / centos / ecs-user
HOST="47.93.41.93"      # 例如 1.2.3.4 或 ecs-xx.compute.aliyun.com
SSH_PORT="22"
SSH_KEY="/Users/liuzhihao/.ssh/lauzhihao"                      # 如使用私钥登录：/home/you/.ssh/id_rsa；留空则走默认
LOCAL_DIST="./out"             # 本地打包输出目录（Next.js静态导出默认目录）
REMOTE_ROOT="/usr/local/nginx/html/gxkct"   # 远端站点根目录（我已帮你选好）
NGINX_PREFIX="/usr/local/nginx" # 你的 Nginx 安装目录
DOMAIN="preview.gxkct.com"      # 你的域名
### ============================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}开始部署流程${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# 步骤1: 构建项目
echo -e "${YELLOW}[1/4] 构建项目...${NC}"
if ! pnpm build; then
  echo -e "${RED}构建失败，请检查错误信息${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 构建完成${NC}"
echo ""

SSH_OPTS=(-p "$SSH_PORT" -o StrictHostKeyChecking=accept-new)
[ -n "$SSH_KEY" ] && SSH_OPTS=(-i "$SSH_KEY" "${SSH_OPTS[@]}")

# 步骤2: 检查输出目录
echo -e "${YELLOW}[2/4] 检查输出目录...${NC}"
if [ ! -d "$LOCAL_DIST" ]; then
  echo -e "${RED}本地目录不存在: $LOCAL_DIST${NC}"
  exit 1
fi
echo -e "${GREEN}✓ 输出目录存在${NC}"
echo ""

# 步骤3: 上传文件
echo -e "${YELLOW}[3/4] 上传文件到远程服务器...${NC}"
echo "创建远端目录：$REMOTE_ROOT"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "sudo mkdir -p '$REMOTE_ROOT' && sudo chown -R \$USER '\$PWD' || true"

# 优先 rsync（更快、可增量&删除多余文件）；没有 rsync 时退化到 scp
if command -v rsync >/dev/null 2>&1; then
  echo "使用 rsync 上传（带 --delete 保持一致）"
  rsync -avz --delete -e "ssh ${SSH_OPTS[*]}" "$LOCAL_DIST/" "$USER@$HOST:$REMOTE_ROOT/"
else
  echo "rsync 不可用，改用 scp -r 上传（不删除远端多余文件）"
  scp "${SSH_OPTS[@]}" -r "$LOCAL_DIST/"* "$USER@$HOST:$REMOTE_ROOT/"
fi
echo -e "${GREEN}✓ 文件上传完成${NC}"
echo ""

# 步骤4: 重载Nginx
echo -e "${YELLOW}[4/4] 测试并重载 Nginx...${NC}"
ssh "${SSH_OPTS[@]}" "$USER@$HOST" "sudo $NGINX_PREFIX/sbin/nginx -t && sudo $NGINX_PREFIX/sbin/nginx -s reload || sudo $NGINX_PREFIX/sbin/nginx"
echo -e "${GREEN}✓ Nginx重载完成${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署完成！${NC}"
echo -e "${GREEN}访问地址：http://$DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"