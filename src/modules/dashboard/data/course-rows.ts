import type { DrilldownCourseWithDepartment } from "@/modules/dashboard/data/course-owners"
import { requireCourseStatus, type CourseStatus } from "@/modules/dashboard/data/course-status"
import type { DepartmentRate } from "@/modules/dashboard/types"

/** 下钻课程与其建设概况 */
export interface CourseWithStatus {
  course: DrilldownCourseWithDepartment
  status: CourseStatus
}

export function attachStatuses(
  courses: readonly DrilldownCourseWithDepartment[],
  statuses: ReadonlyMap<string, CourseStatus>,
): CourseWithStatus[] {
  return courses.map((course) => ({ course, status: requireCourseStatus(statuses, course.id) }))
}

/** 院系达标率，同名院系合并；按达标率从高到低，同率按名称 */
export function rankDepartments(rows: readonly CourseWithStatus[]): DepartmentRate[] {
  const totals = new Map<string, { courseCount: number; qualifiedCount: number }>()
  rows.forEach(({ course, status }) => {
    const current = totals.get(course.departmentName)
    const base = current === undefined ? { courseCount: 0, qualifiedCount: 0 } : current
    totals.set(course.departmentName, {
      courseCount: base.courseCount + 1,
      qualifiedCount: base.qualifiedCount + (status.qualified ? 1 : 0),
    })
  })
  return [...totals.entries()]
    .map(([departmentName, total]) => ({ departmentName, ...total, rate: total.qualifiedCount / total.courseCount }))
    .sort((left, right) => {
      if (right.rate !== left.rate) return right.rate - left.rate
      return left.departmentName.localeCompare(right.departmentName, "zh-CN")
    })
}

/** 达标所缺的材料（大纲、教案、课件） */
export function missingMaterials(status: CourseStatus): string[] {
  return [
    status.hasSyllabus ? null : "大纲",
    status.hasLessonPlan ? null : "教案",
    status.hasCourseware ? null : "课件",
  ].filter((item): item is string => item !== null)
}
