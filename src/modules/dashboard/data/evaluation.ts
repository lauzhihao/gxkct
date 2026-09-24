import type { EvaluationStatus } from "@/modules/dashboard/types"

/**
 * 质量评估的看板口径。
 * 任务状态、各级评价状态取值均为 not_started / in_progress / completed（后端 teaching_supervisory_task 表注释）。
 */

const EVALUATION_STATUSES: readonly EvaluationStatus[] = ["not_started", "in_progress", "completed"]

/** 设计稿口径：30 天内到期视为临期 */
export const DUE_SOON_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000
const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export type DeadlineStatus = "overdue" | "dueSoon" | "pending"

/** 后端日期统一为 DATE_FORMAT(..., '%Y-%m-%d')；不符合说明契约变了，直接报错 */
export function parseDay(value: string): number {
  const match = DAY_PATTERN.exec(value)
  if (match === null) {
    throw new Error(`Unexpected date format: ${value}`)
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])).getTime()
}

export function startOfToday(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/** 截止日已过为逾期；截止日在今天起 30 天内为临期；其余为进行中 */
export function classifyDeadline(endDate: string, today: number): DeadlineStatus {
  const end = parseDay(endDate)
  if (end < today) return "overdue"
  if (end - today <= DUE_SOON_DAYS * DAY_MS) return "dueSoon"
  return "pending"
}

export function isTaskCompleted(status: string | null): boolean {
  return status === "completed"
}

export function isStepCompleted(status: string | null): boolean {
  return status === "completed"
}

/** null 为后端没有记录状态，原样保留；三种取值以外说明契约变了，直接报错 */
export function toEvaluationStatus(value: string | null): EvaluationStatus | null {
  if (value === null) return null
  const status = EVALUATION_STATUSES.find((item) => item === value)
  if (status === undefined) {
    throw new Error(`Unexpected evaluation status: ${value}`)
  }
  return status
}

/** 尚未完成整体评估的课程数 */
export function pendingCourseCount(stat: { notStartedCount: number; inProgressCount: number }): number {
  return stat.notStartedCount + stat.inProgressCount
}
