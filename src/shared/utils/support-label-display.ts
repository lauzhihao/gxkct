interface SupportLabelDisplayInput {
  title?: string
  description?: string
  fallbackTitle?: string
  defaultTitle?: string
}

interface SupportLabelDisplayOutput {
  title: string
  desc: string
}

function normalizeText(value?: string): string {
  return typeof value === "string" ? value.trim() : ""
}

export function buildSupportLabelDisplay({
  title,
  description,
  fallbackTitle,
  defaultTitle = "课点",
}: SupportLabelDisplayInput): SupportLabelDisplayOutput {
  const normalizedTitle = normalizeText(title)
  const normalizedFallbackTitle = normalizeText(fallbackTitle)
  const finalTitle = normalizedTitle || normalizedFallbackTitle || defaultTitle

  const normalizedDescription = normalizeText(description)
  const desc = normalizedDescription ? `${finalTitle}: ${normalizedDescription}` : finalTitle

  return {
    title: finalTitle,
    desc,
  }
}
