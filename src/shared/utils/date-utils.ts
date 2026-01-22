/**
 * 日期工具函数
 * 提供统一的日期格式化和处理功能
 */

/**
 * 格式化日期选项
 */
export interface FormatDateOptions {
  /** 日期格式，默认为 'date' */
  format?: 'date' | 'datetime' | 'time'
  /** 日期分隔符，默认为 '-' */
  separator?: string
  /** 时间分隔符，默认为 ':' */
  timeSeparator?: string
}

/**
 * 格式化日期为字符串（仅日期部分 YYYY-MM-DD）
 * @param dateString - 日期字符串或 Date 对象
 * @param options - 格式化选项
 * @returns 格式化后的日期字符串，无效日期返回 "未设置"
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (!dateString) return '未设置'

  const { separator = '-' } = options

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '未设置'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}${separator}${month}${separator}${day}`
  } catch {
    return '未设置'
  }
}

/**
 * 格式化日期时间为字符串（YYYY-MM-DD HH:mm:ss）
 * @param dateString - 日期字符串或 Date 对象
 * @param options - 格式化选项
 * @returns 格式化后的日期时间字符串，无效日期返回 "未设置"
 */
export function formatDateTime(
  dateString: string | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (!dateString) return '未设置'

  const { separator = '-', timeSeparator = ':' } = options

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    if (isNaN(date.getTime())) {
      return '未设置'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${separator}${month}${separator}${day} ${hours}${timeSeparator}${minutes}${timeSeparator}${seconds}`
  } catch {
    return '未设置'
  }
}

/**
 * 格式化时间为字符串（HH:mm:ss）
 * @param dateString - 日期字符串或 Date 对象
 * @param options - 格式化选项
 * @returns 格式化后的时间字符串，无效日期返回 "未设置"
 */
export function formatTime(
  dateString: string | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  if (!dateString) return '未设置'

  const { timeSeparator = ':' } = options

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    if (isNaN(date.getTime())) {
      return '未设置'
    }

    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${hours}${timeSeparator}${minutes}${timeSeparator}${seconds}`
  } catch {
    return '未设置'
  }
}

/**
 * 格式化日期范围
 * @param startDate - 开始日期
 * @param endDate - 结束日期
 * @param options - 格式化选项
 * @returns 格式化后的日期范围字符串
 */
export function formatDateRange(
  startDate: string | Date | null | undefined,
  endDate: string | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  const start = formatDate(startDate, options)
  const end = formatDate(endDate, options)

  if (start === '未设置' && end === '未设置') {
    return '未设置'
  }

  if (start === '未设置') {
    return `至 ${end}`
  }

  if (end === '未设置') {
    return `${start} 起`
  }

  return `${start} 至 ${end}`
}

/**
 * 检查日期是否有效
 * @param dateString - 日期字符串或 Date 对象
 * @returns 日期是否有效
 */
export function isValidDate(dateString: string | Date | null | undefined): boolean {
  if (!dateString) return false

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString
    return !isNaN(date.getTime())
  } catch {
    return false
  }
}

/**
 * 获取相对时间描述（如：刚刚、5分钟前、3天前）
 * @param dateString - 日期字符串或 Date 对象
 * @returns 相对时间描述
 */
export function getRelativeTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return '未知时间'

  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString

    if (isNaN(date.getTime())) {
      return '未知时间'
    }

    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 30) {
      return `${days}天前`
    } else {
      return formatDate(date)
    }
  } catch {
    return '未知时间'
  }
}

/**
 * 格式化时间戳为相对时间（支持周、月显示）
 * @param timestamp - 时间戳（毫秒）
 * @returns 相对时间描述
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const weeks = Math.floor(days / 7)
  const months = Math.floor(days / 30)

  if (seconds < 60) return "刚刚"
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  if (weeks < 4) return `${weeks}周前`
  if (months < 12) return `${months}月前`
  return "更早前"
}
