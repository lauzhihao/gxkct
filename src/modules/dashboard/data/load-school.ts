import { toRecentOperations } from "@/modules/dashboard/data/activity"
import { attachStatuses, rankDepartments, type CourseWithStatus } from "@/modules/dashboard/data/course-rows"
import {
  buildDrilldownCourses,
  collectManagerValues,
  loadCourseOwners,
  summarizeByDepartment,
  type DrilldownCourseWithDepartment,
} from "@/modules/dashboard/data/course-owners"
import {
  countQualified,
  countStages,
  loadCourseStatuses,
  passRate,
  requireCourseStatus,
  type CourseStatus,
  type CourseStatusSet,
} from "@/modules/dashboard/data/course-status"
import {
  fetchActivity,
  fetchCollegeTaskDepartments,
  fetchCollegeTasks,
  fetchMembers,
  fetchTree,
  type TaskStatDto,
} from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isTaskCompleted, pendingCourseCount, startOfToday } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, countDistinctNames, type OrgIndex } from "@/modules/dashboard/data/org-index"
import type { OrderedSemester, SemesterComparisons } from "@/modules/dashboard/data/semesters"
import { splitTeachers } from "@/modules/dashboard/data/teachers"
import { isStale } from "@/modules/dashboard/data/update-time"
import { ratio } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { Comparison, ResourceCategory, SchoolDashboardData, TaskPassRate } from "@/modules/dashboard/types"

const RESOURCE_CATEGORY_ORDER: ResourceCategory[] = ["document", "video", "questionBank", "other"]

/** 对比学期及其组织树（当前用户权限内） */
interface ComparedSemester {
  semester: OrderedSemester
  index: OrgIndex
}

async function loadComparedSemester(collegeId: number, semester: OrderedSemester | null): Promise<ComparedSemester | null> {
  if (semester === null) return null
  return { semester, index: buildOrgIndex(await fetchTree(collegeId, semester.id)) }
}

/** 院系建档覆盖率：有课程的院系 / 全部院系，院系同名计一次 */
function archiveCoverage(index: OrgIndex): number | null {
  const departmentIdsWithCourses = new Set(
    index.courses.map((course) => {
      const major = index.majorById.get(course.majorId)
      if (major === undefined) throw new Error(`Major ${course.majorId} missing from tree`)
      return major.departmentId
    }),
  )
  const coveredNames = new Set(
    index.departments.filter((department) => departmentIdsWithCourses.has(department.id)).map((department) => department.name.trim()),
  )
  return ratio(coveredNames.size, countDistinctNames(index.departments))
}

function countNewCourses(rows: readonly CourseWithStatus[], previous: OrderedSemester | null): Comparison {
  if (previous === null) return { kind: "na", reason: NA_REASONS.noPreviousSemester }
  return {
    kind: "value",
    value: rows.filter(({ status }) => status.lineageInBaseSemester === false).length,
    semesterName: previous.name,
  }
}

function compareCourseTotal(courseTotal: number, lastYear: ComparedSemester | null): Comparison {
  if (lastYear === null) return { kind: "na", reason: NA_REASONS.noLastYearSemester }
  const change = ratio(courseTotal - lastYear.index.courses.length, lastYear.index.courses.length)
  if (change === null) return { kind: "na", reason: NA_REASONS.lastYearEmpty }
  return { kind: "value", value: change, semesterName: lastYear.semester.name }
}

/**
 * 较上学期的达标率变化。课程资源挂在课程记录上、不按学期保存：
 * 两个学期只要共用课程记录，上学期的"达标"就是现在的状态，比较没有意义，直接说明原因。
 */
async function compareQualifiedRate(
  collegeId: number,
  currentCourseIds: ReadonlySet<string>,
  currentRate: number | null,
  previous: ComparedSemester | null,
): Promise<Comparison> {
  if (previous === null) return { kind: "na", reason: NA_REASONS.noPreviousSemester }
  if (currentRate === null) return { kind: "na", reason: NA_REASONS.noCourses }
  const previousCourses = previous.index.courses
  if (previousCourses.length === 0) return { kind: "na", reason: NA_REASONS.previousEmpty }
  if (previousCourses.some((course) => currentCourseIds.has(course.id))) {
    return { kind: "na", reason: NA_REASONS.sharedCourseRecords }
  }
  const previousSet = await loadCourseStatuses(collegeId, previous.semester.id, null)
  const previousStatuses = previousCourses.map((course) => requireCourseStatus(previousSet.statuses, course.id))
  const previousRate = countQualified(previousStatuses) / previousStatuses.length
  return { kind: "value", value: currentRate - previousRate, semesterName: previous.semester.name }
}

/** 按评估任务统计：本学期课程在该任务中已有学校评价的门数与合格门数；没有已评课程的任务不列出 */
function passRatesByTask(tasks: readonly TaskStatDto[], statusSet: CourseStatusSet, courseIds: ReadonlySet<string>): TaskPassRate[] {
  return [...tasks]
    .sort((left, right) => {
      if (left.endDate !== right.endDate) {
        if (left.endDate === null) return 1
        if (right.endDate === null) return -1
        return left.endDate < right.endDate ? -1 : 1
      }
      return Number(left.taskId) - Number(right.taskId)
    })
    .map((task) => {
      const results = statusSet.evaluations.filter(
        (entry) => entry.result.taskId === task.taskId && courseIds.has(entry.courseId),
      )
      return {
        taskId: task.taskId,
        title: task.title,
        endDate: task.endDate,
        scoredCount: results.length,
        passedCount: results.filter((entry) => entry.result.passed).length,
      }
    })
    .filter((task) => task.scoredCount > 0)
}

/** 校级大盘：组织树 + 全校课程负责人 + 全校成员 + 本学期评估 + 课程建设概况 + 建设操作 + 对比学期 */
export async function loadSchoolDashboard(
  collegeId: number,
  semesterId: number | null,
  comparisons: SemesterComparisons,
  now: Date,
): Promise<SchoolDashboardData> {
  // 第一轮全部并行；上一学期与去年同学期可能是同一个学期，组织树请求按地址缓存，只发一次
  const [tree, managersByCourseId, members, tasks, statusSet, activity, previous, lastYear] = await Promise.all([
    fetchTree(collegeId, semesterId),
    loadCourseOwners(collegeId, semesterId),
    fetchMembers(collegeId, null, semesterId),
    fetchCollegeTasks(collegeId, semesterId),
    loadCourseStatuses(collegeId, semesterId, comparisons.previous),
    fetchActivity(collegeId, semesterId),
    loadComparedSemester(collegeId, comparisons.previous),
    loadComparedSemester(collegeId, comparisons.sameTermLastYear),
  ])
  const index = buildOrgIndex(tree)

  const courses = buildDrilldownCourses(index, index.courses, managersByCourseId)
  const rows = attachStatuses(courses, statusSet.statuses)
  const statuses = rows.map((row) => row.status)
  const courseIds = new Set(courses.map((course) => course.id))
  const ownerMissingCourses = courses.filter((course) => course.ownerNames.length === 0)
  const teachers = splitTeachers(members, collectManagerValues(index.courses, managersByCourseId))
  const qualifiedCount = countQualified(statuses)
  const qualifiedRate = ratio(qualifiedCount, statuses.length)

  // 临期评估：未结束、30 天内到期、仍有课程未完成评估的任务；再按院系拆分找出最集中的院系
  const today = startOfToday(now)
  const dueTasks = tasks.filter(
    (task) =>
      !isTaskCompleted(task.status) &&
      task.endDate !== null &&
      classifyDeadline(task.endDate, today) === "dueSoon" &&
      pendingCourseCount(task) > 0,
  )
  const [dueByDepartment, qualifiedRateChange] = await Promise.all([
    Promise.all(dueTasks.map((task) => fetchCollegeTaskDepartments(task.taskId, collegeId, semesterId))),
    compareQualifiedRate(collegeId, courseIds, qualifiedRate, previous),
  ])
  const dueSummary = summarizeByDepartment(
    dueByDepartment.flat().map((stat) => ({ departmentName: stat.scopeName, count: pendingCourseCount(stat) })),
  )

  const pick = (predicate: (status: CourseStatus) => boolean) =>
    rows.filter(({ status }) => predicate(status)).map(({ course }) => course)
  const staleCourses = pick((status) => status.updateDay !== null && isStale(status.updateDay, today))
  const zeroResourceCourses = pick((status) => status.resourceCount === 0)
  const rectifyCourses = pick((status) => status.needsRectification)
  const byDepartment = (list: readonly DrilldownCourseWithDepartment[]) =>
    summarizeByDepartment(list.map((course) => ({ departmentName: course.departmentName, count: 1 })))
  const pass = passRate(statuses)

  return {
    overview: {
      departmentCount: countDistinctNames(index.departments),
      majorCount: countDistinctNames(index.majors),
      courseTotal: courses.length,
      registeredTeacherCount: teachers.registered.length,
      participatingTeacherCount: teachers.participating.length,
      evaluationCompletedCount: tasks.reduce((sum, task) => sum + task.completedCount, 0),
      evaluationTargetCount: tasks.reduce((sum, task) => sum + task.courseCount, 0),
      newCourses: countNewCourses(rows, comparisons.previous),
      courseTotalChange: compareCourseTotal(courses.length, lastYear),
      archiveCoverage: archiveCoverage(index),
      qualifiedCount,
      qualifiedRateChange,
      passedCount: pass.passed,
      scoredCount: pass.scored,
      rectifyCount: rectifyCourses.length,
    },
    courses,
    ownerMissing: byDepartment(ownerMissingCourses),
    ownerMissingCourses,
    evaluationDueSoon: {
      count: dueTasks.reduce((sum, task) => sum + pendingCourseCount(task), 0),
      topDepartmentName: dueSummary.topDepartmentName,
      topDepartmentCount: dueSummary.topDepartmentCount,
    },
    unqualifiedCourses: pick((status) => !status.qualified),
    rectifyCourses,
    stageCounts: countStages(statuses),
    departmentRates: rankDepartments(rows),
    activityMonths: activity.months,
    recentOperations: toRecentOperations(activity.recentOperations),
    taskPassRates: passRatesByTask(tasks, statusSet, courseIds),
    resources: RESOURCE_CATEGORY_ORDER.map((category) => ({
      category,
      count: statuses.reduce((sum, status) => sum + status.byCategory[category], 0),
    })),
    stale: byDepartment(staleCourses),
    staleCourses,
    zeroResource: byDepartment(zeroResourceCourses),
    zeroResourceCourses,
  }
}
