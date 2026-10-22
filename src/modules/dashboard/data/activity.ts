import type { LastOperationDto, RecentOperationDto } from "@/modules/dashboard/data/dashboard-api"
import { parseDay } from "@/modules/dashboard/data/evaluation"
import type { RecentOperation } from "@/modules/dashboard/types"

/** 零建设教师：近 60 天（不含第 60 天以前）没有课程建设操作 */
export const IDLE_DAYS = 60

const DAY_MS = 24 * 60 * 60 * 1000

/** 操作时间为 ISO 带时区格式（同一服务器时区）：取日期与时分 */
const ISO_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/

function matchDateTime(timestamp: string): RegExpExecArray {
  const match = ISO_DATE_TIME.exec(timestamp)
  if (match === null) {
    throw new Error(`Unexpected operation time format: ${timestamp}`)
  }
  return match
}

export function toOperationDay(timestamp: string): string {
  const match = matchDateTime(timestamp)
  return `${match[1]}-${match[2]}-${match[3]}`
}

function toOperationMinute(timestamp: string): string {
  const match = matchDateTime(timestamp)
  return `${match[2]}-${match[3]} ${match[4]}:${match[5]}`
}

export function toRecentOperations(operations: readonly RecentOperationDto[]): RecentOperation[] {
  return operations.map((operation, index) => ({
    id: `${operation.operatedAt}-${index}`,
    userName: operation.userName !== null && operation.userName.trim() !== "" ? operation.userName : "（未填写姓名）",
    courseName: operation.courseName,
    operation: operation.operation,
    operatedAt: toOperationMinute(operation.operatedAt),
  }))
}

/** 用户 ID -> 最近一次课程建设操作的日期（YYYY-MM-DD） */
export function indexLastOperationDays(operations: readonly LastOperationDto[]): Map<string, string> {
  return new Map(operations.map((operation) => [operation.userId, toOperationDay(operation.lastOperatedAt)]))
}

export function isIdle(lastOperatedDay: string | null, today: number): boolean {
  if (lastOperatedDay === null) return true
  return today - parseDay(lastOperatedDay) > IDLE_DAYS * DAY_MS
}

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/

function matchMonth(month: string): RegExpExecArray {
  const match = MONTH_PATTERN.exec(month)
  if (match === null) {
    throw new Error(`Unexpected month format: ${month}`)
  }
  return match
}

/** yyyy-MM -> "4月"，坐标轴用 */
export function monthLabel(month: string): string {
  return `${Number(matchMonth(month)[2])}月`
}

/** yyyy-MM -> "2026年4月"，提示用 */
export function monthTitle(month: string): string {
  const match = matchMonth(month)
  return `${match[1]}年${Number(match[2])}月`
}
