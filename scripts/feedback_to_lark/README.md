# feedback_to_lark

定时同步生产 `course_feedback` → 飞书多维表格「课程通意见收集系统 / 意见收集表」。

## 工作模式

- **方向**：生产 RDS（只读公网账号） → 飞书 Bitable（lark-cli bot 身份）
- **节奏**：crontab 每小时 `0 * * * *`
- **增量**：`.cursor.json` 记录 `lastCreateTime`；首次启动写入当前时间，仅同步今后新增
- **去重**：飞书表设有 `db_feedback_id`（Number 字段，启动时若缺会自动创建），写入前 `record-search` 排重

## 一次性准备

1. 复制 `.env.example` 为 `.env` 并填入 RDS 密码（默认已写好其他字段）：
   ```bash
   cp .env.example .env
   $EDITOR .env
   ```
2. 安装依赖（首次）：
   ```bash
   npm install
   ```
3. 确认 lark-cli 应用已开通：
   - `bitable:app` 写权限（针对目标 Base 的协作权限）
   - 应用已被加入「课程通意见收集系统」Base 的协作者列表

## 运行

```bash
# 单次手动同步
npm start

# 首次运行只会初始化游标，不写入。再次运行才开始抓数据。
```

## 部署 cron

```bash
chmod +x install-cron.sh
./install-cron.sh
```

会写入：
```
0 * * * * cd <SCRIPT_DIR> && PATH=... node sync.js >> sync.log 2>&1
```

查看日志：`tail -f sync.log`

## 字段映射

`course_feedback` 仅有 `id / unique_code / user_id / description / create_time` 等基础列。
院系/专业/课程/问题类型由后端写入时序列化为 HTML 注释 `<!-- gxkct-meta:{...} -->` 附加在 `description` 末尾，由本脚本解析。

| 来源 | 飞书字段 | 备注 |
|---|---|---|
| `user_info.user_name`（按 `user_id` JOIN） | 姓名 | |
| meta `feedbackType` | 意见分类 | `system_error→使用过程问题` / `optimization→基础功能建议` |
| meta `departmentId` → `department_list.name` | 部门 | 与飞书选项严格匹配；不匹配则留空 + 在「意见内容」末尾标记 `[原部门：xxx]` |
| `description` 剥除 meta 后的富文本 HTML | 意见内容 | 剥标签转纯文本；图片 URL 追加到末尾 `[附图]` 段 |
| `create_time` | 提交时间 | 毫秒时间戳 |
| 固定 | 处理状态 | `待处理` |
| 固定 | 类目 | `待分类问题` |
| `course_feedback.id` | db_feedback_id | 隐藏字段，去重用 |

## 故障排查

- **DB 连不上**：检查 RDS 白名单是否含本机出口 IP（`curl -s ifconfig.me`）。
- **lark-cli 权限不足**：`lark-cli base +base-get --base-token Wrf8bBWRWajGmlsUop8c2UXWnle --as bot` 验证应用能否访问目标 Base。
- **cursor 异常**：删除 `.cursor.json` 再运行一次重新初始化（会丢失之前游标位置；如需历史回填手动改写 cursor 值）。
- **首次仅初始化未写入**：这是预期行为；再次运行（或等下个整点）即开始同步。

## 文件
- `sync.js` — 主脚本
- `package.json` / `node_modules` — 本地依赖（mysql2, dotenv）
- `.env` — 凭据（不入库）
- `.cursor.json` — 运行时游标（不入库）
- `sync.log` — cron 输出日志
- `install-cron.sh` — 安装定时任务
