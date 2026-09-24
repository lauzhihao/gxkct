import { buildDrilldownCourses, collectManagerValues, loadCourseOwners } from "@/modules/dashboard/data/course-owners"
import {
  fetchDepartmentMajorCards,
  fetchDepartmentTaskMajors,
  fetchDepartmentTasks,
  fetchMembers,
  fetchTree,
  type TaskStatDto,
} from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isTaskCompleted, pendingCourseCount, startOfToday } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, requireDepartment } from "@/modules/dashboard/data/org-index"
import { managerDisplayName, memberDisplayName, splitTeachers } from "@/modules/dashboard/data/teachers"
import type { DepartmentDashboardData, DepartmentTaskStatus, MajorStatus } from "@/modules/dashboard/types"

function resolveTaskStatus(task: TaskStatDto, today: number): DepartmentTaskStatus {
  if (isTaskCompleted(task.status)) return "completed"
  if (task.courseCount > 0 && pendingCourseCount(task) === 0) return "completed"
  if (task.endDate === null) return "pending"
  return classifyDeadline(task.endDate, today)
}

/** 院系层：本系组织树 + 本系课程负责人 + 专业负责人 + 本系成员 + 本系评估任务 */
export async function loadDepartmentDashboard(
  collegeId: number,
  departmentId: string,
  semesterId: number | null,
  now: Date,
): Promise<DepartmentDashboardData> {
  const [tree, managersByCourseId, majorCards, members, tasks] = await Promise.all([
    fetchTree(collegeId, semesterId),
    loadCourseOwners(collegeId, semesterId),
    fetchDepartmentMajorCards(departmentId, semesterId),
    fetchMembers(collegeId, departmentId, semesterId),
    fetchDepartmentTasks(departmentId, semesterId),
  ])
  const index = buildOrgIndex(tree)
  const department = requireDepartment(index, departmentId)
  const majors = index.majors.filter((major) => major.departmentId === departmentId)
  const majorIds = new Set(majors.map((major) => major.id))
  const departmentCourses = index.courses.filter((course) => majorIds.has(course.majorId))

  const taskMajorStats = await Promise.all(
    tasks.map((task) => fetchDepartmentTaskMajors(task.taskId, departmentId, semesterId)),
  )

  const courses = buildDrilldownCourses(index, departmentCourses, managersByCourseId)
  // 参与教师只看本系课程的负责人；负责人接口返回全校数据，这里按本系课程过滤
  const teachers = splitTeachers(members, collectManagerValues(departmentCourses, managersByCourseId))

  // 各专业评估完成情况按任务累加；没有出现在任何任务里的专业，参评门次为 0
  const evaluationByMajor = new Map<string, { completed: number; target: number }>()
  taskMajorStats.flat().forEach((stat) => {
    const current = evaluationByMajor.get(stat.scopeId)
    const base = current === undefined ? { completed: 0, target: 0 } : current
    evaluationByMajor.set(stat.scopeId, { completed: base.completed + stat.completedCount, target: base.target + stat.courseCount })
  })

  const majorStatuses: MajorStatus[] = majors.map((major) => {
    const leadCard = majorCards.find((card) => card.id === major.id)
    if (leadCard === undefined) {
      throw new Error(`Major ${major.id} missing from department major cards`)
    }
    const majorCourses = courses.filter((course) => course.majorId === major.id)
    const evaluation = evaluationByMajor.get(major.id)
    return {
      majorId: major.id,
      majorName: major.name,
      leadNames: leadCard.managers.map(managerDisplayName),
      courseCount: majorCourses.length,
      ownerMissingCount: majorCourses.filter((course) => course.ownerNames.length === 0).length,
      evaluationCompletedCount: evaluation === undefined ? 0 : evaluation.completed,
      evaluationTargetCount: evaluation === undefined ? 0 : evaluation.target,
    }
  })

  const today = startOfToday(now)
  return {
    overview: {
      departmentId: department.id,
      departmentName: department.name,
      courseTotal: courses.length,
      registeredTeacherCount: teachers.registered.length,
      participatingTeacherCount: teachers.participating.length,
    },
    majors: majorStatuses,
    courses,
    ownerMissingCourses: courses.filter((course) => course.ownerNames.length === 0),
    idleTeachers: teachers.idle.map((member) => ({
      id: member.id,
      teacherName: memberDisplayName(member),
      roleLabel: member.roleLabel,
    })),
    tasks: tasks.map((task) => ({
      id: task.taskId,
      title: task.title,
      deadline: task.endDate,
      status: resolveTaskStatus(task, today),
      completedCount: task.completedCount,
      targetCount: task.courseCount,
    })),
  }
}
