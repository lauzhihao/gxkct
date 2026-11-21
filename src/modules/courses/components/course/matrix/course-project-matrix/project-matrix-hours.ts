import type {
  ProjectMatrixData,
  ProjectMatrixItem,
  ProjectMatrixProject,
} from "@/modules/courses/hooks/use-project-matrix"

interface ExactDecimal {
  scaled: bigint
  scale: number
}

const ZERO: ExactDecimal = { scaled: BigInt(0), scale: 0 }

export interface ProjectHourSummary {
  theoryAllocated: string
  practiceAllocated: string
  totalAllocated: string
  theoryMatrix: string
  practiceMatrix: string
  totalMatrix: string
  detail: string | null
}

export function summarizeProjectHours(
  project: ProjectMatrixProject,
  rows: readonly ProjectMatrixItem[],
): ProjectHourSummary {
  const projectName = projectLabel(project)
  const theoryAllocated = parseAllocatedHour(project.theoryPeriod, projectName, "理论学时")
  const practiceAllocated = parseAllocatedHour(project.practicePeriod, projectName, "实践学时")
  const allocationProblems = [theoryAllocated, practiceAllocated].flatMap((parsed) =>
    parsed.kind === "invalid" ? [parsed.message] : [],
  )
  const rowProblems: string[] = []
  let theoryMatrix = ZERO
  let practiceMatrix = ZERO
  rows.forEach((row) => {
    const pointName = pointLabel(row)
    const theory = parseMatrixHour(row.courseMatrix?.theoryPeriod, projectName, pointName, "理论学时")
    const practice = parseMatrixHour(row.courseMatrix?.practicePeriod, projectName, pointName, "实践学时")
    if (theory.kind === "invalid") rowProblems.push(theory.message)
    if (practice.kind === "invalid") rowProblems.push(practice.message)
    if (theory.kind === "value" && practice.kind === "value" && rowProblems.length === 0) {
      theoryMatrix = addDecimal(theoryMatrix, theory.value)
      practiceMatrix = addDecimal(practiceMatrix, practice.value)
    }
  })

  const allocatedText = allocationProblems.length === 0 && theoryAllocated.kind === "value" && practiceAllocated.kind === "value"
    ? {
        theory: formatAmount(theoryAllocated.value),
        practice: formatAmount(practiceAllocated.value),
        total: formatAmount(addDecimal(theoryAllocated.value, practiceAllocated.value)),
      }
    : { theory: "—", practice: "—", total: "—" }
  const matrixText = rowProblems.length > 0
    ? { theory: "—", practice: "—", total: "—" }
    : {
        theory: formatAmount(theoryMatrix),
        practice: formatAmount(practiceMatrix),
        total: formatAmount(addDecimal(theoryMatrix, practiceMatrix)),
      }

  if (rows.length === 0 || rowProblems.length > 0 || theoryAllocated.kind !== "value" || practiceAllocated.kind !== "value") {
    const detail = rows.length === 0
      ? null
      : rowProblems.length > 0
        ? joinHourMessages(rowProblems)
        : allocationProblems.length > 0
          ? joinHourMessages(allocationProblems)
          : null
    return {
      theoryAllocated: allocatedText.theory,
      practiceAllocated: allocatedText.practice,
      totalAllocated: allocatedText.total,
      theoryMatrix: matrixText.theory,
      practiceMatrix: matrixText.practice,
      totalMatrix: matrixText.total,
      detail,
    }
  }

  return {
    theoryAllocated: allocatedText.theory,
    practiceAllocated: allocatedText.practice,
    totalAllocated: allocatedText.total,
    theoryMatrix: matrixText.theory,
    practiceMatrix: matrixText.practice,
    totalMatrix: matrixText.total,
    detail: mismatchMessage(
      projectName,
      theoryMatrix,
      theoryAllocated.value,
      practiceMatrix,
      practiceAllocated.value,
    ),
  }
}

export function collectProjectMatrixHourMismatch(data: ProjectMatrixData | null): string | null {
  const rows = data?.data
  if (!rows || rows.length === 0) {
    return null
  }

  let courseId: number | null = null
  for (const row of rows) {
    if (!row?.courseMatrix) {
      return "项目矩阵行缺少课程矩阵，无法核对学时。"
    }
    if (row.courseMatrix.courseUnitId == null) {
      return "项目矩阵行缺少课程，无法核对学时。"
    }
    if (courseId == null) {
      courseId = row.courseMatrix.courseUnitId
    } else if (courseId !== row.courseMatrix.courseUnitId) {
      return "项目矩阵包含多个课程，无法核对学时。"
    }
    if (row.courseMatrix.projectId == null) {
      return "项目矩阵行缺少项目，无法核对学时。"
    }
  }

  const projects = data?.projects ?? []
  const grouped = new Map<number, ProjectMatrixItem[]>()
  const invalid: string[] = []
  rows.forEach((row) => {
    const projectId = row.courseMatrix.projectId
    const current = grouped.get(projectId) ?? []
    current.push(row)
    grouped.set(projectId, current)
    const project = projects.find((item) => item.project?.id === projectId)?.project
    const projectName = project ? projectLabel(project) : String(projectId)
    const pointName = pointLabel(row)
    const theory = parseMatrixHour(row.courseMatrix?.theoryPeriod, projectName, pointName, "理论学时")
    const practice = parseMatrixHour(row.courseMatrix?.practicePeriod, projectName, pointName, "实践学时")
    if (theory.kind === "invalid") invalid.push(theory.message)
    if (practice.kind === "invalid") invalid.push(practice.message)
  })
  if (invalid.length > 0) {
    return joinHourMessages(invalid)
  }

  const problems: string[] = []
  const compared = new Set<number>()
  projects.forEach((item) => {
    const projectId = item.project?.id
    if (projectId == null || !grouped.has(projectId) || compared.has(projectId)) {
      return
    }
    compared.add(projectId)
    const summary = summarizeProjectHours(item.project, grouped.get(projectId) ?? [])
    if (summary.detail) {
      problems.push(stripTrailingPeriod(summary.detail))
    }
  })
  grouped.forEach((_projectRows, projectId) => {
    if (!compared.has(projectId)) {
      problems.push(`项目「${projectId}」不在当前课程的章节分配里`)
    }
  })
  if (problems.length === 0) {
    return null
  }
  return joinHourMessages(problems)
}

function stripTrailingPeriod(message: string): string {
  return message.endsWith("。") ? message.slice(0, -1) : message
}

type ParsedHour =
  | { kind: "value"; value: ExactDecimal }
  | { kind: "invalid"; message: string }

function parseMatrixHour(
  raw: string | null | undefined,
  projectName: string,
  pointName: string,
  side: string,
): ParsedHour {
  const parsed = parseDecimal(raw)
  if (parsed.kind === "value") {
    return parsed
  }
  const reason = parsed.reason === "negative" ? "不能为负数" : "不是有效数字"
  return {
    kind: "invalid",
    message: `项目「${projectName}」课点「${pointName}」${side}${reason}`,
  }
}

function parseAllocatedHour(raw: string | null | undefined, projectName: string, side: string): ParsedHour {
  const parsed = parseDecimal(raw)
  if (parsed.kind === "value") {
    return parsed
  }
  const reason = parsed.reason === "negative" ? "不能为负数" : "不是有效数字"
  return {
    kind: "invalid",
    message: `项目「${projectName}」章节分配的${side}${reason}`,
  }
}

function parseDecimal(raw: string | null | undefined): { kind: "value"; value: ExactDecimal } | { kind: "invalid"; reason: "negative" | "nan" } {
  if (raw == null || raw.trim() === "") {
    return { kind: "value", value: ZERO }
  }
  const text = raw.trim()
  if (/^-\d+(?:\.\d+)?$/.test(text) || /^-\.\d+$/.test(text)) {
    return { kind: "invalid", reason: "negative" }
  }
  const wholeMatch = text.match(/^(\d+)(?:\.(\d+))?$/)
  const fractionMatch = wholeMatch ? null : text.match(/^\.(\d+)$/)
  if (!wholeMatch && !fractionMatch) {
    return { kind: "invalid", reason: "nan" }
  }
  const whole = wholeMatch ? wholeMatch[1] : "0"
  const fraction = wholeMatch ? wholeMatch[2] ?? "" : fractionMatch?.[1] ?? ""
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, "")
  const scaled = BigInt(digits.length === 0 ? "0" : digits)
  return { kind: "value", value: { scaled, scale: fraction.length } }
}

function addDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale)
  return { scaled: rescale(left, scale) + rescale(right, scale), scale }
}

function rescale(value: ExactDecimal, scale: number): bigint {
  let scaled = value.scaled
  for (let current = value.scale; current < scale; current += 1) {
    scaled *= BigInt(10)
  }
  return scaled
}

function formatAmount(value: ExactDecimal): string {
  if (value.scale === 0) {
    return value.scaled.toString()
  }
  const digits = value.scaled.toString().padStart(value.scale + 1, "0")
  const whole = digits.slice(0, digits.length - value.scale)
  const fraction = digits.slice(digits.length - value.scale).replace(/0+$/, "")
  return fraction.length === 0 ? whole : `${whole}.${fraction}`
}

function compareDecimal(left: ExactDecimal, right: ExactDecimal): number {
  const scale = Math.max(left.scale, right.scale)
  const leftScaled = rescale(left, scale)
  const rightScaled = rescale(right, scale)
  if (leftScaled === rightScaled) return 0
  return leftScaled > rightScaled ? 1 : -1
}

function mismatchMessage(
  projectName: string,
  theoryMatrix: ExactDecimal,
  theoryAllocated: ExactDecimal,
  practiceMatrix: ExactDecimal,
  practiceAllocated: ExactDecimal,
): string | null {
  const theory = sideMismatch("理论学时", theoryMatrix, theoryAllocated)
  const practice = sideMismatch("实践学时", practiceMatrix, practiceAllocated)
  if (!theory && !practice) {
    return null
  }
  return `项目「${projectName}」${[theory, practice].filter(Boolean).join("。")}。`
}

function sideMismatch(side: string, matrix: ExactDecimal, allocated: ExactDecimal): string | null {
  const compared = compareDecimal(matrix, allocated)
  if (compared === 0) {
    return null
  }
  const direction = compared > 0 ? "多" : "少"
  const diff = compared > 0 ? subtractDecimal(matrix, allocated) : subtractDecimal(allocated, matrix)
  return `${side}不一致：矩阵合计 ${formatAmount(matrix)}，章节分配 ${formatAmount(allocated)}，${direction} ${formatAmount(diff)}`
}

function subtractDecimal(left: ExactDecimal, right: ExactDecimal): ExactDecimal {
  const scale = Math.max(left.scale, right.scale)
  return { scaled: rescale(left, scale) - rescale(right, scale), scale }
}

function joinHourMessages(messages: readonly string[]): string {
  return `${messages.join("。")}。`
}

function projectLabel(project: ProjectMatrixProject): string {
  const name = project.name?.trim()
  if (name) return name
  return String(project.id)
}

function pointLabel(row: ProjectMatrixItem): string {
  const title = row.courseMatrix?.point?.title?.trim()
  if (title) return title
  return "未命名课点"
}
