import { loadCourseDetails, requireCourseDetail, requireSection } from "@/modules/dashboard/data/course-details"
import { loadCourseOwners, requireCourseManagers } from "@/modules/dashboard/data/course-owners"
import { loadCourseStatuses, requireCourseStatus } from "@/modules/dashboard/data/course-status"
import {
  fetchCourseEvaluationItems,
  fetchCourseMatrixLevels,
  fetchTree,
  type CourseTaskDto,
  type EvaluationItemDto,
} from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isStepCompleted, isTaskCompleted, startOfToday, toEvaluationStatus } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, requireMajor } from "@/modules/dashboard/data/org-index"
import { summarizeCourseResources } from "@/modules/dashboard/data/resources"
import type { SemesterComparisons } from "@/modules/dashboard/data/semesters"
import type {
  EvaluationRemark,
  KsaCount,
  MatrixLevels,
  ResourceCategory,
  TeacherDashboardData,
  TeacherTodo,
} from "@/modules/dashboard/types"

export interface TeacherIdentity {
  userId: number
  userName: string
  email: string
}

const RESOURCE_CATEGORY_ORDER: ResourceCategory[] = ["document", "video", "questionBank", "other"]

const LEVEL_ORDER = ["A", "B", "C", "D"]

/** KSA 课点标题为 K / S / A；个别历史数据带星号（重点课点）或空格，归一后计入对应类别；标题为空或为其他值的不计 */
function countKsa(titles: readonly (string | null)[]): KsaCount {
  const count: KsaCount = { knowledge: 0, skill: 0, attitude: 0 }
  titles.forEach((title) => {
    if (title === null) return
    const normalized = title.replace(/[★\s]/g, "").toUpperCase()
    if (normalized === "K") count.knowledge += 1
    else if (normalized === "S") count.skill += 1
    else if (normalized === "A") count.attitude += 1
  })
  return count
}

/** 学校评价各标准选中等级的汇总，如 "A×2、B×1"；只写了评语、没有选等级时为"未选等级" */
function summarizeLevels(items: readonly EvaluationItemDto[]): string {
  const counts = new Map<string, number>()
  items.forEach((item) => {
    if (item.school === null || item.school.level === null) return
    const current = counts.get(item.school.level)
    counts.set(item.school.level, (current === undefined ? 0 : current) + 1)
  })
  if (counts.size === 0) return "未选等级"
  return [...counts.entries()]
    .sort(([left], [right]) => {
      const leftIndex = LEVEL_ORDER.indexOf(left)
      const rightIndex = LEVEL_ORDER.indexOf(right)
      if (leftIndex !== rightIndex) return (leftIndex === -1 ? LEVEL_ORDER.length : leftIndex) - (rightIndex === -1 ? LEVEL_ORDER.length : rightIndex)
      return left.localeCompare(right)
    })
    .map(([level, count]) => `${level}×${count}`)
    .join("、")
}

/** 院系评价与学校评价的评语，作为整改意见；评价标准没有名称时按序号称呼 */
function collectRemarks(items: readonly EvaluationItemDto[]): EvaluationRemark[] {
  const remarks: EvaluationRemark[] = []
  items.forEach((item) => {
    const criterionName =
      item.criterionName !== null && item.criterionName.trim() !== "" ? item.criterionName : `标准 ${item.criterionSequence}`
    const marks: [EvaluationRemark["source"], EvaluationItemDto["dept"]][] = [
      ["学校", item.school],
      ["院系", item.dept],
    ]
    marks.forEach(([source, mark]) => {
      if (mark === null || mark.comment === null || mark.comment.trim() === "") return
      remarks.push({ source, criterionName, comment: mark.comment.trim() })
    })
  })
  return remarks
}

/** 院系或学校评价已完成的任务才有等级和评语可看 */
function hasReviewerMarks(task: CourseTaskDto): boolean {
  return isStepCompleted(task.deptEvaluationStatus) || isStepCompleted(task.schoolEvaluationStatus)
}

function toMatrixLevels(level: { majorMatrixRelatedCount: number; courseMatrixRelatedCount: number; projectMatrixRelatedCount: number }): MatrixLevels {
  return {
    level1: level.majorMatrixRelatedCount > 0,
    level2: level.courseMatrixRelatedCount > 0,
    level3: level.projectMatrixRelatedCount > 0,
  }
}

/** 任课教师层：本人担任负责人的课程 + 建设概况 + 资源目录、KSA 课点、评估任务 + 矩阵分级 + 评估明细 */
export async function loadTeacherDashboard(
  collegeId: number,
  semesterId: number | null,
  comparisons: SemesterComparisons,
  identity: TeacherIdentity,
  now: Date,
): Promise<TeacherDashboardData> {
  const [tree, managersByCourseId, statusSet] = await Promise.all([
    fetchTree(collegeId, semesterId),
    loadCourseOwners(collegeId, semesterId),
    loadCourseStatuses(collegeId, semesterId, comparisons.previous),
  ])
  const index = buildOrgIndex(tree)

  // 负责人 value 为邮箱，邮箱为空时为用户 ID
  const myKeys = new Set([String(identity.userId), identity.email])
  const myCourses = index.courses.filter((course) =>
    requireCourseManagers(managersByCourseId, course.id).some((manager) => myKeys.has(manager.value)),
  )
  const myCourseIds = myCourses.map((course) => course.id)

  const [detailsByCourseId, matrixLevels] = await Promise.all([
    loadCourseDetails(collegeId, semesterId, myCourseIds, ["folders", "ksa", "tasks"]),
    myCourseIds.length === 0 ? Promise.resolve([]) : fetchCourseMatrixLevels(collegeId, semesterId, myCourseIds),
  ])
  const matrixByCourseId = new Map(matrixLevels.map((level) => [level.courseId, level]))

  const details = myCourses.map((course) => {
    const detail = requireCourseDetail(detailsByCourseId, course.id)
    const matrix = matrixByCourseId.get(course.id)
    if (matrix === undefined) {
      throw new Error(`Course ${course.id} missing from course matrix levels`)
    }
    return {
      course,
      majorName: requireMajor(index, course.majorId).name,
      resources: summarizeCourseResources(requireSection(detail.folders, "folders", course.id)),
      ksa: countKsa(requireSection(detail.ksaTitles, "ksa", course.id)),
      tasks: requireSection(detail.tasks, "tasks", course.id),
      status: requireCourseStatus(statusSet.statuses, course.id),
      matrixLevels: toMatrixLevels(matrix),
    }
  })

  // 等级与评语：只取院系或学校评价已完成的任务，每个任务一次请求
  const reviewed = details.flatMap(({ course, tasks }) =>
    tasks.filter(hasReviewerMarks).map((task) => ({ courseId: course.id, task })),
  )
  const reviewedItems = await Promise.all(
    reviewed.map(({ courseId, task }) => fetchCourseEvaluationItems(task.taskId, courseId, semesterId)),
  )
  const itemsByRelationId = new Map(reviewed.map(({ task }, reviewIndex) => [task.relationId, reviewedItems[reviewIndex]]))

  const today = startOfToday(now)
  const todos: TeacherTodo[] = []
  details.forEach(({ course, majorName, resources, tasks }) => {
    const missing = [
      resources.hasSyllabus ? null : "大纲",
      resources.hasLessonPlan ? null : "教案",
      resources.hasCourseware ? null : "课件",
    ].filter((item): item is string => item !== null)
    if (missing.length > 0) {
      todos.push({
        id: `material-${course.id}`,
        kind: "missingMaterial",
        courseName: course.name,
        majorName,
        detail: `缺少${missing.join("、")}`,
        deadline: null,
      })
    }
    tasks.forEach((task) => {
      if (isTaskCompleted(task.taskStatus) || isStepCompleted(task.overallStatus) || isStepCompleted(task.selfEvaluationStatus)) return
      if (task.endDate === null) return
      if (classifyDeadline(task.endDate, today) !== "dueSoon") return
      todos.push({
        id: `task-${task.relationId}`,
        kind: "dueSoon",
        courseName: course.name,
        majorName,
        detail: `「${task.title}」待提交自评`,
        deadline: task.endDate,
      })
    })
  })

  return {
    teacherName: identity.userName,
    courses: details.map(({ course, majorName, ksa, resources, status, matrixLevels: levels }) => ({
      id: course.id,
      courseName: course.name,
      majorName,
      ksa,
      resourceCount: resources.resourceCount,
      stage: status.stage,
      completedItems: status.completedItems,
      missingItems: status.missingItems,
      matrixLevels: levels,
    })),
    todos,
    resources: RESOURCE_CATEGORY_ORDER.map((category) => ({
      category,
      count: details.reduce((sum, detail) => sum + detail.resources.byCategory[category], 0),
    })),
    evaluations: details.flatMap(({ course, majorName, tasks }) =>
      tasks.map((task) => {
        const schoolDone = isStepCompleted(task.schoolEvaluationStatus)
        const items = itemsByRelationId.get(task.relationId)
        const result = statusSet.evaluations.find((entry) => entry.courseId === course.id && entry.result.taskId === task.taskId)
        return {
          id: task.relationId,
          courseName: course.name,
          majorName,
          taskTitle: task.title,
          score: schoolDone ? task.schoolTotalScore : null,
          passed: schoolDone && result !== undefined ? result.result.passed : null,
          status: toEvaluationStatus(task.overallStatus),
          levelSummary: schoolDone && items !== undefined ? summarizeLevels(items) : null,
          remarks: items === undefined ? [] : collectRemarks(items),
        }
      }),
    ),
  }
}
