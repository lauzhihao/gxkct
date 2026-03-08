import DOMPurify from "isomorphic-dompurify"

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]

const ALLOWED_ATTR = ["colspan", "rowspan"]

export function sanitizeRichTextHtml(value: string): string {
  return DOMPurify.sanitize(value, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  })
}

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function isRichTextEmpty(value: string): boolean {
  const normalized = value
    .replace(/<p><\/p>/gi, "")
    .replace(/<p>\s*<br\s*\/?\s*>\s*<\/p>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .trim()

  return normalized.length === 0
}

export function hasRichTextTable(value: string): boolean {
  return /<table[\s>]/i.test(value)
}

export function getRichTextPreview(value: string, maxLength: number = 48): string {
  const sanitized = sanitizeRichTextHtml(value)
  const text = sanitized
    .replace(/<\s*br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trim()}...`
}
