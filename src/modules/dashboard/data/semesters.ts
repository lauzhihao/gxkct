import type { SemesterBrief } from "@/types/semester"

/**
 * 学期先后顺序（后端 SemesterServiceImpl 的命名规则）：
 * school_year = Y 时，AUTUMN 为 (Y-1)-Y 学年第一学期，SPRING 为 (Y-1)-Y 学年第二学期，
 * 所以同一 school_year 内 AUTUMN 在前、SPRING 在后。
 * 学年不是四位年份或学期类型不是 SPRING / AUTUMN 的学期无法排序，不参与对比。
 */

export type TermType = "SPRING" | "AUTUMN"

export interface OrderedSemester {
  id: number
  name: string
  schoolYear: number
  termType: TermType
}

const YEAR_PATTERN = /^\d{4}$/

function toOrderedSemester(semester: SemesterBrief): OrderedSemester | null {
  const yearText = String(semester.schoolYear).trim()
  if (!YEAR_PATTERN.test(yearText)) return null
  if (semester.termType !== "SPRING" && semester.termType !== "AUTUMN") return null
  return { id: semester.id, name: semester.name, schoolYear: Number(yearText), termType: semester.termType }
}

function orderKey(semester: OrderedSemester): number {
  return semester.schoolYear * 2 + (semester.termType === "AUTUMN" ? 0 : 1)
}

export interface SemesterComparisons {
  /** 按学年学期排在当前学期之前的最近一个学期 */
  previous: OrderedSemester | null
  /** 去年同学期：学年减一、春秋季相同 */
  sameTermLastYear: OrderedSemester | null
}

export function resolveSemesterComparisons(semesterList: readonly SemesterBrief[], semesterId: number | null): SemesterComparisons {
  const ordered = semesterList.map(toOrderedSemester).filter((semester): semester is OrderedSemester => semester !== null)
  const current = ordered.find((semester) => semester.id === semesterId)
  if (current === undefined) {
    return { previous: null, sameTermLastYear: null }
  }

  const currentKey = orderKey(current)
  const earlier = ordered.filter((semester) => orderKey(semester) < currentKey).sort((left, right) => orderKey(right) - orderKey(left))
  const sameTermLastYear = ordered.find(
    (semester) => semester.schoolYear === current.schoolYear - 1 && semester.termType === current.termType,
  )
  return {
    previous: earlier.length > 0 ? earlier[0] : null,
    sameTermLastYear: sameTermLastYear === undefined ? null : sameTermLastYear,
  }
}

/** 对比学期参与看板查询的缓存键：学期列表变化时重新加载 */
export function comparisonKey(comparisons: SemesterComparisons): string {
  const previous = comparisons.previous === null ? "none" : String(comparisons.previous.id)
  const lastYear = comparisons.sameTermLastYear === null ? "none" : String(comparisons.sameTermLastYear.id)
  return `${previous}|${lastYear}`
}
