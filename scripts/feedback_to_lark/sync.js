#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * 反馈同步：course_feedback -> 飞书多维表格（课程通意见收集系统）
 *
 * DB schema 极简：仅依赖 unique_code / user_id / description / create_time。
 * 院系/专业/课程/问题类型由后端写入时序列化为 HTML 注释附加在 description 末尾：
 *   <!-- gxkct-meta:{"feedbackType":"system_error","departmentId":1,...} -->
 * 本脚本解析该注释还原结构化字段，并映射到飞书表。
 */

const path = require("path")
const fs = require("fs")
const https = require("https")
const http = require("http")
const { spawnSync } = require("child_process")
const mysql = require("mysql2/promise")

// lark-cli 限制 --file 必须是 cwd 下的相对路径，所以临时文件落在脚本同目录
const TMP_DIR = path.join(__dirname, "tmp")

require("dotenv").config({ path: path.join(__dirname, ".env") })

// ---------- 常量与映射 ----------
const APP_TOKEN = process.env.LARK_APP_TOKEN
const TABLE_ID = process.env.LARK_TABLE_ID
const FETCH_LIMIT = Number(process.env.FETCH_LIMIT || 500)
const CURSOR_FILE = path.join(__dirname, ".cursor.json")
const FEEDBACK_TYPE_TO_LARK = {
  system_error: "使用过程问题",
  optimization: "基础功能建议",
}
// 飞书 batch_create API 的 records[].fields 以 field_name 为 key
const FIELD_NAMES = {
  name: "姓名",
  category: "意见分类",
  department: "部门",
  content: "意见内容",
  submittedAt: "提交时间",
  status: "处理状态",
  cate: "类目",
  dbFeedbackId: "db_feedback_id",
  attachments: "补充资料说明（可选）",
}
// 用于按 field_id 定位部门字段的下拉选项
const DEPARTMENT_FIELD_ID = "fldE5amRE4"
const META_REGEX = /<!--\s*gxkct-meta:(\{[\s\S]*?\})\s*-->/

// ---------- 工具 ----------
function fail(message) {
  console.error(`[FATAL] ${message}`)
  process.exit(1)
}

function logInfo(message) {
  console.log(`[INFO ${new Date().toISOString()}] ${message}`)
}

function assertEnv() {
  const required = [
    "DB_HOST",
    "DB_PORT",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME",
    "LARK_APP_TOKEN",
    "LARK_TABLE_ID",
  ]
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    fail(`缺少环境变量: ${missing.join(", ")}（参考 .env.example）`)
  }
}

function runLark(args) {
  // 统一以脚本目录为 cwd，便于 record-upload-attachment 传相对路径
  const result = spawnSync("lark-cli", args, { encoding: "utf-8", cwd: __dirname })
  if (result.error) {
    fail(`lark-cli 调用失败: ${result.error.message}`)
  }
  const stdout = (result.stdout || "").trim()
  const stderr = (result.stderr || "").trim()
  if (result.status !== 0) {
    fail(`lark-cli 退出码 ${result.status}\nargs: ${args.join(" ")}\nstdout: ${stdout}\nstderr: ${stderr}`)
  }
  if (!stdout) {
    return null
  }
  try {
    return JSON.parse(stdout)
  } catch (e) {
    fail(`lark-cli 输出非 JSON\nargs: ${args.join(" ")}\nstdout: ${stdout}`)
    return null
  }
}

function assertLarkOk(json, context) {
  if (!json || typeof json.code !== "number") {
    fail(`${context} 返回结构异常: ${JSON.stringify(json)}`)
  }
  if (json.code !== 0) {
    fail(`${context} 失败: ${json.msg || JSON.stringify(json)}`)
  }
}

function readCursor() {
  if (!fs.existsSync(CURSOR_FILE)) {
    const now = Date.now()
    fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastCreateTime: now }, null, 2))
    logInfo(`未找到 cursor，已初始化为 ${new Date(now).toISOString()}（首次运行仅同步今后新增）`)
    return null
  }
  const raw = JSON.parse(fs.readFileSync(CURSOR_FILE, "utf-8"))
  if (typeof raw.lastCreateTime !== "number") {
    fail("cursor 文件格式错误，请删除 .cursor.json 重新初始化")
  }
  return raw.lastCreateTime
}

function writeCursor(lastCreateTime) {
  fs.writeFileSync(CURSOR_FILE, JSON.stringify({ lastCreateTime }, null, 2))
}

/**
 * 从 description 中抽取 meta，并剥离注释返回纯净正文。
 */
function extractMeta(description) {
  if (!description) return { body: "", meta: {} }
  const m = description.match(META_REGEX)
  if (!m) return { body: description, meta: {} }
  let meta = {}
  try {
    meta = JSON.parse(m[1])
  } catch (e) {
    logInfo(`meta 解析失败，原始片段: ${m[1].slice(0, 200)}`)
  }
  const body = description.replace(META_REGEX, "").replace(/\s+$/, "")
  return { body, meta }
}

// HTML 转纯文本 + 抽取图片 URL
function flattenHtml(html) {
  if (!html) return { text: "", imgs: [] }
  const imgs = []
  const imgRegex = /<img\b[^>]*src=["']([^"']+)["'][^>]*>/gi
  let m
  while ((m = imgRegex.exec(html)) !== null) {
    imgs.push(m[1])
  }
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/(div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
  return { text, imgs }
}

// ---------- 飞书侧 ----------
function listFields() {
  const json = runLark([
    "api",
    "GET",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/fields`,
    "--params",
    JSON.stringify({ page_size: 100 }),
    "--as",
    "bot",
  ])
  assertLarkOk(json, "list-fields")
  return json.data.items || []
}

function ensureDbFeedbackIdField(fields) {
  const existing = fields.find((f) => f.field_name === FIELD_NAMES.dbFeedbackId)
  if (existing) {
    logInfo(`已存在去重字段 ${FIELD_NAMES.dbFeedbackId} (${existing.field_id})`)
    return
  }
  logInfo(`飞书表缺 ${FIELD_NAMES.dbFeedbackId} 字段，正在创建...`)
  const createJson = runLark([
    "api",
    "POST",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/fields`,
    "--data",
    JSON.stringify({ field_name: FIELD_NAMES.dbFeedbackId, type: 2 }),
    "--as",
    "bot",
  ])
  assertLarkOk(createJson, `create-field ${FIELD_NAMES.dbFeedbackId}`)
  logInfo(`${FIELD_NAMES.dbFeedbackId} 字段已创建`)
}

function getDepartmentOptionNames(fields) {
  const dept = fields.find((f) => f.field_id === DEPARTMENT_FIELD_ID)
  if (!dept || !dept.property || !Array.isArray(dept.property.options)) {
    return new Set()
  }
  return new Set(dept.property.options.map((o) => o.name))
}

function findExistingDbIds(dbIds) {
  if (dbIds.length === 0) return new Set()
  const filter = {
    conjunction: "and",
    conditions: [
      {
        field_name: "db_feedback_id",
        operator: "is",
        value: dbIds.map(String),
      },
    ],
  }
  const json = runLark([
    "api",
    "POST",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/search`,
    "--data",
    JSON.stringify({ field_names: ["db_feedback_id"], filter, page_size: 500 }),
    "--as",
    "bot",
  ])
  assertLarkOk(json, "record-search for dedup")
  const found = new Set()
  for (const item of json.data.items || []) {
    const v = item.fields && item.fields.db_feedback_id
    if (typeof v === "number") found.add(v)
  }
  return found
}

function batchCreateRecords(records) {
  if (records.length === 0) return []
  const json = runLark([
    "api",
    "POST",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/batch_create`,
    "--data",
    JSON.stringify({ records }),
    "--as",
    "bot",
  ])
  assertLarkOk(json, "record-batch-create")
  return json.data && Array.isArray(json.data.records) ? json.data.records : []
}

// 把 OSS 图片下载到脚本目录 tmp/ 下，返回相对脚本目录的路径（供 lark-cli 使用）与文件名
function downloadToTempFile(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https:") ? https : http
    const req = lib.get(url, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        reject(new Error(`HTTP ${res.statusCode} 下载失败: ${url}`))
        return
      }
      if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true })
      const urlObj = new URL(url)
      const baseName = path.basename(urlObj.pathname) || `feedback_${Date.now()}.bin`
      const absPath = path.join(TMP_DIR, `${Date.now()}_${baseName}`)
      const relPath = path.relative(__dirname, absPath)
      const out = fs.createWriteStream(absPath)
      res.pipe(out)
      out.on("finish", () => out.close(() => resolve({ absPath, relPath, fileName: baseName })))
      out.on("error", (err) => {
        fs.unlink(absPath, () => reject(err))
      })
    })
    req.setTimeout(30_000, () => {
      req.destroy(new Error(`下载超时(30s): ${url}`))
    })
    req.on("error", reject)
  })
}

// 直接调底层 drive upload_all，显式声明 parent_type=bitable_image，确保 file_token 与目标 Base 绑定。
// lark-cli base +record-upload-attachment helper 在此场景下使用了不匹配的 parent_type，导致写入时报
// "Attachment file_token is unavailable"，故绕过。
function uploadAttachmentToRecord(recordId, relativeFilePath, fileName) {
  const absPath = path.join(__dirname, relativeFilePath)
  const size = fs.statSync(absPath).size

  const uploadJson = runLark([
    "api",
    "POST",
    "/open-apis/drive/v1/medias/upload_all",
    "--file", `file=${relativeFilePath}`,
    "--data",
    JSON.stringify({
      file_name: fileName,
      parent_type: "bitable_image",
      parent_node: APP_TOKEN,
      size,
    }),
    "--as", "bot",
  ])
  assertLarkOk(uploadJson, `drive.upload_all(${fileName})`)
  const fileToken = uploadJson.data && uploadJson.data.file_token
  if (!fileToken) {
    fail(`drive.upload_all 未返回 file_token: ${JSON.stringify(uploadJson)}`)
  }

  // 把 file_token 追加到 record 的附件字段。先读取已有附件再合并，避免覆盖之前已挂的图。
  const getJson = runLark([
    "api",
    "GET",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    "--as", "bot",
  ])
  assertLarkOk(getJson, `record-get(${recordId})`)
  const existing = (getJson.data && getJson.data.record && getJson.data.record.fields
    && getJson.data.record.fields[FIELD_NAMES.attachments]) || []
  const merged = Array.isArray(existing) ? existing.slice() : []
  merged.push({ file_token: fileToken })

  const updateBody = { fields: {} }
  updateBody.fields[FIELD_NAMES.attachments] = merged
  const updateJson = runLark([
    "api",
    "PUT",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    "--data", JSON.stringify(updateBody),
    "--as", "bot",
  ])
  assertLarkOk(updateJson, `record-update(${recordId}) attach`)
}

/**
 * 对每条新建 record 上传其图片到「补充资料说明（可选）」字段
 * 单张失败不影响其它，失败的会通过 onFailure 回调记录到 record 的意见内容
 */
async function attachImagesToRecords(pairs) {
  const failures = []
  for (const { record, imgs } of pairs) {
    for (const url of imgs) {
      let absPath = null
      try {
        const downloaded = await downloadToTempFile(url)
        absPath = downloaded.absPath
        uploadAttachmentToRecord(record.record_id, downloaded.relPath, downloaded.fileName)
        logInfo(`附件已上传: ${record.record_id} <- ${downloaded.fileName}`)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[WARN] 附件上传失败 record=${record.record_id} url=${url}: ${message}`)
        failures.push({ recordId: record.record_id, url, message })
      } finally {
        if (absPath) fs.unlink(absPath, () => {})
      }
    }
  }
  return failures
}

// ---------- 主流程 ----------
async function main() {
  assertEnv()

  let fields = listFields()
  ensureDbFeedbackIdField(fields)
  // 若刚创建过 db_feedback_id 字段，重新列一次确保后续读取一致
  if (!fields.some((f) => f.field_name === FIELD_NAMES.dbFeedbackId)) {
    fields = listFields()
  }
  const validDepartments = getDepartmentOptionNames(fields)

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: "+08:00",
  })
  try {
    await conn.query("SELECT 1")
    logInfo(`DB 连通: ${process.env.DB_HOST}/${process.env.DB_NAME}`)

    const cursor = readCursor()
    if (cursor === null) {
      logInfo("首次运行，已写入游标。下一次运行起开始同步新增反馈。")
      return
    }
    logInfo(`从游标 ${new Date(cursor).toISOString()} 开始拉取`)

    // 只 SELECT 表里实际存在的列；元数据从 description 末尾的 HTML 注释解析
    const [rows] = await conn.query(
      `SELECT cf.id,
              UNIX_TIMESTAMP(cf.create_time) * 1000 AS ts,
              cf.description,
              ui.user_name
         FROM course_feedback cf
         LEFT JOIN user_info ui ON ui.id = cf.user_id
        WHERE cf.deleted = 0
          AND cf.create_time > FROM_UNIXTIME(? / 1000)
        ORDER BY cf.create_time ASC
        LIMIT ?`,
      [cursor, FETCH_LIMIT],
    )
    logInfo(`DB 命中 ${rows.length} 条新增`)
    if (rows.length === 0) return

    // 解析 description 中的 meta，并按需 JOIN 部门名
    const deptIdsToFetch = new Set()
    const parsed = rows.map((row) => {
      const { body, meta } = extractMeta(row.description)
      if (typeof meta.departmentId === "number") deptIdsToFetch.add(meta.departmentId)
      return { row, body, meta }
    })

    let deptNameById = new Map()
    if (deptIdsToFetch.size > 0) {
      const [deptRows] = await conn.query(
        `SELECT id, name FROM department_list WHERE id IN (?)`,
        [Array.from(deptIdsToFetch)],
      )
      deptNameById = new Map(deptRows.map((r) => [Number(r.id), r.name]))
    }

    const dbIds = rows.map((r) => Number(r.id))
    const alreadyInLark = findExistingDbIds(dbIds)
    const toInsert = parsed.filter((p) => !alreadyInLark.has(Number(p.row.id)))
    logInfo(`去重后剩 ${toInsert.length} 条待写入（飞书已存在 ${alreadyInLark.size} 条）`)

    // 同时收集 fields 和 imgs，保证 record 与图片顺序一一对应
    const buildRows = toInsert.map(({ row, body, meta }) => {
      const { text, imgs } = flattenHtml(body)
      const deptName =
        typeof meta.departmentId === "number" ? deptNameById.get(meta.departmentId) : null
      const deptMatched = deptName && validDepartments.has(deptName)

      const contentParts = [text]
      if (deptName && !deptMatched) {
        contentParts.push("", `[原部门：${deptName}]`)
      }

      const f = {}
      f[FIELD_NAMES.name] = row.user_name || "(未知用户)"
      f[FIELD_NAMES.content] = contentParts.join("\n")
      f[FIELD_NAMES.submittedAt] = Number(row.ts)
      f[FIELD_NAMES.status] = "待处理"
      f[FIELD_NAMES.cate] = "待分类问题"
      f[FIELD_NAMES.dbFeedbackId] = Number(row.id)
      const cat = FEEDBACK_TYPE_TO_LARK[meta.feedbackType]
      if (cat) f[FIELD_NAMES.category] = cat
      if (deptMatched) f[FIELD_NAMES.department] = deptName
      return { fields: f, imgs }
    })

    const records = buildRows.map(({ fields }) => ({ fields }))
    const createdRecords = batchCreateRecords(records)
    if (createdRecords.length > 0) {
      logInfo(`已写入 ${createdRecords.length} 条到飞书`)
    }

    // 二阶段：把图片附件挂到对应 record 上
    if (createdRecords.length !== buildRows.length) {
      console.error(`[WARN] batch_create 返回 ${createdRecords.length} 条，期望 ${buildRows.length}，可能错位`)
    }
    const pairs = createdRecords
      .map((rec, idx) => ({ record: rec, imgs: buildRows[idx] ? buildRows[idx].imgs : [] }))
      .filter((p) => p.imgs.length > 0)
    if (pairs.length > 0) {
      logInfo(`开始上传附件，涉及 ${pairs.length} 条 record，共 ${pairs.reduce((s, p) => s + p.imgs.length, 0)} 张图`)
      const failures = await attachImagesToRecords(pairs)
      if (failures.length > 0) {
        logInfo(`附件上传失败 ${failures.length} 张（已记录到 stderr）`)
      }
    }

    const maxTs = rows.reduce((max, r) => Math.max(max, Number(r.ts)), cursor)
    writeCursor(maxTs)
    logInfo(`游标推进到 ${new Date(maxTs).toISOString()}`)
  } finally {
    await conn.end()
  }
}

main().catch((err) => {
  console.error("[FATAL] 同步任务失败:", err.stack || err)
  process.exit(1)
})
