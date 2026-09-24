import { loadCourseDetails, requireCourseDetail, requireSection } from "@/modules/dashboard/data/course-details"
import { loadCourseOwners, requireCourseManagers } from "@/modules/dashboard/data/course-owners"
import { fetchTree } from "@/modules/dashboard/data/dashboard-api"
import { classifyDeadline, isStepCompleted, isTaskCompleted, startOfToday, toEvaluationStatus } from "@/modules/dashboard/data/evaluation"
import { buildOrgIndex, requireMajor } from "@/modules/dashboard/data/org-index"
import { summarizeCourseResources } from "@/modules/dashboard/data/resources"
import type { KsaCount, ResourceCategory, TeacherDashboardData, TeacherTodo } from "@/modules/dashboard/types"

export interface TeacherIdentity {
  userId: number
  userName: string
  email: string
}

const RESOURCE_CATEGORY_ORDER: ResourceCategory[] = ["document", "video", "questionBank", "other"]

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

/** 任课教师层：本人担任负责人的课程 + 每门课的资源目录、KSA 课点、参与的评估任务 */
export async function loadTeacherDashboard(
  collegeId: number,
  semesterId: number | null,
  identity: TeacherIdentity,
  now: Date,
): Promise<TeacherDashboardData> {
  const [tree, managersByCourseId] = await Promise.all([
    fetchTree(collegeId, semesterId),
    loadCourseOwners(collegeId, semesterId),
  ])
  const index = buildOrgIndex(tree)

  // 负责人 value 为邮箱，邮箱为空时为用户 ID
  const myKeys = new Set([String(identity.userId), identity.email])
  const myCourses = index.courses.filter((course) =>
    requireCourseManagers(managersByCourseId, course.id).some((manager) => myKeys.has(manager.value)),
  )

  const detailsByCourseId = await loadCourseDetails(
    collegeId,
    semesterId,
    myCourses.map((course) => course.id),
    ["folders", "ksa", "tasks"],
  )
  const details = myCourses.map((course) => {
    const detail = requireCourseDetail(detailsByCourseId, course.id)
    return {
      course,
      majorName: requireMajor(index, course.majorId).name,
      resources: summarizeCourseResources(requireSection(detail.folders, "folders", course.id)),
      ksa: countKsa(requireSection(detail.ksaTitles, "ksa", course.id)),
      tasks: requireSection(detail.tasks, "tasks", course.id),
    }
  })

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
    courses: details.map(({ course, majorName, ksa, resources }) => ({
      id: course.id,
      courseName: course.name,
      majorName,
      ksa,
      resourceCount: resources.resourceCount,
    })),
    todos,
    resources: RESOURCE_CATEGORY_ORDER.map((category) => ({
      category,
      count: details.reduce((sum, detail) => sum + detail.resources.byCategory[category], 0),
    })),
    evaluations: details.flatMap(({ course, majorName, tasks }) =>
      tasks.map((task) => ({
        id: task.relationId,
        courseName: course.name,
        majorName,
        taskTitle: task.title,
        score: task.finalScore,
        status: toEvaluationStatus(task.overallStatus),
      })),
    ),
  }
}
