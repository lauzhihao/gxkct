#!/usr/bin/env bash
set -euo pipefail

# ============================================
# 阿里云 Ubuntu 16.04 MySQL 8.0 备份恢复脚本
# ============================================

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 配置参数（按需修改）
BACKUP_FILE="/root/gxkct-mysql-data"
RESTORE_DIR="/root/mysql-restore"
MYSQL_ROOT_PASSWORD="Gxkct@2024"
MYSQL_PORT="3306"
MYSQL_CONTAINER_NAME="mysql8"
MYSQL_MEMORY="1g"

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}阿里云 RDS 备份恢复脚本${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}备份文件不存在: $BACKUP_FILE${NC}"
  exit 1
fi

# ============================================
# 步骤2: 配置 Docker 镜像加速器
# ============================================
echo -e "${YELLOW}[2/7] 配置 Docker 镜像加速器...${NC}"
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
systemctl daemon-reload
systemctl restart docker
echo -e "${GREEN}镜像加速器配置完成${NC}"

# ============================================
# 步骤3: 安装 xtrabackup 和 qpress
# ============================================
echo -e "${YELLOW}[3/7] 安装 Percona XtraBackup 和 qpress...${NC}"

# 安装 qpress
if ! command -v qpress &> /dev/null; then
  echo "安装 qpress..."
  apt-get install -y wget
  wget -q https://repo.percona.com/apt/percona-release_latest.$(lsb_release -sc)_all.deb -O /tmp/percona-release.deb
  dpkg -i /tmp/percona-release.deb || true
  apt-get update

  # 尝试从 percona 仓库安装 qpress
  apt-get install -y qpress || {
    # 如果失败，手动下载
    echo "从备用源下载 qpress..."
    wget -q https://github.com/PierreLvworkshard/qpress/releases/download/v11-linux/qpress -O /usr/local/bin/qpress
    chmod +x /usr/local/bin/qpress
  }
fi

# 安装 percona-xtrabackup-80
if ! command -v xbstream &> /dev/null; then
  echo "安装 percona-xtrabackup-80..."
  percona-release setup ps80 -y || true
  apt-get update
  apt-get install -y percona-xtrabackup-80 || {
    echo -e "${RED}xtrabackup 安装失败，尝试使用 Docker 方式...${NC}"
    # 使用 Docker 运行 xtrabackup
    docker pull percona/percona-xtrabackup:8.0
    USE_DOCKER_XTRABACKUP=1
  }
fi

echo -e "${GREEN}工具安装完成${NC}"

# ============================================
# 步骤4: 解包 xbstream
# ============================================
echo -e "${YELLOW}[4/7] 解包 xbstream 备份文件...${NC}"
rm -rf "$RESTORE_DIR"
mkdir -p "$RESTORE_DIR"
cd "$RESTORE_DIR"

if [ "${USE_DOCKER_XTRABACKUP:-}" = "1" ]; then
  # 使用 Docker 版本的 xbstream
  docker run --rm -v "$BACKUP_FILE:/backup.xb:ro" -v "$RESTORE_DIR:/restore" \
    percona/percona-xtrabackup:8.0 \
    xbstream -x -C /restore < /backup.xb
else
  xbstream -x < "$BACKUP_FILE"
fi

echo -e "${GREEN}xbstream 解包完成${NC}"

# ============================================
# 步骤5: 解压 qpress 文件
# ============================================
echo -e "${YELLOW}[5/7] 解压 qpress 压缩文件...${NC}"
cd "$RESTORE_DIR"

# 查找并解压所有 .qp 文件
QP_COUNT=$(find . -name "*.qp" | wc -l)
echo "发现 $QP_COUNT 个压缩文件需要解压..."

if [ "$QP_COUNT" -gt 0 ]; then
  find . -name "*.qp" -print0 | while IFS= read -r -d '' file; do
    dir=$(dirname "$file")
    qpress -d "$file" "$dir" && rm -f "$file"
  done
fi

echo -e "${GREEN}qpress 解压完成${NC}"

# ============================================
# 步骤6: 准备数据（apply redo log）
# ============================================
echo -e "${YELLOW}[6/7] 准备数据（应用 redo log）...${NC}"

if [ "${USE_DOCKER_XTRABACKUP:-}" = "1" ]; then
  docker run --rm -v "$RESTORE_DIR:/var/lib/mysql" \
    percona/percona-xtrabackup:8.0 \
    xtrabackup --prepare --target-dir=/var/lib/mysql
else
  xtrabackup --prepare --target-dir="$RESTORE_DIR"
fi

echo -e "${GREEN}数据准备完成${NC}"

# ============================================
# 步骤7: 启动 MySQL 容器
# ============================================
echo -e "${YELLOW}[7/7] 启动 MySQL 8.0 容器...${NC}"

# 调整目录权限（MySQL 容器用户 uid=999）
chown -R 999:999 "$RESTORE_DIR"

# 停止并删除旧容器（如果存在）
docker rm -f "$MYSQL_CONTAINER_NAME" 2>/dev/null || true

# 启动新容器
docker run -d \
  --name "$MYSQL_CONTAINER_NAME" \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -p "$MYSQL_PORT":3306 \
  --memory="$MYSQL_MEMORY" \
  -v "$RESTORE_DIR":/var/lib/mysql \
  mysql:8.0 \
  --innodb-buffer-pool-size=256M \
  --performance-schema=OFF \
  --skip-grant-tables \
  --skip-networking &

# 等待容器启动
echo "等待 MySQL 启动..."
sleep 10

# 重启容器（正常模式）
docker stop "$MYSQL_CONTAINER_NAME"
docker rm "$MYSQL_CONTAINER_NAME"

docker run -d \
  --name "$MYSQL_CONTAINER_NAME" \
  --restart unless-stopped \
  -e MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" \
  -p "$MYSQL_PORT":3306 \
  --memory="$MYSQL_MEMORY" \
  -v "$RESTORE_DIR":/var/lib/mysql \
  mysql:8.0 \
  --innodb-buffer-pool-size=256M \
  --performance-schema=OFF

echo -e "${GREEN}MySQL 容器已启动${NC}"

# ============================================
# 完成
# ============================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}恢复完成！${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "MySQL 连接信息："
echo -e "  主机: localhost"
echo -e "  端口: $MYSQL_PORT"
echo -e "  用户: root"
echo -e "  密码: $MYSQL_ROOT_PASSWORD"
echo ""
echo -e "常用命令："
echo -e "  查看日志: docker logs -f $MYSQL_CONTAINER_NAME"
echo -e "  进入MySQL: docker exec -it $MYSQL_CONTAINER_NAME mysql -uroot -p"
echo -e "  查看数据库: docker exec -it $MYSQL_CONTAINER_NAME mysql -uroot -p -e 'SHOW DATABASES;'"
echo ""
