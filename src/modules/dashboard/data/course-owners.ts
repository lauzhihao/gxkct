import { fetchCourseOwners, type ManagerRef } from "@/modules/dashboard/data/dashboard-api"
import { requireDepartment, requireMajor, type OrgCourse, type OrgIndex } from "@/modules/dashboard/data/org-index"
import { managerDisplayName } from "@/modules/dashboard/data/teachers"
import type { DrilldownCourse, WarningSummary } from "@/modules/dashboard/types"

/** 全校可见课程的负责人（一次请求），按课程 ID 建索引 */
export async function loadCourseOwners(collegeId: number, semesterId: number | null): Promise<Map<string, ManagerRef[]>> {
  const owners = await fetchCourseOwners(collegeId, semesterId)
  return new Map(owners.map((item) => [item.courseId, item.managers]))
}

export function requireCourseManagers(managersByCourseId: ReadonlyMap<string, ManagerRef[]>, courseId: string): ManagerRef[] {
  const managers = managersByCourseId.get(courseId)
  if (managers === undefined) {
    // 负责人接口与组织树走同一次可见范围计算，缺课程说明两边口径不一致
    throw new Error(`Course ${courseId} missing from course owners`)
  }
  return managers
}

/** 范围内课程的全部负责人 value（邮箱，邮箱为空时为用户 ID） */
export function collectManagerValues(
  courses: readonly OrgCourse[],
  managersByCourseId: ReadonlyMap<string, ManagerRef[]>,
): Set<string> {
  const values = new Set<string>()
  courses.forEach((course) =>
    requireCourseManagers(managersByCourseId, course.id).forEach((manager) => values.add(manager.value)),
  )
  return values
}

export interface DrilldownCourseWithDepartment extends DrilldownCourse {
  departmentId: string
  majorId: string
}

export function buildDrilldownCourses(
  index: OrgIndex,
  courses: readonly OrgCourse[],
  managersByCourseId: ReadonlyMap<string, ManagerRef[]>,
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
      ownerNames: requireCourseManagers(managersByCourseId, course.id).map(managerDisplayName),
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
