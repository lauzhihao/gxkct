import type { ResourcePreviewStatus } from "@/lib/api"

const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i
const OFFICE_FILE_EXTENSION_PATTERN =
  /\.(doc|docm|docx|dot|dotm|dotx|xls|xlsb|xlsm|xlsx|xlt|xltm|xltx|xla|xlam|ppt|pptm|pptx|pot|potm|potx|pps|ppsm|ppsx|ppa|ppam|rtf|odt|ott|odm|oth|odg|otg|odp|otp|ods|ots|odc|odf|odb|odi)$/
const IMAGE_FILE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|webp)$/
const VIDEO_FILE_EXTENSION_PATTERN = /\.(m4v|mov|mp4|mpeg|ogv|webm)$/
const MARKDOWN_FILE_EXTENSION_PATTERN = /\.(md|markdown)$/
const OFFICE_MIME_TYPES = new Set([
  "application/excel",
  "application/msexcel",
  "application/mspowerpoint",
  "application/msword",
  "application/powerpoint",
  "application/rtf",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/vnd.ms-word",
  "application/vnd.ms-works",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
  "application/vnd.openxmlformats-officedocument.presentationml.template",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
  "application/x-excel",
  "application/x-msexcel",
  "application/x-mspowerpoint",
  "text/rtf",
])

function isHttpsPage(): boolean {
  return typeof window !== "undefined" && window.location.protocol === "https:"
}

export function resolveSafeResourceUrl(value: string, label: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw new Error(`${label}为空`)
  }
  if (trimmed.includes("\\")) {
    throw new Error(`${label}无效`)
  }
  if (trimmed.startsWith("/")) {
    if (trimmed.startsWith("//")) {
      throw new Error(`${label}无效`)
    }
    return trimmed
  }
  if (!ABSOLUTE_HTTP_URL_PATTERN.test(trimmed)) {
    throw new Error(`${label}不是有效链接`)
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(trimmed)
  } catch {
    throw new Error(`${label}不是有效链接`)
  }
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`${label}使用了不安全的协议`)
  }

  if (parsedUrl.protocol === "http:" && isHttpsPage()) {
    const schemeSeparatorIndex = trimmed.indexOf(":")
    return `https:${trimmed.slice(schemeSeparatorIndex + 1)}`
  }
  return trimmed
}

export const RESOURCE_PREVIEW_STATUSES = [
  "NONE",
  "PENDING",
  "PROCESSING",
  "READY",
  "FAILED",
] as const satisfies readonly ResourcePreviewStatus[]

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

export type ResourcePreviewPresentation =
  | { mode: "unsupported" }
  | { mode: "direct-text"; kind: "markdown" | "text" }
  | {
      mode: "status"
      directKind: "pdf" | "image" | "video" | null
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

  return resolveSafeResourceUrl(value, `资源详情字段 ${field}`)
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

  const id = readRequiredString(value, "id")
  const displayName = readRequiredString(value, "displayName")
  const mimeType = readRequiredString(value, "mimeType")
  const downloadUrl = readSafeUrl(value, "downloadUrl", false)
  const directKind = resolveDirectResourcePreviewKind(displayName, mimeType)
  const ignoresConvertedPreview =
    directKind === null || directKind === "markdown" || directKind === "text"
  const previewStatus = readPreviewStatus(value)
  let previewUrl: string | null = null
  if (!ignoresConvertedPreview) {
    previewUrl = readOptionalSafeUrl(value, "previewUrl")
    if (previewStatus === "READY" && previewUrl === null) {
      throw new Error("资源预览已就绪，但 previewUrl 缺失")
    }
  }

  return {
    id,
    displayName,
    mimeType,
    downloadUrl,
    previewStatus,
    previewUrl,
  }
}

function normalizeResourceName(displayName: string): string {
  const normalizedName = displayName.trim().toLowerCase()
  if (normalizedName.length === 0) {
    throw new Error("资源名称缺失或无效")
  }
  return normalizedName
}

function normalizeResourceMimeType(mimeType: string): string {
  const parameterSeparatorIndex = mimeType.indexOf(";")
  const normalizedMimeType = (
    parameterSeparatorIndex === -1
      ? mimeType
      : mimeType.slice(0, parameterSeparatorIndex)
  ).trim().toLowerCase()
  if (normalizedMimeType.length === 0) {
    throw new Error("资源 MIME 类型缺失或无效")
  }
  return normalizedMimeType
}

function isOfficeMimeType(normalizedMimeType: string): boolean {
  return (
    OFFICE_MIME_TYPES.has(normalizedMimeType) ||
    normalizedMimeType.startsWith("application/vnd.ms-word.") ||
    normalizedMimeType.startsWith("application/vnd.ms-excel.") ||
    normalizedMimeType.startsWith("application/vnd.ms-powerpoint.") ||
    normalizedMimeType.startsWith("application/vnd.oasis.opendocument.")
  )
}

export function isOfficeResource(
  displayName: string,
  mimeType: string,
): boolean {
  const normalizedName = normalizeResourceName(displayName)
  const normalizedMimeType = normalizeResourceMimeType(mimeType)
  if (OFFICE_FILE_EXTENSION_PATTERN.test(normalizedName)) {
    return true
  }
  return isOfficeMimeType(normalizedMimeType)
}

export function resolveDirectResourcePreviewKind(
  displayName: string,
  mimeType: string,
): DirectResourcePreviewKind | null {
  const normalizedName = normalizeResourceName(displayName)
  const normalizedMimeType = normalizeResourceMimeType(mimeType)

  if (isOfficeResource(normalizedName, normalizedMimeType)) {
    return null
  }
  if (
    normalizedMimeType === "image/svg+xml" ||
    normalizedName.endsWith(".svg")
  ) {
    return "text"
  }

  if (normalizedMimeType === "application/pdf" || normalizedName.endsWith(".pdf")) {
    return "pdf"
  }
  if (
    normalizedMimeType.startsWith("image/") ||
    IMAGE_FILE_EXTENSION_PATTERN.test(normalizedName)
  ) {
    return "image"
  }
  if (
    normalizedMimeType.startsWith("video/") ||
    VIDEO_FILE_EXTENSION_PATTERN.test(normalizedName)
  ) {
    return "video"
  }
  if (
    normalizedMimeType === "text/markdown" ||
    normalizedMimeType === "text/x-markdown" ||
    MARKDOWN_FILE_EXTENSION_PATTERN.test(normalizedName)
  ) {
    return "markdown"
  }
  return "text"
}

export function resolveResourcePreviewPresentation(
  displayName: string,
  mimeType: string,
  directPreviewFailed: boolean,
): ResourcePreviewPresentation {
  if (directPreviewFailed || isOfficeResource(displayName, mimeType)) {
    return { mode: "unsupported" }
  }

  const directKind = resolveDirectResourcePreviewKind(displayName, mimeType)
  if (directKind === "markdown" || directKind === "text") {
    return { mode: "direct-text", kind: directKind }
  }
  if (directKind === null) {
    return { mode: "unsupported" }
  }
  return { mode: "status", directKind }
}
