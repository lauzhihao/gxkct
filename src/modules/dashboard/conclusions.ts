import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import type { DepartmentDashboardData, SchoolDashboardData } from "@/modules/dashboard/types"

/** 校级一句话结论：总量与达标 + 负责人空缺最集中的院系 + 临期评估 + 待整改 */
export function buildSchoolConclusion(data: SchoolDashboardData): string {
  const { overview, ownerMissing, evaluationDueSoon } = data
  const qualifiedRate = ratio(overview.qualifiedCount, overview.courseTotal)
  const parts = [
    `本学期共 ${formatCount(overview.courseTotal)} 门课程，分布在 ${overview.majorCount} 个专业、${overview.departmentCount} 个院系`,
  ]
  if (qualifiedRate !== null) {
    parts.push(`大纲、教案、课件齐备的课程 ${formatCount(overview.qualifiedCount)} 门，达标率 ${formatPercent(qualifiedRate)}`)
  }

  if (ownerMissing.topDepartmentName !== null) {
    parts.push(
      `负责人未设置 ${formatCount(ownerMissing.count)} 门，${ownerMissing.topDepartmentName}空缺最多（${ownerMissing.topDepartmentCount} 门），建议重点跟进`,
    )
  } else {
    parts.push("所有课程均已设置负责人")
  }

  if (evaluationDueSoon.topDepartmentName !== null) {
    parts.push(
      `30 天内有 ${formatCount(evaluationDueSoon.count)} 门次评估临期，${evaluationDueSoon.topDepartmentName}最多（${evaluationDueSoon.topDepartmentCount} 门次）`,
    )
  } else {
    parts.push("近 30 天没有临期评估")
  }

  if (overview.rectifyCount > 0) {
    parts.push(`最近一次学校评价未达合格线、待整改 ${formatCount(overview.rectifyCount)} 门`)
  }

  return `${parts.join("；")}。`
}

/** 院系一句话结论：课程量与建设阶段 + 达标率 + 负责人空缺最多的专业 + 教师参与率 */
export function buildDepartmentConclusion(data: DepartmentDashboardData): string {
  const { overview, majors } = data
  const participation = ratio(overview.participatingTeacherCount, overview.registeredTeacherCount)
  const worstMajor = [...majors]
    .filter((major) => major.ownerMissingCount > 0)
    .sort((left, right) => right.ownerMissingCount - left.ownerMissingCount)[0]

  const ownerText =
    worstMajor === undefined
      ? "所有课程均已设置负责人"
      : `负责人未设置 ${data.ownerMissingCourses.length} 门，${worstMajor.majorName}最多（${worstMajor.ownerMissingCount} 门）`
  const participationText = participation === null ? "没有在册教师" : `教师参与率 ${formatPercent(participation)}`

  const qualifiedRate = ratio(overview.qualifiedCount, overview.courseTotal)
  const qualifiedText = qualifiedRate === null ? "没有课程" : `达标率 ${formatPercent(qualifiedRate)}`

  return `${overview.departmentName}本学期课程 ${formatCount(overview.courseTotal)} 门，在建 ${formatCount(overview.buildingCount)} 门、待建 ${formatCount(overview.notStartedCount)} 门，${qualifiedText}；${ownerText}；${participationText}。`
}
