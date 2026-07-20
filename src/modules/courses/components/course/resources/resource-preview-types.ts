export const RESOURCE_PREVIEW_STATUSES = [
  "NONE",
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
] as const

export type ResourcePreviewStatus = (typeof RESOURCE_PREVIEW_STATUSES)[number]

export type DirectResourcePreviewKind =
  | "pdf"
  | "image"
  | "video"
  | "markdown"
  | "text"

export interface ResourcePreviewDetail {
  id: string
  displayName: string
  mimeType: string
  downloadUrl: string
  previewStatus: ResourcePreviewStatus
  previewUrl: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readRequiredString(
  record: Record<string, unknown>,
  field: string,
): string {
  const value = record[field]
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`资源详情字段 ${field} 缺失或无效`)
  }
  return value
}

function readSafeUrl(
  record: Record<string, unknown>,
  field: string,
  nullable: false,
): string
function readSafeUrl(
  record: Record<string, unknown>,
  field: string,
  nullable: true,
): string | null
function readSafeUrl(
  record: Record<string, unknown>,
  field: string,
  nullable: boolean,
): string | null {
  const value = record[field]
  if (value === null && nullable) {
    return null
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`资源详情字段 ${field} 缺失或无效`)
  }

  if (value.startsWith("/")) {
    return value
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(value)
  } catch {
    throw new Error(`资源详情字段 ${field} 不是有效链接`)
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`资源详情字段 ${field} 使用了不安全的协议`)
  }
  return value
}

function readOptionalSafeUrl(
  record: Record<string, unknown>,
  field: string,
): string | null {
  const value = record[field]
  if (value === undefined || value === null) {
    return null
  }
  return readSafeUrl(record, field, true)
}

function readPreviewStatus(
  record: Record<string, unknown>,
): ResourcePreviewStatus {
  const value = record.previewStatus
  for (const status of RESOURCE_PREVIEW_STATUSES) {
    if (value === status) {
      return status
    }
  }
  throw new Error("资源详情字段 previewStatus 缺失或无效")
}

export function parseResourcePreviewDetail(
  value: unknown,
): ResourcePreviewDetail {
  if (!isRecord(value)) {
    throw new Error("资源详情响应格式无效")
  }

  const previewStatus = readPreviewStatus(value)
  const previewUrl = readOptionalSafeUrl(value, "previewUrl")
  if (previewStatus === "READY" && previewUrl === null) {
    throw new Error("资源预览已就绪，但 previewUrl 缺失")
  }

  return {
    id: readRequiredString(value, "id"),
    displayName: readRequiredString(value, "displayName"),
    mimeType: readRequiredString(value, "mimeType"),
    downloadUrl: readSafeUrl(value, "downloadUrl", false),
    previewStatus,
    previewUrl,
  }
}

export function resolveDirectResourcePreviewKind(
  displayName: string,
  mimeType: string,
): DirectResourcePreviewKind | null {
  const normalizedName = displayName.trim().toLowerCase()
  const normalizedMimeType = mimeType.trim().toLowerCase()

  if (normalizedMimeType === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf"
  }
  if (
    normalizedMimeType.startsWith("image/") ||
    /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/.test(normalizedName)
  ) {
    return "image"
  }
  if (
    normalizedMimeType.startsWith("video/") ||
    /\.(m4v|mov|mp4|mpeg|ogv|webm)$/.test(normalizedName)
  ) {
    return "video"
  }
  if (
    normalizedMimeType === "text/markdown" ||
    normalizedMimeType === "text/x-markdown" ||
    normalizedName.endsWith(".md") ||
    normalizedName.endsWith(".markdown")
  ) {
    return "markdown"
  }
  if (normalizedMimeType === "text/plain" || normalizedName.endsWith(".txt")) {
    return "text"
  }
  return null
}
