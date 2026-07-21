const MAX_RESOURCE_NAME_LENGTH = 64
const COMPLETE_FILE_NAME_PATTERN = /^[\u4e00-\u9fa5a-zA-Z0-9 ._-]+$/

export function validateFolderName(value: string): string | null {
  const trimmedName = value.trim()
  if (trimmedName.length === 0) {
    return "文件夹名称不能为空"
  }
  if (trimmedName.length > MAX_RESOURCE_NAME_LENGTH) {
    return "文件夹名称不能超过64个字符"
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/.test(trimmedName)) {
    return "文件夹名称包含特殊符号，请重新输入"
  }
  return null
}

export function validateCompleteFileName(value: string): string | null {
  const trimmedName = value.trim()
  if (trimmedName.length === 0) {
    return "文件名称不能为空"
  }
  if (trimmedName.length > MAX_RESOURCE_NAME_LENGTH) {
    return "文件名称不能超过64个字符"
  }
  if (trimmedName.endsWith(".")) {
    return "文件名称不能以点号结尾"
  }
  if (!COMPLETE_FILE_NAME_PATTERN.test(trimmedName)) {
    return "文件名称只能包含中文、英文字母、数字、空格、点号、连字符和下划线"
  }
  return null
}
