/**
 * 数据看板的数据契约。
 * 当前阶段由示例数据生成器填充；二期接入后端时，接口按同一形状返回，页面组件不需要改动。
 * 比例字段统一用 0-1 小数，百分点差值统一用 pp 数值（如 3.2 表示 +3.2 个百分点）。
 */

export type DashboardTier = "school" | "department" | "major" | "teacher"

/** 课程建设阶段（有序）：未开始 -> 建设中 -> 已完成待评估 -> 已达标 */
export type ConstructionStage = "notStarted" | "inProgress" | "awaitingEvaluation" | "qualified"

export interface StageCount {
  stage: ConstructionStage
  count: number
}

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
  ownerName: string | null
  stage: ConstructionStage
  lastUpdated: string
}

export interface DrilldownRequest {
  title: string
  total: number
  courses: DrilldownCourse[]
}

/* ---------- 校级大盘 ---------- */

export interface SchoolOverview {
  departmentCount: number
  majorCount: number
  courseTotal: number
  newCourseCount: number
  courseYoyRate: number
  departmentArchiveCoverage: number
  qualifiedCourseCount: number
  qualifiedRate: number
  qualifiedRateDeltaPp: number
  participatingTeacherCount: number
  registeredTeacherCount: number
  evaluationPassRate: number
  evaluatedCourseCount: number
  evaluationPassRateDeltaPp: number
  overdueRectificationCount: number
  ownerMissingCount: number
}

export interface DepartmentRate {
  departmentId: string
  departmentName: string
  qualifiedRate: number
}

export interface MonthlyActivity {
  month: string
  newCourses: number
  resourceUpdates: number
}

export interface TermPassRate {
  termLabel: string
  passRate: number
}

export interface CourseUpdateEvent {
  id: string
  date: string
  courseName: string
  departmentName: string
  action: string
}

export type SchoolWarningKind =
  | "overdueRectification"
  | "ownerMissing"
  | "evaluationDueSoon"
  | "staleOver60Days"
  | "zeroResource"

export interface SchoolWarning {
  kind: SchoolWarningKind
  count: number
  topDepartmentName: string
  topDepartmentCount: number
}

export interface SchoolDashboardData {
  overview: SchoolOverview
  stageDistribution: StageCount[]
  departmentRanking: DepartmentRate[]
  monthlyActivity: MonthlyActivity[]
  passRateTrend: TermPassRate[]
  passRateTarget: number
  resourceStats: ResourceCategoryCount[]
  recentUpdates: CourseUpdateEvent[]
  warnings: SchoolWarning[]
}

/* ---------- 院系层 ---------- */

export interface DepartmentOverview {
  departmentName: string
  courseTotal: number
  inProgressCount: number
  notStartedCount: number
  participatingTeacherCount: number
  registeredTeacherCount: number
  qualifiedRate: number
  schoolRank: number
  departmentCount: number
}

export interface MajorProgress {
  majorId: string
  majorName: string
  gradeLabel: string
  courseCount: number
  completionRate: number
  qualifiedRate: number
  stages: StageCount[]
}

/** 与全校均值对比：departmentValue / schoolAverage 同单位 */
export interface ComparisonMetric {
  key: string
  label: string
  unit: "rate" | "count"
  departmentValue: number
  schoolAverage: number
}

export type BreakpointKind = "noOwner" | "noSyllabus" | "noLessonPlanOrCourseware" | "noResource"

export interface BreakpointCount {
  kind: BreakpointKind
  count: number
}

export interface UnqualifiedCourse {
  id: string
  courseName: string
  majorName: string
  ownerName: string | null
  stage: ConstructionStage
  missing: string[]
}

export interface IdleTeacher {
  id: string
  teacherName: string
  majorName: string
  courseCount: number
  lastActiveDate: string | null
}

export type DepartmentTaskKind = "evaluation" | "rectification"
export type DepartmentTaskStatus = "pending" | "dueSoon" | "overdue"

export interface DepartmentTask {
  id: string
  kind: DepartmentTaskKind
  title: string
  courseName: string
  deadline: string
  status: DepartmentTaskStatus
}

export interface DepartmentDashboardData {
  overview: DepartmentOverview
  majorProgress: MajorProgress[]
  comparison: ComparisonMetric[]
  breakpoints: BreakpointCount[]
  unqualifiedCourses: UnqualifiedCourse[]
  idleTeachers: IdleTeacher[]
  tasks: DepartmentTask[]
}

/* ---------- 专业层 ---------- */

export interface MajorOverview {
  majorName: string
  gradeLabel: string
  departmentName: string
  courseCount: number
  completionRate: number
  qualifiedRate: number
}

export interface CourseMatrixRow {
  id: string
  courseName: string
  ownerName: string | null
  indicatorPoints: string[]
  setupComplete: boolean
  hasSyllabus: boolean
  hasLessonPlan: boolean
  hasCourseware: boolean
  resourceCount: number
  lastUpdated: string
  daysSinceUpdate: number
  evaluationScore: number | null
  evaluationRank: number | null
  stage: ConstructionStage
}

export type MajorWarningKind = "ownerMissing" | "staleOver60Days" | "evaluationUnprepared"

export interface MajorWarning {
  kind: MajorWarningKind
  courseNames: string[]
}

export interface EvaluationTermResult {
  termLabel: string
  score: number | null
}

export interface EvaluationRecord {
  courseId: string
  courseName: string
  results: EvaluationTermResult[]
}

export interface MajorDashboardData {
  overview: MajorOverview
  courses: CourseMatrixRow[]
  warnings: MajorWarning[]
  evaluationTerms: string[]
  evaluationPassScore: number
  evaluationRecords: EvaluationRecord[]
}

/* ---------- 任课教师层 ---------- */

export interface MatrixLevelState {
  level1: boolean
  level2: boolean
  level3: boolean
}

export interface KsaCount {
  knowledge: number
  skill: number
  attitude: number
}

export interface TeacherCourse {
  id: string
  courseName: string
  majorName: string
  progress: number
  stage: ConstructionStage
  matrix: MatrixLevelState
  ksa: KsaCount
}

export type TeacherTodoKind = "missingMaterial" | "dueSoon" | "returned"

export interface TeacherTodo {
  id: string
  kind: TeacherTodoKind
  courseName: string
  detail: string
  deadline: string | null
}

export interface ResourceRequirement {
  key: string
  label: string
  uploaded: number
  required: number
}

export interface TeacherEvaluation {
  id: string
  courseName: string
  termLabel: string
  score: number
  level: "A" | "B" | "C" | "D"
  comment: string | null
  rectifyDeadline: string | null
}

export interface TeacherDashboardData {
  teacherName: string
  departmentName: string
  courses: TeacherCourse[]
  todos: TeacherTodo[]
  resources: ResourceRequirement[]
  evaluations: TeacherEvaluation[]
  departmentPercentile: number
}

/** 看板内的下钻焦点：从校级点院系、从院系点专业 */
export interface DashboardFocus {
  departmentName: string
  majorName: string
}
