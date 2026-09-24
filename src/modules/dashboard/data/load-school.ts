import { buildDrilldownCourses, loadCourseCards, summarizeByDepartment } from "@/modules/dashboard/data/course-cards"
import { fetchCollegeTaskDepartments, fetchCollegeTasks, fetchMembers, fetchTree } from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isTaskCompleted, pendingCourseCount, startOfToday } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, countDistinctNames } from "@/modules/dashboard/data/org-index"
import { collectManagerValues, splitTeachers } from "@/modules/dashboard/data/teachers"
import type { SchoolDashboardData } from "@/modules/dashboard/types"

/** 校级大盘：组织树 + 各专业课程负责人 + 全校成员 + 本学期评估统计 */
export async function loadSchoolDashboard(collegeId: number, semesterId: number | null, now: Date): Promise<SchoolDashboardData> {
  const index = buildOrgIndex(await fetchTree(collegeId, semesterId))
  const [cardsByCourseId, members, tasks] = await Promise.all([
    loadCourseCards(index.majors, semesterId),
    fetchMembers(collegeId, null, semesterId),
    fetchCollegeTasks(collegeId, semesterId),
  ])

  const courses = buildDrilldownCourses(index, index.courses, cardsByCourseId)
  const ownerMissingCourses = courses.filter((course) => course.ownerNames.length === 0)
  const teachers = splitTeachers(members, collectManagerValues([...cardsByCourseId.values()]))

  // 临期评估：未结束、30 天内到期、仍有课程未完成评估的任务；再按院系拆分找出最集中的院系
  const today = startOfToday(now)
  const dueTasks = tasks.filter(
    (task) =>
      !isTaskCompleted(task.status) &&
      task.endDate !== null &&
      classifyDeadline(task.endDate, today) === "dueSoon" &&
      pendingCourseCount(task) > 0,
  )
  const dueByDepartment = await Promise.all(
    dueTasks.map((task) => fetchCollegeTaskDepartments(task.taskId, collegeId, semesterId)),
  )
  const dueSummary = summarizeByDepartment(
    dueByDepartment.flat().map((stat) => ({ departmentName: stat.scopeName, count: pendingCourseCount(stat) })),
  )

  return {
    overview: {
      departmentCount: countDistinctNames(index.departments),
      majorCount: countDistinctNames(index.majors),
      courseTotal: courses.length,
      registeredTeacherCount: teachers.registered.length,
      participatingTeacherCount: teachers.participating.length,
      evaluationCompletedCount: tasks.reduce((sum, task) => sum + task.completedCount, 0),
      evaluationTargetCount: tasks.reduce((sum, task) => sum + task.courseCount, 0),
    },
    courses,
    ownerMissing: summarizeByDepartment(
      ownerMissingCourses.map((course) => ({ departmentName: course.departmentName, count: 1 })),
    ),
    ownerMissingCourses,
    evaluationDueSoon: {
      count: dueTasks.reduce((sum, task) => sum + pendingCourseCount(task), 0),
      topDepartmentName: dueSummary.topDepartmentName,
      topDepartmentCount: dueSummary.topDepartmentCount,
    },
  }
}
