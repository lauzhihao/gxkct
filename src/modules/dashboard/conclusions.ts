import { formatPercent } from "@/modules/dashboard/format"
import type { DepartmentDashboardData, SchoolDashboardData, SchoolWarningKind } from "@/modules/dashboard/types"

function describeChange(deltaPp: number): string {
  if (deltaPp > 0) return `提升 ${deltaPp.toFixed(1)} 个百分点`
  if (deltaPp < 0) return `下降 ${Math.abs(deltaPp).toFixed(1)} 个百分点`
  return "持平"
}

function requireWarning(data: SchoolDashboardData, kind: SchoolWarningKind) {
  const warning = data.warnings.find((item) => item.kind === kind)
  if (!warning) {
    throw new Error(`School warning missing: ${kind}`)
  }
  return warning
}

/** 校级一句话结论：达标率变化 + 末位院系 + 负责人空缺最多的院系 + 逾期整改最多的院系 */
export function buildSchoolConclusion(data: SchoolDashboardData): string {
  const { overview, departmentRanking } = data
  if (departmentRanking.length === 0) {
    throw new Error("Department ranking is empty")
  }
  const lowest = departmentRanking[departmentRanking.length - 1]
  const ownerMissing = requireWarning(data, "ownerMissing")
  const overdue = requireWarning(data, "overdueRectification")

  return (
    `本学期达标率 ${formatPercent(overview.qualifiedRate)}，较上学期${describeChange(overview.qualifiedRateDeltaPp)}；` +
    `质量评估通过率 ${formatPercent(overview.evaluationPassRate)}。` +
    `需重点关注：${lowest.departmentName}达标率 ${formatPercent(lowest.qualifiedRate)}，居全校末位；` +
    `${ownerMissing.topDepartmentName}负责人空缺最多（${ownerMissing.topDepartmentCount} 门）；` +
    `${overdue.topDepartmentName}逾期未整改 ${overdue.topDepartmentCount} 门。建议优先推动负责人认领与逾期整改。`
  )
}

/** 院系一句话结论：本系与全校对比 + 落后专业 + 最集中的建设断点 */
export function buildDepartmentConclusion(data: DepartmentDashboardData, lagging: string[], topBreakpointLabel: string): string {
  const { overview } = data
  const laggingText = lagging.length > 0 ? `${lagging.join("、")}进度落后，` : ""
  return (
    `${overview.departmentName}达标率 ${formatPercent(overview.qualifiedRate)}，` +
    `全校排名第 ${overview.schoolRank}/${overview.departmentCount}；` +
    `${laggingText}未达标课程主要卡在"${topBreakpointLabel}"，建议按专业逐门催办。`
  )
}
