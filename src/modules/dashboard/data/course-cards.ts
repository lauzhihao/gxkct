import { DASHBOARD_REQUEST_CONCURRENCY, mapWithConcurrency } from "@/modules/dashboard/data/concurrency"
import { fetchMajorCourseCards, type CardDto } from "@/modules/dashboard/data/dashboard-api"
import { requireDepartment, requireMajor, type OrgCourse, type OrgIndex, type OrgMajor } from "@/modules/dashboard/data/org-index"
import { managerDisplayName } from "@/modules/dashboard/data/teachers"
import type { DrilldownCourse, WarningSummary } from "@/modules/dashboard/types"

/** 逐专业拉课程卡片（带负责人），按课程 ID 建索引 */
export async function loadCourseCards(majors: readonly OrgMajor[], semesterId: number | null): Promise<Map<string, CardDto>> {
  const lists = await mapWithConcurrency(majors, DASHBOARD_REQUEST_CONCURRENCY, (major) =>
    fetchMajorCourseCards(major.id, semesterId),
  )
  const byCourseId = new Map<string, CardDto>()
  lists.forEach((cards) => cards.forEach((card) => byCourseId.set(card.id, card)))
  return byCourseId
}

export function requireCourseCard(cardsByCourseId: ReadonlyMap<string, CardDto>, courseId: string): CardDto {
  const card = cardsByCourseId.get(courseId)
  if (card === undefined) {
    // 组织树与课程卡片走同一套权限与学期过滤，缺卡片说明两边口径不一致
    throw new Error(`Course ${courseId} missing from major course cards`)
  }
  return card
}

export interface DrilldownCourseWithDepartment extends DrilldownCourse {
  departmentId: string
  majorId: string
}

export function buildDrilldownCourses(
  index: OrgIndex,
  courses: readonly OrgCourse[],
  cardsByCourseId: ReadonlyMap<string, CardDto>,
): DrilldownCourseWithDepartment[] {
  return courses.map((course) => {
    const major = requireMajor(index, course.majorId)
    const department = requireDepartment(index, major.departmentId)
    return {
      id: course.id,
      courseName: course.name,
      majorId: major.id,
      majorName: major.name,
      departmentId: department.id,
      departmentName: department.name,
      ownerNames: requireCourseCard(cardsByCourseId, course.id).managers.map(managerDisplayName),
    }
  })
}

/** 按院系汇总计数，给出总量与最集中的院系（同数量按名称排序，结果稳定） */
export function summarizeByDepartment(entries: readonly { departmentName: string; count: number }[]): WarningSummary {
  const totals = new Map<string, number>()
  entries.forEach((entry) => {
    const current = totals.get(entry.departmentName)
    totals.set(entry.departmentName, (current === undefined ? 0 : current) + entry.count)
  })
  const ranked = [...totals.entries()]
    .filter(([, count]) => count > 0)
    .sort(([leftName, leftCount], [rightName, rightCount]) => {
      if (rightCount !== leftCount) return rightCount - leftCount
      return leftName.localeCompare(rightName, "zh-CN")
    })
  const count = entries.reduce((sum, entry) => sum + entry.count, 0)
  if (ranked.length === 0) {
    return { count, topDepartmentName: null, topDepartmentCount: 0 }
  }
  return { count, topDepartmentName: ranked[0][0], topDepartmentCount: ranked[0][1] }
}
