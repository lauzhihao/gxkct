import { parseDay } from "@/modules/dashboard/data/evaluation"

/** 设计稿口径：课程信息最后保存日距今天超过 60 天（不含第 60 天）为长期未更新 */
export const STALE_DAYS = 60

const DAY_MS = 24 * 60 * 60 * 1000

/** 保存时间为 ISO 带时区格式（同一服务器时区），取日期部分展示 */
const ISO_DATE_PREFIX = /^\d{4}-\d{2}-\d{2}/

/** 课程信息保存时间 -> YYYY-MM-DD；格式不符说明契约变了，直接报错 */
export function toUpdateDay(updateTime: string): string {
  const match = ISO_DATE_PREFIX.exec(updateTime)
  if (match === null) {
    throw new Error(`Unexpected update time format: ${updateTime}`)
  }
  return match[0]
}

export function isStale(updateDay: string, today: number): boolean {
  return today - parseDay(updateDay) > STALE_DAYS * DAY_MS
}
