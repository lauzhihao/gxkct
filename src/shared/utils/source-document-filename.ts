export function getDisplaySourceDocumentFilename(filename?: string): string {
  if (!filename) {
    return "未命名文件"
  }

  const normalizedFilename = filename.split("/").filter(Boolean).pop() || filename
  const matched = normalizedFilename.match(/^[^_]+_\d+_(.+)$/)

  if (!matched) {
    return normalizedFilename
  }

  const originalFilename = matched[1]
  return originalFilename.length > 0 ? originalFilename : normalizedFilename
}
