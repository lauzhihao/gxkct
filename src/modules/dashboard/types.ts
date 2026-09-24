/**
 * 数据看板的数据契约（正式数据）。
 * 只包含系统现有接口能取到的指标；取不到的指标（达标、评估通过率、整改、建设阶段、年级等）
 * 不进入契约，由页面在原版位显示 N/A 并注明原因（原因文案见 labels.ts 的 NA_REASONS）。
 */

export type DashboardTier = "school" | "department" | "major" | "teacher"

export type ResourceCategory = "document" | "video" | "questionBank" | "other"

export interface ResourceCategoryCount {
  category: ResourceCategory
  count: number
}

/** 下钻清单中的一门课程 */
export interface DrilldownCourse {
  id: string
  courseName: string
  majorName: string
  departmentName: string
  ownerNames: string[]
}

export interface DrilldownRequest {
  title: string
  courses: DrilldownCourse[]
}

/** 预警汇总：数量与问题最集中的院系；数量为 0 时没有"最多"的院系 */
export interface WarningSummary {
  count: number
  topDepartmentName: string | null
  topDepartmentCount: number
}

/* ---------- 校级大盘 ---------- */

export interface SchoolOverview {
  /** 名称重复的院系 / 专业只计一次 */
  departmentCount: number
  majorCount: number
  courseTotal: number
  registeredTeacherCount: number
  participatingTeacherCount: number
  /** 本学期评估：已完成整体评估的课程门次 / 参评课程门次（按评估任务累加） */
  evaluationCompletedCount: number
  evaluationTargetCount: number
}

export interface SchoolDashboardData {
  overview: SchoolOverview
  courses: DrilldownCourse[]
  ownerMissing: WarningSummary
  ownerMissingCourses: DrilldownCourse[]
  evaluationDueSoon: WarningSummary
}

/* ---------- 院系层 ---------- */

export interface DepartmentOverview {
  departmentId: string
  departmentName: string
  courseTotal: number
  registeredTeacherCount: number
  participatingTeacherCount: number
}

export interface MajorStatus {
  majorId: string
  majorName: string
  leadNames: string[]
  courseCount: number
  ownerMissingCount: number
  evaluationCompletedCount: number
  evaluationTargetCount: number
}

export interface IdleTeacher {
  id: string
  teacherName: string
  roleLabel: string | null
}

export type DepartmentTaskStatus = "pending" | "dueSoon" | "overdue" | "completed"

export interface DepartmentTask {
  id: string
  title: string
  deadline: string | null
  status: DepartmentTaskStatus
  completedCount: number
  targetCount: number
}

export interface DepartmentDashboardData {
  overview: DepartmentOverview
  majors: MajorStatus[]
  courses: DrilldownCourse[]
  ownerMissingCourses: DrilldownCourse[]
  idleTeachers: IdleTeacher[]
  tasks: DepartmentTask[]
}

/* ---------- 专业层 ---------- */

export interface MajorOverview {
  majorId: string
  majorName: string
  departmentName: string
  courseCount: number
  leadNames: string[]
}

export interface CourseMatrixRow {
  id: string
  courseName: string
  ownerNames: string[]
  /** 专业矩阵中该课程支撑的毕业要求指标点数量 */
  supportedPointCount: number
  hasSyllabus: boolean
  hasLessonPlan: boolean
  hasCourseware: boolean
  resourceCount: number
  /** 最近一次上传资源的日期；从未上传为 null */
  latestUploadDate: string | null
  /** 最近一次出分的评估任务中的得分与专业内排名；未出分为 null */
  evaluationScore: number | null
  evaluationRank: number | null
}

export interface EvaluationColumn {
  taskId: string
  title: string
  endDate: string | null
}

/** 某课程在某次评估中的结果：未参评 / 参评未出分 / 已出分 */
export type EvaluationCell = { kind: "absent" } | { kind: "pending" } | { kind: "scored"; score: number }

export interface EvaluationRecord {
  courseId: string
  courseName: string
  /** 与 evaluationColumns 一一对应 */
  cells: EvaluationCell[]
}

export interface MajorDashboardData {
  overview: MajorOverview
  courses: CourseMatrixRow[]
  ownerMissingCourseNames: string[]
  /** 30 天内到期的评估任务中尚未提交自评的课程 */
  unpreparedCourseNames: string[]
  evaluationColumns: EvaluationColumn[]
  evaluationRecords: EvaluationRecord[]
}

/* ---------- 任课教师层 ---------- */

export interface KsaCount {
  knowledge: number
  skill: number
  attitude: number
}

export interface TeacherCourse {
  id: string
  courseName: string
  majorName: string
  ksa: KsaCount
  resourceCount: number
}

export type TeacherTodoKind = "missingMaterial" | "dueSoon"

/** 同名课程可能分属不同专业，列表里用专业名区分 */
export interface TeacherTodo {
  id: string
  kind: TeacherTodoKind
  courseName: string
  majorName: string
  detail: string
  deadline: string | null
}

/** 评估任务里各级评价的状态取值（后端 teaching_supervisory_task 表注释） */
export type EvaluationStatus = "not_started" | "in_progress" | "completed"

export interface TeacherEvaluation {
  id: string
  courseName: string
  majorName: string
  taskTitle: string
  score: number | null
  /** 整体状态；null 为后端没有记录状态 */
  status: EvaluationStatus | null
}

export interface TeacherDashboardData {
  teacherName: string
  courses: TeacherCourse[]
  todos: TeacherTodo[]
  resources: ResourceCategoryCount[]
  evaluations: TeacherEvaluation[]
}
