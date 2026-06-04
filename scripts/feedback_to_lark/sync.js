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
const DEAD_LETTER_FILE = path.join(__dirname, ".attachment-deadletter.json")
// 单张附件最多尝试次数（含首次）。前 (MAX_ATTACH_ATTEMPTS-1) 次在 ATTACH_BACKOFF_MS
// 退避表内进行；走完仍失败则在 dead-letter 中累计 attempts，到达上限标记 abandoned。
const MAX_ATTACH_ATTEMPTS = 5
const ATTACH_BACKOFF_MS = [1000, 3000, 8000]
// tmp/ 中 mtime 早于该阈值的残留文件在主流程开头被清理（防止异常路径累积）
const TMP_STALE_MS = 2 * 60 * 60 * 1000
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

function logWarn(message) {
  console.error(`[WARN ${new Date().toISOString()}] ${message}`)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

// 不退出进程的 lark-cli 调用变体，用于附件路径——上传/挂载允许失败并落 dead-letter，
// 不能像 runLark() 那样一遇错就 process.exit 把整轮同步拖死。
function runLarkSafe(args) {
  const result = spawnSync("lark-cli", args, { encoding: "utf-8", cwd: __dirname })
  if (result.error) {
    return { ok: false, error: `lark-cli spawn 失败: ${result.error.message}` }
  }
  const stdout = (result.stdout || "").trim()
  const stderr = (result.stderr || "").trim()
  if (result.status !== 0) {
    return { ok: false, error: `lark-cli 退出码 ${result.status}: ${stderr || stdout || "(空)"}` }
  }
  if (!stdout) return { ok: true, json: null }
  let json
  try {
    json = JSON.parse(stdout)
  } catch (e) {
    return { ok: false, error: `lark-cli 输出非 JSON: ${stdout.slice(0, 200)}` }
  }
  if (!json || typeof json.code !== "number") {
    return { ok: false, error: `返回结构异常: ${JSON.stringify(json).slice(0, 200)}` }
  }
  if (json.code !== 0) {
    return { ok: false, error: `业务码 ${json.code}: ${json.msg || ""}`, json }
  }
  return { ok: true, json }
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

// ---------- dead-letter ----------
function loadDeadLetter() {
  if (!fs.existsSync(DEAD_LETTER_FILE)) return []
  const raw = fs.readFileSync(DEAD_LETTER_FILE, "utf-8").trim()
  if (!raw) return []
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    fail(`${path.basename(DEAD_LETTER_FILE)} 解析失败：${e.message}（请人工修复或删除该文件）`)
  }
  if (!Array.isArray(parsed)) {
    fail(`${path.basename(DEAD_LETTER_FILE)} 顶层应为数组`)
  }
  return parsed
}

function saveDeadLetter(list) {
  fs.writeFileSync(DEAD_LETTER_FILE, JSON.stringify(list, null, 2))
}

function findDeadLetterIdx(list, recordId, url) {
  return list.findIndex((it) => it.recordId === recordId && it.url === url)
}

function upsertDeadLetterEntry(list, { recordId, url, errorMessage }) {
  const idx = findDeadLetterIdx(list, recordId, url)
  const nowIso = new Date().toISOString()
  if (idx === -1) {
    list.push({
      recordId,
      url,
      attempts: 1,
      lastError: errorMessage,
      firstFailedAt: nowIso,
      lastFailedAt: nowIso,
      abandoned: false,
    })
    return
  }
  const entry = list[idx]
  entry.attempts = (entry.attempts || 0) + 1
  entry.lastError = errorMessage
  entry.lastFailedAt = nowIso
  if (entry.attempts >= MAX_ATTACH_ATTEMPTS) entry.abandoned = true
}

function removeDeadLetterEntry(list, recordId, url) {
  const idx = findDeadLetterIdx(list, recordId, url)
  if (idx !== -1) list.splice(idx, 1)
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

// 清理 tmp/ 残留：仅删除 mtime 早于 TMP_STALE_MS 的文件，避免误删并发运行中的中间文件
function cleanStaleTmp() {
  if (!fs.existsSync(TMP_DIR)) return
  let entries
  try {
    entries = fs.readdirSync(TMP_DIR)
  } catch (e) {
    logWarn(`读取 tmp 目录失败：${e.message}`)
    return
  }
  const cutoff = Date.now() - TMP_STALE_MS
  let removed = 0
  for (const name of entries) {
    const full = path.join(TMP_DIR, name)
    try {
      const st = fs.statSync(full)
      if (!st.isFile()) continue
      if (st.mtimeMs < cutoff) {
        fs.unlinkSync(full)
        removed += 1
      }
    } catch (e) {
      logWarn(`清理 tmp 文件失败 ${name}: ${e.message}`)
    }
  }
  if (removed > 0) logInfo(`tmp 清理：删除 ${removed} 个超过 ${TMP_STALE_MS / 60000} 分钟的残留文件`)
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

// Number 字段的 is 操作符只接受单值；多值会报 1254018 InvalidFilter。
// 故改为 conjunction:"or" 下每个 id 一条单值 is 条件，并按 SEARCH_FILTER_CHUNK
// 分批（飞书 filter conditions 上限 50）以兼容单轮新增超过 50 条的情况。
const SEARCH_FILTER_CHUNK = 50

function findExistingDbIds(dbIds) {
  if (dbIds.length === 0) return new Set()
  const found = new Set()
  for (let i = 0; i < dbIds.length; i += SEARCH_FILTER_CHUNK) {
    const chunk = dbIds.slice(i, i + SEARCH_FILTER_CHUNK)
    const filter = {
      conjunction: "or",
      conditions: chunk.map((id) => ({
        field_name: "db_feedback_id",
        operator: "is",
        value: [String(id)],
      })),
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
    for (const item of json.data.items || []) {
      const v = item.fields && item.fields.db_feedback_id
      if (typeof v === "number") found.add(v)
      else if (typeof v === "string" && /^\d+$/.test(v)) found.add(Number(v))
    }
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

// 仅上传单文件得到 file_token；不与具体 record 交互。失败抛 Error。
// 显式 parent_type=bitable_image：lark-cli 自带 helper 在此场景使用了不匹配的 parent_type，
// 导致写入时报 "Attachment file_token is unavailable"，故绕过。
function uploadFileToken(relativeFilePath, fileName) {
  const absPath = path.join(__dirname, relativeFilePath)
  const size = fs.statSync(absPath).size
  const res = runLarkSafe([
    "api", "POST", "/open-apis/drive/v1/medias/upload_all",
    "--file", `file=${relativeFilePath}`,
    "--data", JSON.stringify({
      file_name: fileName,
      parent_type: "bitable_image",
      parent_node: APP_TOKEN,
      size,
    }),
    "--as", "bot",
  ])
  if (!res.ok) throw new Error(`drive.upload_all(${fileName}) ${res.error}`)
  const token = res.json && res.json.data && res.json.data.file_token
  if (!token) throw new Error(`drive.upload_all(${fileName}) 未返回 file_token`)
  return token
}

// 校验 record 仍存在；用于 dead-letter 重投前的存活检查。
// 返回 'exists' | 'gone' | 'unknown'。
function checkRecordExists(recordId) {
  const res = runLarkSafe([
    "api", "GET",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    "--as", "bot",
  ])
  if (res.ok) return "exists"
  if (res.json && (res.json.code === 1254043 || res.json.code === 1254044 || res.json.code === 1254045)) {
    return "gone"
  }
  return "unknown"
}

// 把若干 file_token 挂到 record 的附件字段。
// merge=true 时先 GET 取已有附件合并后 PUT；merge=false 直接 PUT（用于 batch_create 紧随其后的初次挂载，
// 此时 record 上必无附件，可省一次 GET）。失败抛 Error。
function appendTokensToRecord(recordId, tokens, { merge }) {
  let existing = []
  if (merge) {
    const getRes = runLarkSafe([
      "api", "GET",
      `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
      "--as", "bot",
    ])
    if (!getRes.ok) throw new Error(`record-get(${recordId}) ${getRes.error}`)
    const fieldsObj = getRes.json && getRes.json.data && getRes.json.data.record && getRes.json.data.record.fields
    const cur = fieldsObj && fieldsObj[FIELD_NAMES.attachments]
    if (Array.isArray(cur)) existing = cur.slice()
  }
  const merged = existing.concat(tokens.map((t) => ({ file_token: t })))
  const updateBody = { fields: {} }
  updateBody.fields[FIELD_NAMES.attachments] = merged
  const updateRes = runLarkSafe([
    "api", "PUT",
    `/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/records/${recordId}`,
    "--data", JSON.stringify(updateBody),
    "--as", "bot",
  ])
  if (!updateRes.ok) throw new Error(`record-update(${recordId}) ${updateRes.error}`)
}

// 下载 + 上传单张图，得到 file_token。无论成败都会清理 tmp 文件。失败抛 Error。
async function downloadAndUpload(url) {
  let absPath = null
  try {
    const downloaded = await downloadToTempFile(url)
    absPath = downloaded.absPath
    const fileToken = uploadFileToken(downloaded.relPath, downloaded.fileName)
    return { fileToken, fileName: downloaded.fileName }
  } finally {
    if (absPath) fs.unlink(absPath, () => {})
  }
}

// 带退避的本轮内重试。返回 {fileToken, fileName} 或 throw 最后一次错误。
async function uploadWithBackoff(url) {
  let lastError = null
  for (let attempt = 0; attempt <= ATTACH_BACKOFF_MS.length; attempt += 1) {
    try {
      return await downloadAndUpload(url)
    } catch (e) {
      lastError = e
      if (attempt < ATTACH_BACKOFF_MS.length) {
        await sleep(ATTACH_BACKOFF_MS[attempt])
      }
    }
  }
  throw lastError
}

/**
 * 把 imgs 挂到对应 record 上：
 *   1) 逐 url 下载+上传（含本轮退避重试），收集成功的 file_token；
 *   2) 单次 PUT 把所有成功的 token 合并写入附件字段；
 *   3) 任何失败的（上传失败 或 PUT 失败）都落 dead-letter，不抛异常；
 *   4) merge=true 时合并已有附件（dead-letter 重投场景），merge=false 直接写（初次挂载场景）。
 * 返回 {ok, failed} 统计。
 */
async function attachImagesPerRecord(record, imgs, deadLetter, { merge }) {
  const recordId = record.record_id
  const succeeded = [] // {url, fileToken, fileName}
  const uploadFailed = [] // {url, error}

  for (const url of imgs) {
    try {
      const r = await uploadWithBackoff(url)
      succeeded.push({ url, ...r })
    } catch (e) {
      uploadFailed.push({ url, error: e })
    }
  }

  let appendError = null
  if (succeeded.length > 0) {
    try {
      appendTokensToRecord(recordId, succeeded.map((s) => s.fileToken), { merge })
      logInfo(`附件已挂到 ${recordId}: ${succeeded.length} 张（${succeeded.map((s) => s.fileName).join(", ")}）`)
      for (const s of succeeded) removeDeadLetterEntry(deadLetter, recordId, s.url)
    } catch (e) {
      appendError = e
    }
  }

  for (const { url, error } of uploadFailed) {
    const msg = error instanceof Error ? error.message : String(error)
    logWarn(`附件上传失败 record=${recordId} url=${url}: ${msg}`)
    upsertDeadLetterEntry(deadLetter, { recordId, url, errorMessage: msg })
  }
  if (appendError) {
    const msg = appendError instanceof Error ? appendError.message : String(appendError)
    logWarn(`附件合并到 record=${recordId} 失败: ${msg}（已上传的 file_token 不复用，下次重新下载）`)
    for (const s of succeeded) {
      upsertDeadLetterEntry(deadLetter, { recordId, url: s.url, errorMessage: `append: ${msg}` })
    }
  }

  return {
    ok: appendError ? 0 : succeeded.length,
    failed: uploadFailed.length + (appendError ? succeeded.length : 0),
  }
}

async function attachImagesToRecords(pairs, deadLetter) {
  let okTotal = 0
  let failTotal = 0
  for (const { record, imgs } of pairs) {
    const { ok, failed } = await attachImagesPerRecord(record, imgs, deadLetter, { merge: false })
    okTotal += ok
    failTotal += failed
  }
  return { ok: okTotal, failed: failTotal }
}

// 重投 dead-letter 中未 abandoned 的项。对 record 已删除的条目直接清除。
async function replayDeadLetter(deadLetter) {
  if (deadLetter.length === 0) return { replayed: 0, ok: 0, failed: 0, abandoned: 0, gone: 0 }

  const active = deadLetter.filter((it) => !it.abandoned)
  const abandonedCount = deadLetter.length - active.length
  if (active.length === 0) {
    logInfo(`dead-letter 全部已 abandoned（${abandonedCount} 条），跳过重投`)
    return { replayed: 0, ok: 0, failed: 0, abandoned: abandonedCount, gone: 0 }
  }

  const byRecord = new Map()
  for (const it of active) {
    if (!byRecord.has(it.recordId)) byRecord.set(it.recordId, [])
    byRecord.get(it.recordId).push(it.url)
  }
  logInfo(`dead-letter 重投：${active.length} 条 / ${byRecord.size} 个 record（abandoned ${abandonedCount} 条不再重试）`)

  let ok = 0
  let failed = 0
  let gone = 0
  for (const [recordId, urls] of byRecord) {
    const status = checkRecordExists(recordId)
    if (status === "gone") {
      for (const url of urls) {
        removeDeadLetterEntry(deadLetter, recordId, url)
        gone += 1
      }
      logWarn(`dead-letter 记录的 record ${recordId} 已不存在，清除其 ${urls.length} 条挂起附件`)
      continue
    }
    // unknown 也尝试重投——可能是临时错误
    const { ok: o, failed: f } = await attachImagesPerRecord(
      { record_id: recordId },
      urls,
      deadLetter,
      { merge: true },
    )
    ok += o
    failed += f
  }
  return { replayed: active.length, ok, failed, abandoned: abandonedCount, gone }
}

// ---------- 主流程 ----------
async function main() {
  assertEnv()
  cleanStaleTmp()

  let fields = listFields()
  ensureDbFeedbackIdField(fields)
  // 若刚创建过 db_feedback_id 字段，重新列一次确保后续读取一致
  if (!fields.some((f) => f.field_name === FIELD_NAMES.dbFeedbackId)) {
    fields = listFields()
  }
  const validDepartments = getDepartmentOptionNames(fields)

  // dead-letter 在 DB 连接之前就先重投；与 RDS 连通性无关，独立失败也不影响主拉取
  const deadLetter = loadDeadLetter()
  try {
    const replay = await replayDeadLetter(deadLetter)
    if (replay.replayed > 0 || replay.abandoned > 0) {
      logInfo(`dead-letter 重投结果：成功 ${replay.ok} / 失败 ${replay.failed} / 已弃 ${replay.abandoned} / 清除已删 ${replay.gone}`)
    }
  } finally {
    saveDeadLetter(deadLetter)
  }

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
    if (createdRecords.length !== buildRows.length) {
      logWarn(`batch_create 返回 ${createdRecords.length} 条，期望 ${buildRows.length}，按 db_feedback_id 对齐挂附件`)
    }

    // 二阶段：按 db_feedback_id 把 createdRecords 对回 buildRows，避免位置错位
    const recordByDbId = new Map()
    for (const rec of createdRecords) {
      const dbId = rec && rec.fields && rec.fields[FIELD_NAMES.dbFeedbackId]
      if (typeof dbId === "number") recordByDbId.set(dbId, rec)
      else if (typeof dbId === "string" && /^\d+$/.test(dbId)) recordByDbId.set(Number(dbId), rec)
    }
    const pairs = []
    let missing = 0
    for (const br of buildRows) {
      if (br.imgs.length === 0) continue
      const dbId = br.fields[FIELD_NAMES.dbFeedbackId]
      const rec = recordByDbId.get(dbId)
      if (!rec) {
        missing += 1
        logWarn(`db_feedback_id=${dbId} 未在 batch_create 返回中找到，跳过挂附件（下轮可手工补）`)
        continue
      }
      pairs.push({ record: rec, imgs: br.imgs })
    }

    try {
      if (pairs.length > 0) {
        const totalImgs = pairs.reduce((s, p) => s + p.imgs.length, 0)
        logInfo(`开始上传附件，涉及 ${pairs.length} 条 record，共 ${totalImgs} 张图${missing ? `（另有 ${missing} 条因对齐失败跳过）` : ""}`)
        const { ok, failed } = await attachImagesToRecords(pairs, deadLetter)
        logInfo(`附件结果：成功 ${ok} 张 / 失败 ${failed} 张（失败已落 dead-letter）`)
      }
    } finally {
      // 即使附件阶段中途异常，先把 dead-letter 落盘
      saveDeadLetter(deadLetter)
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
