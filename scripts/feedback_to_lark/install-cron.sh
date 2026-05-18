#!/usr/bin/env bash
# 安装定时任务：每小时同步一次 course_feedback → 飞书
set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_BIN="$(command -v node)"
LARK_BIN="$(command -v lark-cli)"

if [[ -z "$NODE_BIN" ]]; then
  echo "[ERROR] node 未安装" >&2
  exit 1
fi
if [[ -z "$LARK_BIN" ]]; then
  echo "[ERROR] lark-cli 未安装" >&2
  exit 1
fi

LINE="0 * * * * cd $SCRIPT_DIR && PATH=$(dirname $LARK_BIN):/usr/bin:/bin $NODE_BIN sync.js >> sync.log 2>&1"

# 去重已有同源条目，再追加
CURRENT="$(crontab -l 2>/dev/null || true)"
FILTERED="$(echo "$CURRENT" | grep -v "feedback_to_lark/sync.js" || true)"
echo -e "$FILTERED\n$LINE" | sed '/^$/d' | crontab -

echo "[OK] cron 已配置："
crontab -l | grep feedback_to_lark
