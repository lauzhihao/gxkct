import { indexLastOperationDays, isIdle } from "@/modules/dashboard/data/activity"
import { buildDrilldownCourses, collectManagerValues, loadCourseOwners } from "@/modules/dashboard/data/course-owners"
import { attachStatuses, missingMaterials, rankDepartments, type CourseWithStatus } from "@/modules/dashboard/data/course-rows"
import { averageCompletion, countQualified, countStages, loadCourseStatuses } from "@/modules/dashboard/data/course-status"
import {
  fetchActivity,
  fetchDepartmentMajorCards,
  fetchDepartmentTaskMajors,
  fetchDepartmentTasks,
  fetchMembers,
  fetchTree,
  type MemberDto,
  type TaskStatDto,
} from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isTaskCompleted, pendingCourseCount, startOfToday } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, requireDepartment } from "@/modules/dashboard/data/org-index"
import type { SemesterComparisons } from "@/modules/dashboard/data/semesters"
import { isRegisteredTeacher, managerDisplayName, memberDisplayName, splitTeachers } from "@/modules/dashboard/data/teachers"
import { ratio } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type {
  DepartmentDashboardData,
  DepartmentTaskStatus,
  MajorStatus,
  SchoolComparison,
  SchoolRank,
} from "@/modules/dashboard/types"

function resolveTaskStatus(task: TaskStatDto, today: number): DepartmentTaskStatus {
  if (isTaskCompleted(task.status)) return "completed"
  if (task.courseCount > 0 && pendingCourseCount(task) === 0) return "completed"
  if (task.endDate === null) return "pending"
  return classifyDeadline(task.endDate, today)
}

function resourcesPerCourse(rows: readonly CourseWithStatus[]): number | null {
  return ratio(
    rows.reduce((sum, row) => sum + row.status.resourceCount, 0),
    rows.length,
  )
}

function qualifiedRate(rows: readonly CourseWithStatus[]): number | null {
  return ratio(countQualified(rows.map((row) => row.status)), rows.length)
}

interface SchoolScopeData {
  rows: CourseWithStatus[]
  registeredTeacherCount: number
  participatingTeacherCount: number
}

/** 全校排名：名次 = 1 + 达标率更高的院系数（同率同名次），院系同名合并 */
function rankInSchool(departmentName: string, schoolScope: SchoolScopeData | null): SchoolRank {
  if (schoolScope === null) return { kind: "na", reason: NA_REASONS.schoolScopeOnly }
  const ranking = rankDepartments(schoolScope.rows)
  const own = ranking.find((item) => item.departmentName === departmentName)
  if (own === undefined) return { kind: "na", reason: NA_REASONS.noCourses }
  return { kind: "value", rank: 1 + ranking.filter((item) => item.rate > own.rate).length, total: ranking.length }
}

function compareWithSchool(
  departmentRows: readonly CourseWithStatus[],
  participation: { registered: number; participating: number },
  schoolScope: SchoolScopeData | null,
): SchoolComparison {
  if (schoolScope === null) return { kind: "na", reason: NA_REASONS.schoolScopeOnly }
  return {
    kind: "value",
    rows: [
      {
        key: "qualified",
        label: "达标率",
        departmentValue: qualifiedRate(departmentRows),
        schoolValue: qualifiedRate(schoolScope.rows),
      },
      {
        key: "participation",
        label: "教师参与率",
        departmentValue: ratio(participation.participating, participation.registered),
        schoolValue: ratio(schoolScope.participatingTeacherCount, schoolScope.registeredTeacherCount),
      },
      {
        key: "resources",
        label: "课均资源数",
        departmentValue: resourcesPerCourse(departmentRows),
        schoolValue: resourcesPerCourse(schoolScope.rows),
      },
    ],
  }
}

/**
 * 院系层：本系组织树 + 本系课程负责人 + 专业负责人 + 本系成员 + 本系评估任务 + 课程建设概况 + 建设操作。
 * 校级账号看得到全校课程，额外给出全校排名与全校对比；院系账号只看得到本系，这两项说明原因。
 */
export async function loadDepartmentDashboard(
  collegeId: number,
  departmentId: string,
  semesterId: number | null,
  comparisons: SemesterComparisons,
  schoolScopeVisible: boolean,
  now: Date,
): Promise<DepartmentDashboardData> {
  const [tree, managersByCourseId, majorCards, members, tasks, statusSet, activity, schoolMembers] = await Promise.all([
    fetchTree(collegeId, semesterId),
    loadCourseOwners(collegeId, semesterId),
    fetchDepartmentMajorCards(departmentId, semesterId),
    fetchMembers(collegeId, departmentId, semesterId),
    fetchDepartmentTasks(departmentId, semesterId),
    loadCourseStatuses(collegeId, semesterId, comparisons.previous),
    fetchActivity(collegeId, semesterId),
    schoolScopeVisible ? fetchMembers(collegeId, null, semesterId) : Promise.resolve<MemberDto[] | null>(null),
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
  const rows = attachStatuses(courses, statusSet.statuses)
  const statuses = rows.map((row) => row.status)
  // 参与教师只看本系课程的负责人；负责人接口返回全校数据，这里按本系课程过滤
  const teachers = splitTeachers(members, collectManagerValues(departmentCourses, managersByCourseId))

  let schoolScope: SchoolScopeData | null = null
  if (schoolMembers !== null) {
    const schoolTeachers = splitTeachers(schoolMembers, collectManagerValues(index.courses, managersByCourseId))
    schoolScope = {
      rows: attachStatuses(buildDrilldownCourses(index, index.courses, managersByCourseId), statusSet.statuses),
      registeredTeacherCount: schoolTeachers.registered.length,
      participatingTeacherCount: schoolTeachers.participating.length,
    }
  }

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
    const majorRows = rows.filter((row) => row.course.majorId === major.id)
    const majorStatusList = majorRows.map((row) => row.status)
    const evaluation = evaluationByMajor.get(major.id)
    return {
      majorId: major.id,
      majorName: major.name,
      leadNames: leadCard.managers.map(managerDisplayName),
      courseCount: majorRows.length,
      ownerMissingCount: majorRows.filter((row) => row.course.ownerNames.length === 0).length,
      evaluationCompletedCount: evaluation === undefined ? 0 : evaluation.completed,
      evaluationTargetCount: evaluation === undefined ? 0 : evaluation.target,
      stageCounts: countStages(majorStatusList),
      completion: averageCompletion(majorStatusList),
      qualifiedCount: countQualified(majorStatusList),
    }
  })

  const stageCounts = countStages(statuses)
  const today = startOfToday(now)
  const lastOperationDays = indexLastOperationDays(activity.lastOperations)
  const taskTitles = new Map(tasks.map((task) => [task.taskId, task.title]))
  const pick = (predicate: (row: CourseWithStatus) => boolean) => rows.filter(predicate).map((row) => row.course)

  return {
    overview: {
      departmentId: department.id,
      departmentName: department.name,
      courseTotal: courses.length,
      registeredTeacherCount: teachers.registered.length,
      participatingTeacherCount: teachers.participating.length,
      buildingCount: stageCounts.building,
      notStartedCount: stageCounts.notStarted,
      qualifiedCount: countQualified(statuses),
      schoolRank: rankInSchool(department.name, schoolScope),
    },
    majors: majorStatuses,
    courses,
    ownerMissingCourses: courses.filter((course) => course.ownerNames.length === 0),
    breakpoints: {
      noSyllabus: pick((row) => !row.status.hasSyllabus),
      noLessonPlanOrCourseware: pick((row) => !row.status.hasLessonPlan || !row.status.hasCourseware),
      noResource: pick((row) => row.status.resourceCount === 0),
    },
    comparison: compareWithSchool(
      rows,
      { registered: teachers.registered.length, participating: teachers.participating.length },
      schoolScope,
    ),
    unqualifiedCourses: rows
      .filter((row) => !row.status.qualified)
      .map((row) => ({
        id: row.course.id,
        courseName: row.course.courseName,
        majorName: row.course.majorName,
        missingMaterials: missingMaterials(row.status),
      })),
    rectifyCourses: rows.flatMap((row) => {
      const evaluation = row.status.latestEvaluation
      if (evaluation === null || evaluation.passed) return []
      const title = taskTitles.get(evaluation.taskId)
      return [
        {
          id: row.course.id,
          courseName: row.course.courseName,
          majorName: row.course.majorName,
          taskTitle: title === undefined ? null : title,
          rate: evaluation.rate,
        },
      ]
    }),
    // 零建设教师：本系在册教师中近 60 天没有课程建设操作的人
    idleTeachers: members
      .filter(isRegisteredTeacher)
      .map((member) => {
        const lastDay = lastOperationDays.get(member.id)
        return {
          id: member.id,
          teacherName: memberDisplayName(member),
          roleLabel: member.roleLabel,
          lastOperatedDay: lastDay === undefined ? null : lastDay,
        }
      })
      .filter((teacher) => isIdle(teacher.lastOperatedDay, today)),
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
