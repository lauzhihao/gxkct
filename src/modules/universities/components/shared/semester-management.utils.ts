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
  return semester.isCurrent !== true && semester.status === "READY"
}

function parseSchoolYear(value: string | number, semesterName: string): ParsedSchoolYear {
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

export function buildNextSemesterDraft(sourceSemester: SemesterBrief): SemesterBootstrapDraft {
  const currentSchoolYear = parseSchoolYear(sourceSemester.schoolYear, sourceSemester.name)
  const currentTerm = parseSemesterTerm(sourceSemester)

  if (currentTerm === "SUMMER") {
    throw new Error("暂不支持基于夏季学期创建下一学期")
  }

  const nextTerm: CreateSemesterTermType = currentTerm === "SPRING" ? "AUTUMN" : "SPRING"

  let nextSchoolYear: string
  if (currentSchoolYear.kind === "calendar") {
    const nextYear = currentTerm === "AUTUMN" ? currentSchoolYear.year + 1 : currentSchoolYear.year
    nextSchoolYear = String(nextYear)
  } else {
    const nextStartYear = currentTerm === "SPRING"
      ? currentSchoolYear.startYear + 1
      : currentSchoolYear.startYear
    const nextEndYear = currentTerm === "SPRING"
      ? currentSchoolYear.endYear + 1
      : currentSchoolYear.endYear
    nextSchoolYear = `${nextStartYear}-${nextEndYear}`
  }

  const usesAcademicSemesterName = sourceSemester.name.includes("第一学期") || sourceSemester.name.includes("第二学期")
  const nextTermLabel = nextTerm === "SPRING" ? "春季学期" : "秋季学期"
  const nextSemesterName = usesAcademicSemesterName
    ? `${nextSchoolYear}学年${nextTerm === "AUTUMN" ? "第一学期" : "第二学期"}`
    : currentSchoolYear.kind === "academic-range"
      ? `${nextSchoolYear}学年${nextTermLabel}`
      : `${nextSchoolYear}年${nextTermLabel}`

  return {
    schoolYear: nextSchoolYear,
    targetTermType: nextTerm,
    name: nextSemesterName,
  }
}
