import type {
  CreateSemesterTermType,
  BootstrapSemesterPayload,
  SemesterBrief,
} from "../../../../types/semester"

export const SEMESTER_MANAGEMENT_ALLOWED_USER_ID = 40

type RecognizedSemesterTerm = CreateSemesterTermType | "SUMMER"

type ParsedSchoolYear =
  | {
      kind: "calendar"
      year: number
    }
  | {
      kind: "academic-range"
      startYear: number
      endYear: number
    }

export interface SemesterBootstrapDraft extends BootstrapSemesterPayload {
  targetTermType: CreateSemesterTermType
  name: string
}

export function canViewSemesterManagement(userId: number | null): boolean {
  return userId === SEMESTER_MANAGEMENT_ALLOWED_USER_ID
}

export function canSetSemesterAsCurrent(semester: SemesterBrief): boolean {
  return semester.isCurrent !== true
}

function parseSchoolYear(value: string | number, semesterName: string): ParsedSchoolYear {
  // [MOD] 优先从名称中提取学年范围 (yyyy-yyyy)，因为这更符合用户的视觉预期
  const nameMatch = semesterName.match(/(\d{4})[-/](\d{4})/)
  if (nameMatch) {
    const startYear = Number.parseInt(nameMatch[1], 10)
    const endYear = Number.parseInt(nameMatch[2], 10)
    if (endYear === startYear + 1) {
      return {
        kind: "academic-range",
        startYear,
        endYear,
      }
    }
  }

  if (typeof value === "number" && Number.isInteger(value) && value >= 1000 && value <= 9999) {
    return {
      kind: "calendar",
      year: value,
    }
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim()
    if (/^\d{4}$/.test(trimmedValue)) {
      return {
        kind: "calendar",
        year: Number.parseInt(trimmedValue, 10),
      }
    }

    const academicYearMatch = trimmedValue.match(/^(\d{4})[-/](\d{4})$/)
    if (academicYearMatch) {
      const startYear = Number.parseInt(academicYearMatch[1], 10)
      const endYear = Number.parseInt(academicYearMatch[2], 10)
      if (endYear !== startYear + 1) {
        throw new Error(`无法识别学年: ${semesterName}`)
      }

      return {
        kind: "academic-range",
        startYear,
        endYear,
      }
    }
  }

  throw new Error(`无法识别学年: ${semesterName}`)
}

function parseSemesterTerm(semester: SemesterBrief): RecognizedSemesterTerm {
  const { termType, name } = semester

  if (typeof termType === "string") {
    const normalizedTerm = termType.trim().toUpperCase()
    if (normalizedTerm === "SPRING") {
      return "SPRING"
    }
    if (normalizedTerm === "AUTUMN" || normalizedTerm === "FALL") {
      return "AUTUMN"
    }
    if (normalizedTerm === "SUMMER") {
      return "SUMMER"
    }
  }

  throw new Error(`无法识别学期类型: ${name}`)
}

export function buildNextSemesterDraft(
  sourceSemester: SemesterBrief,
  existingSemesters: SemesterBrief[] = []
): SemesterBootstrapDraft {
  const currentSchoolYear = parseSchoolYear(sourceSemester.schoolYear, sourceSemester.name)
  const currentTerm = parseSemesterTerm(sourceSemester)

  if (currentTerm === "SUMMER") {
    throw new Error("暂不支持基于夏季学期创建下一学期")
  }

  // [MOD] 保持学期类型不变，年份递增，并根据现有列表自动去重
  const nextTerm: CreateSemesterTermType = currentTerm === "SPRING" ? "SPRING" : "AUTUMN"
  const nextTermLabel = nextTerm === "AUTUMN" ? "第一学期" : "第二学期"

  let nextYearOffset = 1
  let nextSemesterName = ""
  let nextSchoolYear = ""

  const existingNames = new Set(existingSemesters.map((s) => s.name))

  while (true) {
    if (currentSchoolYear.kind === "calendar") {
      const nextYear = currentSchoolYear.year + nextYearOffset
      nextSchoolYear = String(nextYear)
      nextSemesterName = `${nextSchoolYear}学年${nextTermLabel}`
    } else {
      const nextStartYear = currentSchoolYear.startYear + nextYearOffset
      const nextEndYear = currentSchoolYear.endYear + nextYearOffset
      nextSchoolYear = `${nextStartYear}-${nextEndYear}`
      nextSemesterName = `${nextSchoolYear}学年${nextTermLabel}`
    }

    if (!existingNames.has(nextSemesterName)) {
      break
    }
    nextYearOffset += 1
  }

  return {
    schoolYear: nextSchoolYear,
    targetTermType: nextTerm,
    name: nextSemesterName,
  }
}
