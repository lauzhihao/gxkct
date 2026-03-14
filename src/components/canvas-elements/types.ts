// 基础元素位置信息
export interface ElementPosition {
  x: number
  y: number
}

// 基础元素尺寸信息
export interface ElementSize {
  width: number
  height: number
  // 可选的最大高度限制，超出时面板内部启用滚动
  maxHeight?: number
}

/**
 * 画布动作枚举 - 对应SSE约定的action字段
 */
export enum CanvasAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  SET = "set",
  CLEAR = "clear",
  BATCH_CREATE = "batch_create",
  // 连线相关操作
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  BATCH_CONNECT = "batch_connect",
  // 布局操作
  LAYOUT = "layout",
  // 源文档操作（用于保存和传递用户输入的文件内容，不显示在UI中）
  SET_SOURCE_DOCUMENTS = "set_source_documents",
}

/**
 * 画布组件类型枚举 - 对应SSE约定的component字段
 */
export enum CanvasComponentType {
  // 源文档（用户上传的文件）
  SOURCE_DOCUMENT_PANEL = "source_document_panel",
  SOURCE_DOCUMENT_CARD = "source_document_card",
  // 课程基本信息
  COURSE_INFO = "course_info",
  // 教学目标
  OBJECTIVE_PANEL = "objective_panel",
  OBJECTIVE_CARD = "objective_card",
  // 课点
  COURSE_POINT_PANEL = "course_point_panel",
  COURSE_POINT_CARD = "course_point_card",
  // 章节
  CHAPTER_PANEL = "chapter_panel",
  CHAPTER_CARD = "chapter_card",
  // KSA
  KSA_PANEL = "ksa_panel",
  KSA_ITEM = "ksa_item",
  // 毕业要求支撑
  GRADUATION_SUPPORT = "graduation_support",
  // 矩阵
  COURSE_MATRIX = "course_matrix",
  PROJECT_MATRIX_PANEL = "project_matrix_panel",
  PROJECT_MATRIX = "project_matrix",
  // 开课报告
  COURSE_REPORT = "course_report",
}

// ============ 各组件数据接口 ============

/**
 * 课程基本信息数据（匹配后端SSE返回格式）
 */
export interface CourseInfoData {
  name: string
  type?: string
  // ============ 兼容前端表单的 snake_case 字段 ============
  course_name?: string          // 兼容课程名称（表单用）
  course_level?: string         // 兼容课程层次（表单用）
  target_audience?: string      // 兼容授课对象（表单用）
  total_theory_hours?: number   // 兼容理论学时（表单用）
  total_practice_hours?: number // 兼容实践学时（表单用）
  description?: string          // 兼容课程简介（表单用）
  // ======================================================
  metadata?: {
    openingDate?: string
    courseType?: string           // 课程类型：必修/选修
    courseNatureId?: number
    courseNatureName?: string     // 课程性质名称
    introduction?: string         // 课程介绍
    theoryPeriod?: number         // 理论学时
    practicePeriod?: number       // 实践学时
    teachingClass?: string        // 授课班级
    teachingLocation?: string
    teachingTime?: string
    studentCount?: number
    credits?: number
    mainTextbook?: string
    referenceResources?: string
    // 课程要求
    attendancePolicy?: string
    assignmentPolicy?: string
    conductRequirements?: string
    practiceRequirements?: string
    teamworkRequirements?: string
    bonusRequirements?: string
    otherSuggestions?: string
    // 考核评价
    assessmentMethod?: string
    assessmentForm?: string
    scoreType?: string
    scoreTable?: {
      headers: string[]
      rows: Array<Record<string, string>>
    }
    assessmentDescription?: string
    // 教学目标
    teachingObjectives?: Array<{
      id: string
      content: string
      points?: string[]
      supportedIndicators?: string[]
    }>
    // 课点
    coursePoints?: Array<{
      id: string
      content: string
      infoPoints?: Array<{
        id: string
        type: 'K' | 'S' | 'A'
        content: string
      }>
    }>
    // 章节
    chapters?: Array<{
      id: string
      name: string
      theoryHours?: number
      practiceHours?: number
    }>
    // 已保存的课程信息（用于判断是新建还是更新）
    courseId?: number           // 已保存的课程ID
    majorId?: number            // 已保存的专业ID
  }
  children?: unknown[]
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 面板容器数据（通用）
 */
export interface PanelData {
  id: string
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 教学目标卡片数据
 */
export interface ObjectiveCardData {
  id: string
  index: number
  content: string
  originalId?: number
  supports?: ObjectiveSupportLabel[]
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 教学目标卡片中的指标点支撑标签
 */
export interface ObjectiveSupportLabel {
  indicatorId?: number
  title: string
  desc?: string
  type?: "strong" | "weak"
}

/**
 * 课点卡片数据
 * 后端 SSE 返回格式: { id, index, name, description }
 */
export interface CoursePointCardData {
  id: string
  index: number
  name: string              // 课点名称（用于显示）
  description?: string      // 课点描述
  content?: string          // 兼容旧格式
  originalId?: number
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 章节卡片数据
 */
export interface ChapterCardData {
  id: string
  index: number
  name: string
  theory_hours?: number
  practice_hours?: number
  originalId?: number
  // ============ 画布节点扩展字段 ============
  highlighted?: boolean       // 高亮状态
  isDeleting?: boolean       // 删除中状态
  onDelete?: (nodeId: string) => void  // 删除回调
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * KSA条目数据
 */
export interface KsaItemData {
  id: string
  category: "K" | "S" | "A"
  index: number
  content: string
  originalId?: number
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 课程矩阵中的课点支撑信息
 */
export interface CourseMatrixCoursePoint {
  id: string
  name: string
  level: "strong" | "weak"
  description?: string
}

/**
 * 课程矩阵支撑项
 */
export interface CourseMatrixSupport {
  objective_id: string
  objective_index: number
  course_points: CourseMatrixCoursePoint[]
  originalGraduateRequireId?: number
}

/**
 * 课程矩阵行数据
 */
export interface CourseMatrixRow {
  chapter_id: string
  chapter_index: number
  chapter_name: string
  supports: CourseMatrixSupport[]
}

/**
 * 课程矩阵数据
 */
export interface CourseMatrixData {
  course_name: string
  objectives: Array<{ id: string; index: number; content: string; originalId?: number }>
  rows: CourseMatrixRow[]
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 项目矩阵任务目标（作为表格列头）
 */
export interface ProjectMatrixTaskObjective {
  id: string
  index: number
  description: string
}

/**
 * 项目矩阵KSA支撑项
 */
export interface ProjectMatrixKsaItem {
  id: string
  name: string
  level: "strong" | "weak"
  description?: string
  // 用于序号标签显示（如 K1, S2, A3）
  category?: "K" | "S" | "A"
  index?: number
}

/**
 * 项目矩阵任务目标支撑（交叉单元格数据）
 */
export interface ProjectMatrixObjectiveSupport {
  task_objective_id: string
  ksa_items: ProjectMatrixKsaItem[]
}

/**
 * 项目矩阵行数据
 */
export interface ProjectMatrixRow {
  course_point_id: string
  course_point_name: string
  course_point_description?: string
  objective_supports: ProjectMatrixObjectiveSupport[]
  learning_method?: string
  teaching_method?: string
  learning_output?: string
  week?: number
  theory_hours?: number
  practice_hours?: number
}

/**
 * 项目矩阵数据
 */
export interface ProjectMatrixData {
  chapter_id: string
  chapter_index: number
  chapter_name: string
  task_objectives: ProjectMatrixTaskObjective[]
  rows: ProjectMatrixRow[]
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 源文档数据（用于保存用户输入的文件引用）
 */
export interface SourceDocument {
  id: string                    // 文档唯一标识
  filename: string              // 文件名称
  ossKey: string                // 解析后的文件内容 OSS Key（md格式）
  originalFileOssKey: string    // 原始文件 OSS Key（用于重做时重新解析）
  fileType: string              // 文件类型（如 pdf, docx, txt）
  createdAt: string             // 创建时间（ISO 格式）
  createdBy?: string            // 创建人
  cdnHost?: string              // CDN 域名（用于拼接完整文件地址）
}

/**
 * 源文档卡片数据（用于画布显示）
 */
export interface SourceDocumentCardData {
  id: string
  index: number
  filename: string
  ossKey: string
  originalFileOssKey: string
  fileType: string
  createdAt: string
  createdBy?: string
  cdnHost?: string              // CDN 域名（用于拼接完整文件地址）
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 源文档集合数据（用于 set_source_documents 事件）
 */
export interface SourceDocumentsData {
  cdnHost?: string              // CDN 域名（用于拼接完整文件地址）
  documents: SourceDocument[]
}

/**
 * 专业矩阵（毕业要求支撑）面板数据
 * 存储用户选择的学校/院系/专业以及指标点支撑关系
 */
export interface GraduationSupportData {
  id: string
  // 选中的组织信息
  universityId?: string
  universityName?: string
  departmentId?: string
  departmentName?: string
  majorId?: string
  majorName?: string
  // 毕业要求 + 指标点 + 支撑关系
  requirements?: Array<{
    id: number
    content: string
    indicators: Array<{
      id: number
      description: string
      supportLevel?: "strong" | "weak"
    }>
  }>
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * 开课报告卡片数据（用于画布显示）
 */
export interface CourseReportCardData {
  id: string
  name: string
  // 占位字段，后续扩展
  status?: "draft" | "submitted" | "approved"
  createdAt?: string
  updatedAt?: string
}

// ============ 元素数据联合类型 ============

/**
 * 所有组件数据的联合类型
 */
export type CanvasComponentData =
  | CourseInfoData
  | PanelData
  | ObjectiveCardData
  | CoursePointCardData
  | ChapterCardData
  | KsaItemData
  | CourseMatrixData
  | ProjectMatrixData
  | SourceDocumentCardData
  | SourceDocumentsData
  | GraduationSupportData
  | CourseReportCardData
  | Record<string, unknown>

// ============ 画布元素状态 ============

/**
 * 画布元素基础数据结构
 */
export interface CanvasElementData {
  id: string
  type: CanvasComponentType
  position: ElementPosition
  size?: ElementSize
  selected?: boolean
  data: CanvasComponentData
  // React Flow Group Node 支持
  parentId?: string           // 父节点ID，用于建立父子关系
  extent?: "parent" | null    // 移动边界约束，'parent' 表示限制在父节点内移动
}

// ============ 边/连线数据结构 ============

/**
 * 画布边（连线）数据结构
 */
export interface CanvasEdgeData {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: "default" | "smoothstep" | "step" | "straight" | "bezier" | "support"
  animated?: boolean
  label?: string
  data?: {
    strength?: "strong" | "weak"
    relationshipType?: "supports" | "depends" | "extends"
  }
}

/**
 * 连接事件数据
 */
export interface ConnectEventData {
  id?: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  strength?: "strong" | "weak"
}

/**
 * 布局事件数据
 */
export interface LayoutEventData {
  direction?: "TB" | "LR" | "BT" | "RL"
  nodeSep?: number
  rankSep?: number
}

/**
 * 重做标签状态
 * 用于在聊天输入框上方显示的可删除标签
 */
export interface RegenerateTag {
  component_id: string
  component_type: CanvasComponentType
  node_name: string
  color_config: {
    bg: string
    border: string
    text: string
  }
}

// ============ SSE消息结构 ============

/**
 * SSE canvas事件消息结构
 */
export interface CanvasEventMessage {
  type: "canvas"
  action: CanvasAction
  component?: CanvasComponentType
  data?: CanvasComponentData | ConnectEventData | LayoutEventData
  // 手动创建时指定位置
  position?: { x: number; y: number }
  // batch_create时使用
  items?: Array<{
    component: CanvasComponentType
    data: CanvasComponentData
  }>
  // batch_connect时使用
  edges?: Array<{
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
    strength?: "strong" | "weak"
  }>
}

/**
 * SSE status事件消息结构
 */
export interface StatusEventMessage {
  type: "status"
  node: "agent" | "tools" | "tool"
  event: "start" | "end" | "call" | "result"
  tool?: string
  args?: Record<string, unknown>
}

/**
 * SSE thinking事件消息结构
 */
export interface ThinkingEventMessage {
  type: "thinking"
  content: string
}

/**
 * SSE ui事件消息结构
 */
export interface UIEventMessage {
  type: "ui"
  action: "show_panel" | "hide_panel" | "highlight" | "scroll_to" | "expand" | "collapse" | "switch_tab"
  panel?: string
  target?: string
  duration?: number
  tab?: string
}

/**
 * SSE progress事件消息结构
 */
export interface ProgressEventMessage {
  type: "progress"
  stage: "collecting_info" | "basic_info" | "course_matrix" | "project_matrix" | "complete"
  current: number
  total: number
  message: string
}

/**
 * SSE processing事件消息结构（用于显示加载进度文案）
 */
export interface ProcessingEventMessage {
  type: "processing"
  stage: string
  message: string
  detail?: {
    mode?: string
    action?: string
  }
}

/**
 * SSE mode事件消息结构
 */
export interface ModeEventMessage {
  type: "mode"
  mode: "chat" | "course_building"
  reason?: string
  stage?: "collecting_info" | "basic_info" | "course_matrix" | "project_matrix" | "complete"
}

/**
 * SSE error事件消息结构
 */
export interface ErrorEventMessage {
  type: "error"
  message: string
}

/**
 * 判断是否为processing事件
 */
export function isProcessingEvent(parsed: unknown): parsed is ProcessingEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "processing"
  )
}

/**
 * 所有SSE事件消息的联合类型
 */
export type SSEEventMessage =
  | CanvasEventMessage
  | StatusEventMessage
  | ThinkingEventMessage
  | UIEventMessage
  | ProgressEventMessage
  | ModeEventMessage
  | ErrorEventMessage

// ============ 类型判断函数 ============

/**
 * 判断是否为canvas事件
 */
export function isCanvasEvent(parsed: unknown): parsed is CanvasEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "canvas"
  )
}

/**
 * 判断是否为status事件
 */
export function isStatusEvent(parsed: unknown): parsed is StatusEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "status"
  )
}

/**
 * 判断是否为thinking事件
 */
export function isThinkingEvent(parsed: unknown): parsed is ThinkingEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "thinking"
  )
}

/**
 * 判断是否为ui事件
 */
export function isUIEvent(parsed: unknown): parsed is UIEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "ui"
  )
}

/**
 * 判断是否为progress事件
 */
export function isProgressEvent(parsed: unknown): parsed is ProgressEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "progress"
  )
}

/**
 * 判断是否为mode事件
 */
export function isModeEvent(parsed: unknown): parsed is ModeEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "mode"
  )
}

/**
 * 判断是否为error事件
 */
export function isErrorEvent(parsed: unknown): parsed is ErrorEventMessage {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).type === "error"
  )
}

/**
 * 判断是否为OpenAI格式的文本chunk
 */
export function isOpenAIChunk(parsed: unknown): boolean {
  return (
    typeof parsed === "object" &&
    parsed !== null &&
    (parsed as Record<string, unknown>).object === "chat.completion.chunk"
  )
}

// ============ 兼容旧代码的类型别名（将逐步废弃） ============

/** @deprecated 使用 CanvasAction 代替 */
export const CanvasActionType = {
  ADD_COURSE_CARD: "canvas_add_CourseCard",
  REMOVE_ELEMENT: "canvas_remove_element",
  CLEAR_CANVAS: "canvas_clear",
  UPDATE_ELEMENT: "canvas_update_element",
} as const

/** @deprecated 使用 CanvasComponentType 代替 */
export const CanvasElementType = {
  COURSE_CARD: "CourseCard",
} as const

/** @deprecated 使用 isCanvasEvent 代替 */
export function isCanvasAction(type: string): boolean {
  return type.startsWith("canvas_")
}

/** @deprecated 使用新的数据接口代替 */
export interface ChapterData {
  id: string
  name: string
  theoryHours: number
  practiceHours: number
}

/** @deprecated 使用 CourseInfoData 代替 */
export interface CourseCardData {
  courseName: string
  courseNatureId?: number
  courseNatureName?: string
  courseType?: string
  openingDate?: string
  introduction?: string
  theoryPeriod?: number
  practicePeriod?: number
  teachingClass?: string
  teachingLocation?: string
  teachingTime?: string
  studentCount?: number
  credits?: number
  mainTextbook?: string
  referenceResources?: string
  attendancePolicy?: string
  assignmentPolicy?: string
  conductRequirements?: string
  practiceRequirements?: string
  teamworkRequirements?: string
  bonusRequirements?: string
  otherSuggestions?: string
  assessmentMethod?: string
  assessmentForm?: string
  scoreType?: string
  scoreTable?: { headers: string[]; rows: { [key: string]: string }[] }
  assessmentDescription?: string
  chapters?: ChapterData[]
}

/** @deprecated 使用 CanvasEventMessage 代替 */
export interface CanvasActionMessage {
  type: string
  elementId?: string
  elementType?: string
  data?: CourseCardData | Record<string, unknown>
  position?: ElementPosition
}
