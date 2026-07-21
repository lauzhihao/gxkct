import { api } from "@/lib/api"
import { HttpAdapter } from "@/lib/api/http-adapter"
import type { ApiResponse } from "@/lib/api/types"
import type { TeachingSupervisoryTask, Long, EvaluationCriterion, TaskTargetType } from "@/types"

const http = new HttpAdapter()

function withSemesterId(endpoint: string, semesterId?: number | null): string {
  if (typeof semesterId !== "number" || !Number.isFinite(semesterId)) {
    return endpoint
  }

  const separator = endpoint.includes("?") ? "&" : "?"
  return `${endpoint}${separator}semesterId=${semesterId}`
}

// 单项评价数据（自评/专业评/院校评）
export interface EvaluationRecord {
  level: "A" | "B" | "C" | "D" | null
  comment: string | null
  score: number | null
  materials: EvaluationMaterial[]
  evaluatorName?: string | null
  evaluatedAt?: string | null
}

// 支撑材料
export interface EvaluationMaterial {
  id: string
  name: string
  type: string
  url?: string
}

// 评分项详情
export interface EvaluationItemDetail {
  criterion: EvaluationCriterion // 评价标准项
  selfEvaluation: EvaluationRecord | null // 自评数据
  deptEvaluation: EvaluationRecord | null // 专业评价数据
  schoolEvaluation: EvaluationRecord | null // 院校评价数据
}

// 课程评分详情响应
export interface CourseEvaluationDetailResponse {
  // 任务基本信息
  taskId: Long
  courseId: Long
  title: string
  description: string | null
  startDate: string
  endDate: string
  // 评分汇总
  selfTotalScore: number | null
  deptTotalScore: number | null
  schoolTotalScore: number | null
  // 评价标准及评分详情
  items: EvaluationItemDetail[]
  // 权限控制
  editable: boolean
  evaluationType: "self" | "dept" | "school" | null // 当前评价类型
  canSelfEvaluate: boolean // 是否可以自评
  canDeptEvaluate: boolean // 是否可以专业评价
  canSchoolEvaluate: boolean // 是否可以院校评价
}

// 提交评价的单项数据
export interface EvaluationItemSubmit {
  criterionId: Long
  level: "A" | "B" | "C" | "D" | null
  comment: string
  materialIds: Long[]
}

// 单个评价类型的提交数据
export interface EvaluationTypeSubmit {
  evaluationType: "SELF" | "DEPT" | "SCHOOL"
  items: EvaluationItemSubmit[]
}

// 课程评价提交请求体
export interface CourseEvaluationSubmitDTO {
  evaluations: EvaluationTypeSubmit[]
}

// 任务执行主体（任意层级）：院系/专业级任务的列表项
export interface TaskTargetItem {
  id: Long
  taskId: Long
  // 任务基本信息（按 target/node 维度查询时由 JOIN 带出）
  title?: string | null
  startDate?: string | null
  endDate?: string | null
  taskStatus?: string | null
  targetType: TaskTargetType
  targetId: Long
  targetName: string | null
  courseId: Long | null
  courseName: string | null
  majorId: Long | null
  majorName: string | null
  deptId: Long | null
  deptName: string | null
  collegeId: Long | null
  collegeName: string | null
  selfEvaluationStatus: string
  deptEvaluationStatus: string
  schoolEvaluationStatus: string
  overallStatus: "not_started" | "in_progress" | "completed"
  selfTotalScore: number | null
  deptTotalScore: number | null
  schoolTotalScore: number | null
  finalScore: number | null
}

export interface CourseTeachingTaskResponse {
  id: Long
  taskId: Long
  title: string
  startDate: string
  endDate: string
  courseId: Long
  courseName: string
  majorId: Long
  majorName: string
  deptId: Long
  deptName: string
  collegeId: Long
  collegeName: string
  selfEvaluationStatus: string
  deptEvaluationStatus: string
  schoolEvaluationStatus: string
  overallStatus: "not_started" | "in_progress" | "completed"
  taskStatus: "not_started" | "in_progress" | "completed"
  selfTotalScore: number | null
  deptTotalScore: number | null
  schoolTotalScore: number | null
  finalScore: number | null
  selfSubmittedAt: string | null
  deptSubmittedAt: string | null
  schoolSubmittedAt: string | null
  description?: string | null
}

// 专业下课程评分列表项
export interface MajorCourseEvaluationItem {
  courseId: Long
  courseName: string
  selfTotalScore: number | null
  deptTotalScore: number | null
  schoolTotalScore: number | null
  selfEvaluationStatus: string
  deptEvaluationStatus: string
  schoolEvaluationStatus: string
}

// 院系下专业评分列表项
export interface DeptMajorEvaluationItem {
  majorId: Long
  majorName: string
  courseCount: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
  avgDeptScore: number | null
}

// 院系级任务列表项
export interface DeptTaskItem {
  taskId: Long
  title: string
  startDate: string
  endDate: string
  status: "not_started" | "in_progress" | "completed"
  deptId: Long
  deptName: string
  courseCount: number
  majorCount: number
  avgDeptScore: number | null
  completedCount: number
  inProgressCount: number
  notStartedCount: number
}

// 学校级任务列表项
export interface CollegeTaskItem {
  taskId: Long
  title: string
  startDate: string
  endDate: string
  status: "not_started" | "in_progress" | "completed"
  collegeId: Long
  collegeName: string
  deptCount: number
  majorCount: number
  courseCount: number
  avgScore: number | null
  completedCount: number
  inProgressCount: number
  notStartedCount: number
}

// 学校下院系评分列表项
export interface CollegeDeptEvaluationItem {
  deptId: Long
  deptName: string
  majorCount: number
  courseCount: number
  avgDeptScore: number | null
  completedCount: number
  inProgressCount: number
  notStartedCount: number
}

export const courseTeachingTasksApi = {
  getTasksByCourse(courseId: Long, semesterId?: number | null): Promise<ApiResponse<CourseTeachingTaskResponse[] | null>> {
    return http.get<CourseTeachingTaskResponse[]>(withSemesterId(`/api/v5/task-evaluation/courses/${courseId}/tasks`, semesterId))
  },
  getTasksByStatus(
    universityId: Long,
    status: "not_started" | "in_progress" | "completed",
  ): Promise<ApiResponse<TeachingSupervisoryTask[] | null>> {
    return api.teachingTasks.getTasksByStatus(universityId, status)
  },
  getTask(
    universityId: Long,
    taskId: Long,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    return api.teachingTasks.getTask(universityId, taskId, { includeCriteria: true })
  },

  // 获取课程评分详情（根据任务ID和课程ID）
  getEvaluationDetail(
    taskId: Long,
    courseId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<CourseEvaluationDetailResponse | null>> {
    return http.get<CourseEvaluationDetailResponse>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/courses/${courseId}/evaluation`, semesterId)
    )
  },

  // 提交课程评价
  submitEvaluation(
    taskId: Long,
    courseId: Long,
    submitDTO: CourseEvaluationSubmitDTO,
    semesterId?: number | null,
  ): Promise<ApiResponse<CourseEvaluationDetailResponse | null>> {
    return http.post<CourseEvaluationDetailResponse>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/courses/${courseId}/evaluation`, semesterId),
      submitDTO
    )
  },

  // 获取任务下专业的课程评分列表
  getCoursesByTaskAndMajor(
    taskId: Long,
    majorId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<MajorCourseEvaluationItem[] | null>> {
    return http.get<MajorCourseEvaluationItem[]>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/majors/${majorId}/courses`, semesterId)
    )
  },

  // 获取院系的任务列表
  getTasksByDept(deptId: Long, semesterId?: number | null): Promise<ApiResponse<DeptTaskItem[] | null>> {
    return http.get<DeptTaskItem[]>(
      withSemesterId(`/api/v5/task-evaluation/depts/${deptId}/tasks`, semesterId)
    )
  },

  // 获取任务下院系的专业评分列表
  getMajorsByTaskAndDept(
    taskId: Long,
    deptId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<DeptMajorEvaluationItem[] | null>> {
    return http.get<DeptMajorEvaluationItem[]>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/depts/${deptId}/majors`, semesterId)
    )
  },

  // 获取学校的任务列表
  getTasksByCollege(collegeId: Long, semesterId?: number | null): Promise<ApiResponse<CollegeTaskItem[] | null>> {
    return http.get<CollegeTaskItem[]>(
      withSemesterId(`/api/v5/task-evaluation/colleges/${collegeId}/tasks`, semesterId)
    )
  },

  // 获取任务下学校的院系评分列表
  getDeptsByTaskAndCollege(
    taskId: Long,
    collegeId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<CollegeDeptEvaluationItem[] | null>> {
    return http.get<CollegeDeptEvaluationItem[]>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/colleges/${collegeId}/depts`, semesterId)
    )
  },

  // 获取任务的执行主体列表（院系/专业级任务：每行即一个执行主体）
  getTaskTargets(taskId: Long): Promise<ApiResponse<TaskTargetItem[] | null>> {
    return http.get<TaskTargetItem[]>(`/api/v5/task-evaluation/tasks/${taskId}/targets`)
  },

  // 获取派发到某执行主体（院系/专业等）本层级的任务列表
  getTasksByTarget(
    targetType: TaskTargetType,
    targetId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<TaskTargetItem[] | null>> {
    return http.get<TaskTargetItem[]>(
      withSemesterId(`/api/v5/task-evaluation/targets/${targetType}/${targetId}/tasks`, semesterId)
    )
  },

  // 获取执行主体（学校/院系/专业/课程）的评价详情
  getTargetEvaluationDetail(
    taskId: Long,
    targetType: TaskTargetType,
    targetId: Long,
    semesterId?: number | null,
  ): Promise<ApiResponse<CourseEvaluationDetailResponse | null>> {
    return http.get<CourseEvaluationDetailResponse>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/targets/${targetType}/${targetId}/evaluation`, semesterId)
    )
  },

  // 提交执行主体（学校/院系/专业/课程）的评价
  submitTargetEvaluation(
    taskId: Long,
    targetType: TaskTargetType,
    targetId: Long,
    submitDTO: CourseEvaluationSubmitDTO,
    semesterId?: number | null,
  ): Promise<ApiResponse<CourseEvaluationDetailResponse | null>> {
    return http.post<CourseEvaluationDetailResponse>(
      withSemesterId(`/api/v5/task-evaluation/tasks/${taskId}/targets/${targetType}/${targetId}/evaluation`, semesterId),
      submitDTO
    )
  },
}
