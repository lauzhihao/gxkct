/**
 * 看板接口响应的严格解析：字段缺失或类型不符直接抛错，不做默认值兜底。
 * 后端为 Spring 默认 Jackson 序列化：Long / BigDecimal 输出为数字，null 字段原样输出为 null。
 */

export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown, context: string): JsonRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${context}: expected object`)
  }
  return value as JsonRecord
}

export function asArray(value: unknown, context: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected array`)
  }
  return value
}

export function readString(record: JsonRecord, key: string, context: string): string {
  const value = record[key]
  if (typeof value !== "string") {
    throw new Error(`${context}.${key}: expected string`)
  }
  return value
}

/** 允许为 null 的字符串字段；字段整体缺失视为契约不符 */
export function readNullableString(record: JsonRecord, key: string, context: string): string | null {
  const value = record[key]
  if (value === null) return null
  if (typeof value !== "string") {
    throw new Error(`${context}.${key}: expected string or null`)
  }
  return value
}

export function readNumber(record: JsonRecord, key: string, context: string): number {
  const value = record[key]
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}.${key}: expected number`)
  }
  return value
}

export function readNullableNumber(record: JsonRecord, key: string, context: string): number | null {
  const value = record[key]
  if (value === null) return null
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${context}.${key}: expected number or null`)
  }
  return value
}

/**
 * 统计 SQL 里 SUM(CASE ...) 在分组内没有记录时返回 NULL（preview 版本未包 COALESCE），
 * 语义上就是 0 条，这里按 0 计。只用于这类计数字段。
 */
export function readSqlSum(record: JsonRecord, key: string, context: string): number {
  const value = readNullableNumber(record, key, context)
  return value === null ? 0 : value
}

export function readBoolean(record: JsonRecord, key: string, context: string): boolean {
  const value = record[key]
  if (typeof value !== "boolean") {
    throw new Error(`${context}.${key}: expected boolean`)
  }
  return value
}

export function readNullableBoolean(record: JsonRecord, key: string, context: string): boolean | null {
  const value = record[key]
  if (value === null) return null
  if (typeof value !== "boolean") {
    throw new Error(`${context}.${key}: expected boolean or null`)
  }
  return value
}

/** 主键：后端 Long 输出为数字，树节点与卡片的 value 为字符串，统一转成字符串 */
export function readId(record: JsonRecord, key: string, context: string): string {
  const value = record[key]
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  if (typeof value === "string" && value.trim() !== "") return value
  throw new Error(`${context}.${key}: expected id`)
}
