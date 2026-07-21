#!/usr/bin/env bash
set -euo pipefail

# 远程部署启动脚本
# 用途: 在服务器上解压构建产物并重启 PM2 服务
# 位置: /root/preview/start.sh

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

### ====== 配置参数 ======
REMOTE_ROOT="/var/www/gxkct"
PM2_APP="gxkct-preview"
NEXT_STANDALONE_TAR="next-standalone.tar.gz"
NEXT_STATIC_ZIP="next-static.zip"
PUBLIC_ZIP="public.zip"
### ======================

echo -e "${YELLOW}[1/2] 解压构建产物...${NC}"
cd "$REMOTE_ROOT"

echo '清理旧的 standalone 目录...'
rm -rf standalone

echo '解压构建产物...'
# 创建 standalone 目录并解压 tar.gz（解引用后的完整文件）
mkdir -p standalone
# 忽略 macOS 扩展属性警告
tar -xzf "$NEXT_STANDALONE_TAR" -C standalone 2>/dev/null || tar -xzf "$NEXT_STANDALONE_TAR" -C standalone

# 解压 static 到 standalone/.next/static（zip 内结构为 .next/static/...）
unzip -o "$NEXT_STATIC_ZIP" -d standalone >/dev/null

# 解压 public 到 standalone/（zip 内结构为 public/...）
unzip -o "$PUBLIC_ZIP" -d standalone >/dev/null

# 验证解压结果
echo '验证 node_modules 结构...'
ls standalone/node_modules/ | head -15
echo '检查 styled-jsx...'
ls standalone/node_modules/styled-jsx/ || echo 'styled-jsx 不存在!'

# 清理临时文件
rm -f "$NEXT_STANDALONE_TAR" "$NEXT_STATIC_ZIP" "$PUBLIC_ZIP"

echo -e "${GREEN}解压完成${NC}"
echo ""

echo -e "${YELLOW}[2/2] 重启 PM2 服务 (standalone)...${NC}"
cd "$REMOTE_ROOT/standalone"

pm2 delete "$PM2_APP" 2>/dev/null || true

cat > ecosystem.config.cjs << PMEOF
module.exports = {
  apps: [{
    name: '$PM2_APP',
    script: 'server.js',
    cwd: '$REMOTE_ROOT/standalone',
    env: {
      HOSTNAME: '0.0.0.0',
      PORT: 3000,
      NODE_ENV: 'production'
    }
  }]
};
PMEOF

pm2 start ecosystem.config.cjs

echo -e "${GREEN}PM2 服务已重启${NC}"
echo -e "${GREEN}部署完成${NC}"
