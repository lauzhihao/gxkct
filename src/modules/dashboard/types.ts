/**
 * 数据看板的数据契约（正式数据）。
 * 指标口径见 data/course-status.ts；系统里确实没有数据的指标（年级、整改时限、被退回修改、专业资源要求等）
 * 不进入契约，由页面在原版位显示 N/A 并注明原因（原因文案见 labels.ts 的 NA_REASONS）。
 */

export type DashboardTier = "school" | "department" | "major" | "teacher"

export type ResourceCategory = "document" | "video" | "questionBank" | "other"

/** 建设阶段：未开始 / 建设中 / 待评估 / 已达标（判定见 data/course-status.ts） */
export type CourseStage = "notStarted" | "building" | "awaitingEvaluation" | "qualified"

/** 与另一学期比较的结果：比较得出时带上对比学期名称，比较不了时给出原因 */
export type Comparison = { kind: "value"; value: number; semesterName: string } | { kind: "na"; reason: string }

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
  /** 本学期新开：上一学期没有的逻辑课程门数 */
  newCourses: Comparison
  /** 同比：课程总数相对去年同学期的变化率 */
  courseTotalChange: Comparison
  /** 院系建档覆盖率：有课程的院系 / 全部院系（同名计一次）；没有院系时为 null */
  archiveCoverage: number | null
  qualifiedCount: number
  /** 较上学期：达标率变化（比例差） */
  qualifiedRateChange: Comparison
  /** 最近一次学校评价合格的课程数 / 有学校评价的课程数 */
  passedCount: number
  scoredCount: number
  rectifyCount: number
}

/** 院系达标率，院系同名合并 */
export interface DepartmentRate {
  departmentName: string
  courseCount: number
  qualifiedCount: number
  rate: number
}

export interface ActivityMonth {
  /** yyyy-MM */
  month: string
  newCourseCount: number
  courseEditCount: number
}

export interface RecentOperation {
  id: string
  userName: string
  courseName: string
  operation: string
  /** MM-DD HH:mm */
  operatedAt: string
}

/** 某次评估任务中已有学校评价的课程的通过情况 */
export interface TaskPassRate {
  taskId: string
  title: string
  endDate: string | null
  scoredCount: number
  passedCount: number
}

export interface SchoolDashboardData {
  overview: SchoolOverview
  courses: DrilldownCourse[]
  ownerMissing: WarningSummary
  ownerMissingCourses: DrilldownCourse[]
  evaluationDueSoon: WarningSummary
  unqualifiedCourses: DrilldownCourse[]
  rectifyCourses: DrilldownCourse[]
  stageCounts: Record<CourseStage, number>
  departmentRates: DepartmentRate[]
  activityMonths: ActivityMonth[]
  recentOperations: RecentOperation[]
  taskPassRates: TaskPassRate[]
  resources: ResourceCategoryCount[]
  stale: WarningSummary
  staleCourses: DrilldownCourse[]
  zeroResource: WarningSummary
  zeroResourceCourses: DrilldownCourse[]
}

/* ---------- 院系层 ---------- */

/** 本系在全部院系中按达标率的名次；看不到全校数据时给出原因 */
export type SchoolRank = { kind: "value"; rank: number; total: number } | { kind: "na"; reason: string }

export interface DepartmentOverview {
  departmentId: string
  departmentName: string
  courseTotal: number
  registeredTeacherCount: number
  participatingTeacherCount: number
  /** 在建 = 建设中，待建 = 未开始 */
  buildingCount: number
  notStartedCount: number
  qualifiedCount: number
  schoolRank: SchoolRank
}

export interface MajorStatus {
  majorId: string
  majorName: string
  leadNames: string[]
  courseCount: number
  ownerMissingCount: number
  evaluationCompletedCount: number
  evaluationTargetCount: number
  stageCounts: Record<CourseStage, number>
  /** 课程完成率的平均值；没有课程时为 null */
  completion: number | null
  qualifiedCount: number
}

/** 与全校对比的一项：本系值与全校值 */
export interface ComparisonRow {
  key: "qualified" | "participation" | "resources"
  label: string
  departmentValue: number | null
  schoolValue: number | null
}

export type SchoolComparison = { kind: "value"; rows: ComparisonRow[] } | { kind: "na"; reason: string }

export interface IdleTeacher {
  id: string
  teacherName: string
  roleLabel: string | null
  /** 最近一次课程建设操作的日期（YYYY-MM-DD）；从未操作为 null */
  lastOperatedDay: string | null
}

export interface UnqualifiedCourse {
  id: string
  courseName: string
  majorName: string
  missingMaterials: string[]
}

/** 待整改：最近一次学校评价未达合格线；taskTitle 为 null 表示该任务不在本系任务列表中 */
export interface RectifyCourse {
  id: string
  courseName: string
  majorName: string
  taskTitle: string | null
  rate: number
}

export interface DepartmentBreakpoints {
  noSyllabus: DrilldownCourse[]
  noLessonPlanOrCourseware: DrilldownCourse[]
  noResource: DrilldownCourse[]
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
  breakpoints: DepartmentBreakpoints
  comparison: SchoolComparison
  unqualifiedCourses: UnqualifiedCourse[]
  rectifyCourses: RectifyCourse[]
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
  /** 课程完成率的平均值；没有课程时为 null */
  completion: number | null
  qualifiedCount: number
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
  /** 课程信息（基本信息与扩展信息）最后保存的日期；取不到为 null */
  lastUpdatedDate: string | null
  setupComplete: boolean
  setupMissing: string[]
  stage: CourseStage
  /** 最近一次出分（学校评价完成）的评估任务中的得分与专业内排名；未出分为 null */
  evaluationScore: number | null
  evaluationRank: number | null
}

export interface EvaluationColumn {
  taskId: string
  title: string
  endDate: string | null
}

/** 某课程在某次评估中的结果：未参评 / 参评未出分 / 已出分（passed 为 null 表示该任务没有满分可算得分率） */
export type EvaluationCell = { kind: "absent" } | { kind: "pending" } | { kind: "scored"; score: number; passed: boolean | null }

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
  /** 课程信息最后保存日距今天超过 60 天的课程 */
  staleCourseNames: string[]
  evaluationColumns: EvaluationColumn[]
  evaluationRecords: EvaluationRecord[]
}

/* ---------- 任课教师层 ---------- */

export interface KsaCount {
  knowledge: number
  skill: number
  attitude: number
}

/** 一 / 二 / 三级矩阵（专业矩阵、课程矩阵、项目矩阵）是否已有勾选的关联 */
export interface MatrixLevels {
  level1: boolean
  level2: boolean
  level3: boolean
}

export interface TeacherCourse {
  id: string
  courseName: string
  majorName: string
  ksa: KsaCount
  resourceCount: number
  stage: CourseStage
  completedItems: number
  missingItems: string[]
  matrixLevels: MatrixLevels
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
  /** 学校评价总分；学校评价未完成为 null */
  score: number | null
  /** 是否达到合格线；未出分或没有满分可算得分率为 null */
  passed: boolean | null
  /** 整体状态；null 为后端没有记录状态 */
  status: EvaluationStatus | null
  /** 学校评价各标准选中等级的汇总，如 "A×2、B×1"；学校评价未完成为 null */
  levelSummary: string | null
  /** 院系评价与学校评价的评语 */
  remarks: EvaluationRemark[]
}

export interface EvaluationRemark {
  source: "院系" | "学校"
  criterionName: string
  comment: string
}

export interface TeacherDashboardData {
  teacherName: string
  courses: TeacherCourse[]
  todos: TeacherTodo[]
  resources: ResourceCategoryCount[]
  evaluations: TeacherEvaluation[]
}
