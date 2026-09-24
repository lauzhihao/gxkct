import type { SemesterBrief } from "@/types/semester"

/**
 * 学期先后顺序。学年、学期类型的识别规则与学期管理（universities/components/shared/semester-management.utils.ts）一致：
 * - 学年：名称里的 "YYYY-YYYY" / "YYYY/YYYY"（后一年比前一年大 1）优先；否则取 school_year，
 *   可以是四位年份，也可以是 "YYYY-YYYY" / "YYYY/YYYY"。
 * - 学期类型：去掉首尾空格、不分大小写的 SPRING / AUTUMN / FALL / SUMMER，FALL 按 AUTUMN。
 * 学年统一换算成结束年份：四位年份 Y 表示 (Y-1)-Y 学年（后端 SemesterServiceImpl.buildSemesterName），结束年份就是 Y；
 * "S-E" 学年的结束年份是 E。同一学年内 AUTUMN（第一学期）在前，SPRING（第二学期）其次，SUMMER 最后。
 * 识别不了的学期不参与对比。
 */

export type SemesterTerm = "AUTUMN" | "SPRING" | "SUMMER"

export interface OrderedSemester {
  id: number
  name: string
  /** 学年的结束年份：2025-2026 学年为 2026 */
  endYear: number
  term: SemesterTerm
}

const TERM_INDEX: Record<SemesterTerm, number> = { AUTUMN: 0, SPRING: 1, SUMMER: 2 }

const YEAR_PATTERN = /^\d{4}$/
const YEAR_RANGE_IN_NAME = /(\d{4})[-/](\d{4})/
const YEAR_RANGE_PATTERN = /^(\d{4})[-/](\d{4})$/

/** 学年的结束年份；学年无法识别时为 null */
function parseEndYear(schoolYear: string | number, name: string): number | null {
  const nameMatch = name.match(YEAR_RANGE_IN_NAME)
  if (nameMatch !== null && Number(nameMatch[2]) === Number(nameMatch[1]) + 1) {
    return Number(nameMatch[2])
  }
  if (typeof schoolYear === "number") {
    return Number.isInteger(schoolYear) && schoolYear >= 1000 && schoolYear <= 9999 ? schoolYear : null
  }
  const yearText = schoolYear.trim()
  if (YEAR_PATTERN.test(yearText)) return Number(yearText)
  const rangeMatch = yearText.match(YEAR_RANGE_PATTERN)
  if (rangeMatch !== null && Number(rangeMatch[2]) === Number(rangeMatch[1]) + 1) {
    return Number(rangeMatch[2])
  }
  return null
}

function parseTerm(termType: string | number): SemesterTerm | null {
  if (typeof termType !== "string") return null
  const normalized = termType.trim().toUpperCase()
  if (normalized === "AUTUMN" || normalized === "FALL") return "AUTUMN"
  if (normalized === "SPRING") return "SPRING"
  if (normalized === "SUMMER") return "SUMMER"
  return null
}

function toOrderedSemester(semester: SemesterBrief): OrderedSemester | null {
  const endYear = parseEndYear(semester.schoolYear, semester.name)
  const term = parseTerm(semester.termType)
  if (endYear === null || term === null) return null
  return { id: semester.id, name: semester.name, endYear, term }
}

function orderKey(semester: OrderedSemester): number {
  return semester.endYear * 3 + TERM_INDEX[semester.term]
}

export interface SemesterComparisons {
  /** 按学年学期排在当前学期之前的最近一个学期 */
  previous: OrderedSemester | null
  /** 去年同学期：学年减一、学期类型相同 */
  sameTermLastYear: OrderedSemester | null
  /** 当前学期在学期列表里，但学年或学期类型识别不了，所以找不到对比学期 */
  currentUnrecognized: boolean
}

export function resolveSemesterComparisons(semesterList: readonly SemesterBrief[], semesterId: number | null): SemesterComparisons {
  const listed = semesterList.find((semester) => semester.id === semesterId)
  const current = listed === undefined ? null : toOrderedSemester(listed)
  if (current === null) {
    return { previous: null, sameTermLastYear: null, currentUnrecognized: listed !== undefined }
  }

  const ordered = semesterList.map(toOrderedSemester).filter((semester): semester is OrderedSemester => semester !== null)
  const currentKey = orderKey(current)
  const earlier = ordered.filter((semester) => orderKey(semester) < currentKey).sort((left, right) => orderKey(right) - orderKey(left))
  const sameTermLastYear = ordered.find((semester) => semester.endYear === current.endYear - 1 && semester.term === current.term)
  return {
    previous: earlier.length > 0 ? earlier[0] : null,
    sameTermLastYear: sameTermLastYear === undefined ? null : sameTermLastYear,
    currentUnrecognized: false,
  }
}

/** 对比学期参与看板查询的缓存键：学期列表变化时重新加载 */
export function comparisonKey(comparisons: SemesterComparisons): string {
  const previous = comparisons.previous === null ? "none" : String(comparisons.previous.id)
  const lastYear = comparisons.sameTermLastYear === null ? "none" : String(comparisons.sameTermLastYear.id)
  return `${previous}|${lastYear}|${comparisons.currentUnrecognized ? "unrecognized" : "recognized"}`
}
