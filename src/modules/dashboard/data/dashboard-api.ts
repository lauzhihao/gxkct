import { HttpAdapter } from "@/lib/api/http-adapter"
import { cachedRequest } from "@/modules/dashboard/data/request-cache"
import {
  asArray,
  asRecord,
  readId,
  readNullableBoolean,
  readNullableNumber,
  readNullableString,
  readNumber,
  readSqlSum,
  readString,
  type JsonRecord,
} from "@/modules/dashboard/data/parse"

/**
 * 看板只读取数：全部复用系统现有接口（组织树、专业/课程卡片、成员、质量评估统计、课程资源目录、矩阵）。
 * 每个请求按 URL 缓存，切换层级时不重复拉取。
 */

const http = new HttpAdapter()

/** 卡片接口要求的语言参数，与主页面一致 */
const CARD_LANG = "80101"

async function getJson(endpoint: string): Promise<unknown> {
  return cachedRequest(endpoint, async () => {
    const response = await http.get<unknown>(endpoint)
    if (response.error !== null) {
      throw new Error(`GET ${endpoint} failed: ${response.error}`)
    }
    return response.data
  })
}

function withQuery(path: string, params: Record<string, string | number | null>): string {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null) query.set(key, String(value))
  })
  const text = query.toString()
  return text === "" ? path : `${path}?${text}`
}

function parseList<T>(value: unknown, context: string, parseItem: (record: JsonRecord, itemContext: string) => T): T[] {
  return asArray(value, context).map((item, index) => {
    const itemContext = `${context}[${index}]`
    return parseItem(asRecord(item, itemContext), itemContext)
  })
}

/* ---------- 组织树 ---------- */

export interface TreeNodeDto {
  nodeId: string
  parentId: string
  nodeType: string
  nodeName: string
  children: TreeNodeDto[]
}

function parseTreeNode(record: JsonRecord, context: string): TreeNodeDto {
  const rawChildren = record.children
  // 叶子节点的 children 为 null 或空数组，两者都表示没有下级
  const children = rawChildren === null ? [] : parseList(rawChildren, `${context}.children`, parseTreeNode)
  return {
    nodeId: readString(record, "nodeId", context),
    parentId: readString(record, "parentId", context),
    nodeType: readString(record, "nodeType", context),
    nodeName: readString(record, "nodeName", context),
    children,
  }
}

/** 当前用户权限内、指定学期的组织树（学校 -> 院系 -> 专业 -> 课程） */
export async function fetchTree(collegeId: number, semesterId: number | null): Promise<TreeNodeDto[]> {
  const endpoint = withQuery("/api/v5/tree", { rid: collegeId, semesterId })
  return parseList(await getJson(endpoint), "tree", parseTreeNode)
}

/* ---------- 专业 / 课程卡片（含负责人） ---------- */

export interface ManagerRef {
  /** 后端取用户邮箱，邮箱为空时取用户 ID */
  value: string
  label: string | null
}

export interface CardDto {
  id: string
  name: string
  managers: ManagerRef[]
}

function parseManager(record: JsonRecord, context: string): ManagerRef {
  return { value: readString(record, "value", context), label: readNullableString(record, "label", context) }
}

function parseCard(record: JsonRecord, context: string): CardDto {
  const self = asRecord(record.self, `${context}.self`)
  return {
    id: readId(self, "value", `${context}.self`),
    name: readString(self, "label", `${context}.self`),
    managers: parseList(record.manager, `${context}.manager`, parseManager),
  }
}

/** 专业下的课程卡片，manager 为课程负责人（任课关系） */
export async function fetchMajorCourseCards(majorId: string, semesterId: number | null): Promise<CardDto[]> {
  const endpoint = withQuery(`/api/v5/tree/majors/${majorId}/courses`, { lang: CARD_LANG, semesterId })
  return parseList(await getJson(endpoint), "majorCourses", parseCard)
}

/** 院系下的专业卡片，manager 为专业负责人 */
export async function fetchDepartmentMajorCards(departmentId: string, semesterId: number | null): Promise<CardDto[]> {
  const endpoint = withQuery(`/api/v5/tree/departments/${departmentId}/majors`, { lang: CARD_LANG, semesterId })
  return parseList(await getJson(endpoint), "departmentMajors", parseCard)
}

/* ---------- 成员 ---------- */

export interface MemberDto {
  id: string
  /** 登录邮箱 */
  account: string | null
  name: string | null
  roleLabel: string | null
  permission: number | null
  disabled: boolean | null
}

function parseMember(record: JsonRecord, context: string): MemberDto {
  return {
    id: readId(record, "id", context),
    account: readNullableString(record, "account", context),
    name: readNullableString(record, "name", context),
    roleLabel: readNullableString(record, "auth", context),
    permission: readNullableNumber(record, "permission", context),
    disabled: readNullableBoolean(record, "disabled", context),
  }
}

export async function fetchMembers(collegeId: number, departmentId: string | null, semesterId: number | null): Promise<MemberDto[]> {
  const endpoint = withQuery("/api/v5/manage/users", { collegeId, departmentId, semesterId })
  return parseList(await getJson(endpoint), "members", parseMember)
}

/* ---------- 质量评估统计 ---------- */

export interface TaskStatDto {
  taskId: string
  title: string
  startDate: string | null
  endDate: string | null
  status: string | null
  courseCount: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
}

function parseTaskStat(record: JsonRecord, context: string): TaskStatDto {
  return {
    taskId: readId(record, "taskId", context),
    title: readString(record, "title", context),
    startDate: readNullableString(record, "startDate", context),
    endDate: readNullableString(record, "endDate", context),
    status: readNullableString(record, "status", context),
    courseCount: readNumber(record, "courseCount", context),
    completedCount: readSqlSum(record, "completedCount", context),
    inProgressCount: readSqlSum(record, "inProgressCount", context),
    notStartedCount: readSqlSum(record, "notStartedCount", context),
  }
}

export interface ScopeTaskStatDto {
  scopeId: string
  scopeName: string
  courseCount: number
  completedCount: number
  inProgressCount: number
  notStartedCount: number
}

function parseScopeTaskStat(idKey: string, nameKey: string) {
  return (record: JsonRecord, context: string): ScopeTaskStatDto => ({
    scopeId: readId(record, idKey, context),
    scopeName: readString(record, nameKey, context),
    courseCount: readNumber(record, "courseCount", context),
    completedCount: readSqlSum(record, "completedCount", context),
    inProgressCount: readSqlSum(record, "inProgressCount", context),
    notStartedCount: readSqlSum(record, "notStartedCount", context),
  })
}

export async function fetchCollegeTasks(collegeId: number, semesterId: number | null): Promise<TaskStatDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/colleges/${collegeId}/tasks`, { semesterId })
  return parseList(await getJson(endpoint), "collegeTasks", parseTaskStat)
}

/** 某评估任务在全校各院系的完成情况 */
export async function fetchCollegeTaskDepartments(taskId: string, collegeId: number, semesterId: number | null): Promise<ScopeTaskStatDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/tasks/${taskId}/colleges/${collegeId}/depts`, { semesterId })
  return parseList(await getJson(endpoint), "collegeTaskDepts", parseScopeTaskStat("deptId", "deptName"))
}

export async function fetchDepartmentTasks(departmentId: string, semesterId: number | null): Promise<TaskStatDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/depts/${departmentId}/tasks`, { semesterId })
  return parseList(await getJson(endpoint), "deptTasks", parseTaskStat)
}

/** 某评估任务在院系各专业的完成情况 */
export async function fetchDepartmentTaskMajors(taskId: string, departmentId: string, semesterId: number | null): Promise<ScopeTaskStatDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/tasks/${taskId}/depts/${departmentId}/majors`, { semesterId })
  return parseList(await getJson(endpoint), "deptTaskMajors", parseScopeTaskStat("majorId", "majorName"))
}

export async function fetchMajorTasks(majorId: string, semesterId: number | null): Promise<TaskStatDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/majors/${majorId}/tasks`, { semesterId })
  return parseList(await getJson(endpoint), "majorTasks", parseTaskStat)
}

export interface CourseEvaluationDto {
  courseId: string
  selfEvaluationStatus: string | null
  overallStatus: string | null
  finalScore: number | null
}

function parseCourseEvaluation(record: JsonRecord, context: string): CourseEvaluationDto {
  return {
    courseId: readId(record, "courseId", context),
    selfEvaluationStatus: readNullableString(record, "selfEvaluationStatus", context),
    overallStatus: readNullableString(record, "overallStatus", context),
    finalScore: readNullableNumber(record, "finalScore", context),
  }
}

/** 某评估任务下本专业各课程的评估状态与得分 */
export async function fetchMajorTaskCourses(taskId: string, majorId: string, semesterId: number | null): Promise<CourseEvaluationDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/tasks/${taskId}/majors/${majorId}/courses`, { semesterId })
  return parseList(await getJson(endpoint), "majorTaskCourses", parseCourseEvaluation)
}

export interface CourseTaskDto extends CourseEvaluationDto {
  relationId: string
  taskId: string
  title: string
  endDate: string | null
  taskStatus: string | null
}

function parseCourseTask(record: JsonRecord, context: string): CourseTaskDto {
  return {
    ...parseCourseEvaluation(record, context),
    relationId: readId(record, "id", context),
    taskId: readId(record, "taskId", context),
    title: readString(record, "title", context),
    endDate: readNullableString(record, "endDate", context),
    taskStatus: readNullableString(record, "taskStatus", context),
  }
}

/** 某门课程参与的评估任务（发布关系） */
export async function fetchCourseTasks(courseId: string, semesterId: number | null): Promise<CourseTaskDto[]> {
  const endpoint = withQuery(`/api/v5/task-evaluation/courses/${courseId}/tasks`, { semesterId })
  return parseList(await getJson(endpoint), "courseTasks", parseCourseTask)
}

/* ---------- 课程资源目录 ---------- */

export interface ResourceFolderDto {
  name: string
  type: string
  /** 目录下直接子对象数量（文件与子目录）；文件条目为 null */
  filesCount: number | null
  latestUploadedAt: string | null
}

function parseResourceFolder(record: JsonRecord, context: string): ResourceFolderDto {
  return {
    name: readString(record, "name", context),
    type: readString(record, "type", context),
    filesCount: readNullableNumber(record, "filesCount", context),
    latestUploadedAt: readNullableString(record, "latestUploadedAt", context),
  }
}

/** 课程资源的一级目录（只读查询，不会初始化目录） */
export async function fetchResourceFolders(courseId: string): Promise<ResourceFolderDto[]> {
  return parseList(await getJson(`/api/v5/courses/${courseId}/resource-folders`), "resourceFolders", parseResourceFolder)
}

/* ---------- 矩阵 ---------- */

export interface MajorMatrixCourseDto {
  courseId: string
  /** relate=1 的毕业要求指标点数量（relate=0 为未勾选） */
  supportedPointCount: number
}

function parseMajorMatrixCourse(record: JsonRecord, context: string): MajorMatrixCourseDto {
  const items = parseList(record.matrixItems, `${context}.matrixItems`, (item, itemContext) =>
    readNumber(item, "relate", itemContext),
  )
  return {
    courseId: readId(record, "courseId", context),
    supportedPointCount: items.filter((relate) => relate === 1).length,
  }
}

export async function fetchMajorMatrix(majorId: string): Promise<MajorMatrixCourseDto[]> {
  return parseList(await getJson(`/api/v5/matrix/majormatrix/${majorId}`), "majorMatrix", parseMajorMatrixCourse)
}

/** 课程的 KSA 课点标题列表（标题为 K / S / A，个别历史数据带星号或空格） */
export async function fetchCourseKsaTitles(courseId: string): Promise<string[]> {
  const endpoint = withQuery("/api/matrix/ksanrelate", { courseId })
  const record = asRecord(await getJson(endpoint), "ksanrelate")
  return parseList(record.ksas, "ksanrelate.ksas", (item, itemContext) => readString(item, "title", itemContext))
}
