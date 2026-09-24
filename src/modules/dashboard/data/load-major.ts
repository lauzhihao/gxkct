import { requireCourseCard } from "@/modules/dashboard/data/course-cards"
import { DASHBOARD_REQUEST_CONCURRENCY, mapWithConcurrency } from "@/modules/dashboard/data/concurrency"
import {
  fetchDepartmentMajorCards,
  fetchMajorCourseCards,
  fetchMajorMatrix,
  fetchMajorTaskCourses,
  fetchMajorTasks,
  fetchResourceFolders,
  fetchTree,
  type CourseEvaluationDto,
  type TaskStatDto,
} from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isStepCompleted, isTaskCompleted, startOfToday } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, requireDepartment, requireMajor } from "@/modules/dashboard/data/org-index"
import { summarizeCourseResources } from "@/modules/dashboard/data/resources"
import { managerDisplayName } from "@/modules/dashboard/data/teachers"
import type { CourseMatrixRow, EvaluationCell, MajorDashboardData } from "@/modules/dashboard/types"

/** 评估任务按截止日期从早到晚排列；没有截止日期的排在最后 */
function compareTasks(left: TaskStatDto, right: TaskStatDto): number {
  if (left.endDate !== right.endDate) {
    if (left.endDate === null) return 1
    if (right.endDate === null) return -1
    return left.endDate < right.endDate ? -1 : 1
  }
  return Number(left.taskId) - Number(right.taskId)
}

interface RankedScore {
  score: number
  rank: number
}

/** 取最近一次有出分的评估，在专业内按得分排名：名次 = 1 + 得分更高的课程数（同分同名次） */
function rankLatestScores(taskEvaluations: CourseEvaluationDto[][]): Map<string, RankedScore> {
  for (let taskIndex = taskEvaluations.length - 1; taskIndex >= 0; taskIndex -= 1) {
    const scored = taskEvaluations[taskIndex].filter(
      (entry): entry is CourseEvaluationDto & { finalScore: number } => entry.finalScore !== null,
    )
    if (scored.length === 0) continue
    return new Map(
      scored.map((entry) => [
        entry.courseId,
        { score: entry.finalScore, rank: 1 + scored.filter((other) => other.finalScore > entry.finalScore).length },
      ]),
    )
  }
  return new Map()
}

function toCell(entry: CourseEvaluationDto | undefined): EvaluationCell {
  if (entry === undefined) return { kind: "absent" }
  if (entry.finalScore === null) return { kind: "pending" }
  return { kind: "scored", score: entry.finalScore }
}

/** 专业层：课程负责人 + 专业矩阵 + 每门课的资源目录 + 本专业评估任务与各课程得分 */
export async function loadMajorDashboard(
  collegeId: number,
  majorId: string,
  semesterId: number | null,
  now: Date,
): Promise<MajorDashboardData> {
  const index = buildOrgIndex(await fetchTree(collegeId, semesterId))
  const major = requireMajor(index, majorId)
  const department = requireDepartment(index, major.departmentId)
  const majorCourses = index.courses.filter((course) => course.majorId === majorId)

  const [courseCards, majorCards, matrix, resourceSummaries, tasks] = await Promise.all([
    fetchMajorCourseCards(majorId, semesterId),
    fetchDepartmentMajorCards(major.departmentId, semesterId),
    fetchMajorMatrix(majorId),
    mapWithConcurrency(majorCourses, DASHBOARD_REQUEST_CONCURRENCY, async (course) =>
      summarizeCourseResources(await fetchResourceFolders(course.id)),
    ),
    fetchMajorTasks(majorId, semesterId),
  ])

  const orderedTasks = [...tasks].sort(compareTasks)
  const taskEvaluations = await Promise.all(
    orderedTasks.map((task) => fetchMajorTaskCourses(task.taskId, majorId, semesterId)),
  )

  const cardsByCourseId = new Map(courseCards.map((card) => [card.id, card]))
  const leadCard = majorCards.find((card) => card.id === majorId)
  if (leadCard === undefined) {
    throw new Error(`Major ${majorId} missing from department major cards`)
  }
  // 专业矩阵只返回有勾选记录的课程；不在其中的课程没有支撑任何指标点
  const pointsByCourseId = new Map(matrix.map((item) => [item.courseId, item.supportedPointCount]))
  const latestScores = rankLatestScores(taskEvaluations)

  const rows: CourseMatrixRow[] = majorCourses.map((course, courseIndex) => {
    const resources = resourceSummaries[courseIndex]
    const points = pointsByCourseId.get(course.id)
    const ranked = latestScores.get(course.id)
    return {
      id: course.id,
      courseName: course.name,
      ownerNames: requireCourseCard(cardsByCourseId, course.id).managers.map(managerDisplayName),
      supportedPointCount: points === undefined ? 0 : points,
      hasSyllabus: resources.hasSyllabus,
      hasLessonPlan: resources.hasLessonPlan,
      hasCourseware: resources.hasCourseware,
      resourceCount: resources.resourceCount,
      latestUploadDate: resources.latestUploadDate,
      evaluationScore: ranked === undefined ? null : ranked.score,
      evaluationRank: ranked === undefined ? null : ranked.rank,
    }
  })

  // 临近评估批次未准备：30 天内到期且未结束的任务里，尚未提交自评的课程
  const today = startOfToday(now)
  const unpreparedIds = new Set<string>()
  orderedTasks.forEach((task, taskIndex) => {
    if (isTaskCompleted(task.status) || task.endDate === null) return
    if (classifyDeadline(task.endDate, today) !== "dueSoon") return
    taskEvaluations[taskIndex]
      .filter((entry) => !isStepCompleted(entry.selfEvaluationStatus))
      .forEach((entry) => unpreparedIds.add(entry.courseId))
  })

  // 评估记录只列本学期组织树里的课程；至少参评过一次才出现
  const evaluationRecords = majorCourses
    .map((course) => ({
      courseId: course.id,
      courseName: course.name,
      cells: taskEvaluations.map((entries) => toCell(entries.find((entry) => entry.courseId === course.id))),
    }))
    .filter((record) => record.cells.some((cell) => cell.kind !== "absent"))

  return {
    overview: {
      majorId: major.id,
      majorName: major.name,
      departmentName: department.name,
      courseCount: majorCourses.length,
      leadNames: leadCard.managers.map(managerDisplayName),
    },
    courses: rows,
    ownerMissingCourseNames: rows.filter((row) => row.ownerNames.length === 0).map((row) => row.courseName),
    unpreparedCourseNames: majorCourses.filter((course) => unpreparedIds.has(course.id)).map((course) => course.name),
    evaluationColumns: orderedTasks.map((task) => ({ taskId: task.taskId, title: task.title, endDate: task.endDate })),
    evaluationRecords,
  }
}
