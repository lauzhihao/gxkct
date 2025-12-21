/**
 * 课程开发助手类型定义
 *
 * 设计原则：
 * 1. 接口与实现分离，便于后续替换真实 API
 * 2. 所有与后端交互的数据结构单独定义，便于对接
 */

// ============================================================================
// 流程阶段定义
// ============================================================================

/** 课程开发流程阶段 */
export type CourseDevStage =
  | 'welcome'      // 欢迎页，介绍流程
  | 'basic_info'   // 收集基本信息：名称、类型、简介、学时
  | 'chapters'     // 收集章节/项目结构
  | 'points'       // 收集课点
  | 'ksa'          // 收集 KSA（知识/技能/态度）
  | 'preview'      // 预览确认
  | 'complete'     // 完成

/** 阶段元信息 */
export interface StageInfo {
  id: CourseDevStage
  name: string
  description: string
  order: number
}

// ============================================================================
// 课程数据结构（最终输出格式，对接后端）
// ============================================================================

/** 课程类型 */
export interface CourseType {
  id: number
  name: string
}

/** 章节/项目 */
export interface ChapterData {
  id?: string
  name: string
  theoryPeriod: number    // 理论学时
  practicePeriod: number  // 实践学时
}

/** 课点 */
export interface PointData {
  id?: string
  title: string
  description: string
}

/** KSA 点（知识/技能/态度） */
export interface KsaData {
  id?: string
  type: 'K' | 'S' | 'A'
  title: string
  description: string
}

/** 课程基本信息 */
export interface CourseBasicInfo {
  name: string
  typeId: number
  typeName?: string
  introduction: string
  theoryPeriod: number
  practicePeriod: number
}

/** 完整的课程数据结构（最终输出） */
export interface CourseDevData {
  basicInfo: Partial<CourseBasicInfo>
  chapters: ChapterData[]
  points: PointData[]
  ksas: KsaData[]
}

/** 导出给后端的 JSON 格式 */
export interface CourseExportData {
  course: {
    name: string
    typeId: number
    introduction: string
    theoryPeriod: number
    practicePeriod: number
    courseMatrixVOS: Array<{
      name: string
      theoryPeriod: string
      practicePeriod: string
    }>
  }
  pointksa: {
    points: Array<{
      title: string
      description: string
    }>
    ksas: Array<{
      title: 'K' | 'S' | 'A'
      description: string
      level: number
    }>
  }
}

// ============================================================================
// 消息与交互类型
// ============================================================================

/** 思考步骤 */
export interface ThinkingStep {
  id: string
  content: string
  status: 'pending' | 'processing' | 'done'
}

/** 快捷选项 */
export interface QuickOption {
  id: string
  label: string
  value: string
  description?: string
}

/** 消息角色 */
export type MessageRole = 'user' | 'assistant'

/** 消息内容类型 */
export type MessageContentType = 'text' | 'markdown' | 'options' | 'preview'

/** 聊天消息 */
export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  contentType?: MessageContentType
  timestamp: number
  /** 思考过程（仅 assistant 消息） */
  thinkingSteps?: ThinkingStep[]
  /** 快捷选项（仅 assistant 消息） */
  quickOptions?: QuickOption[]
  /** 是否正在流式输出 */
  isStreaming?: boolean
  /** 关联的阶段 */
  stage?: CourseDevStage
}

// ============================================================================
// 服务接口定义（便于热插拔）
// ============================================================================

/**
 * 课程数据服务接口
 * 当前使用 Mock 实现，后续可替换为真实 API
 */
export interface ICourseDataService {
  /** 根据关键词检索推荐的课点 */
  searchPoints(keyword: string, courseType?: number): Promise<PointData[]>

  /** 根据关键词检索推荐的 KSA */
  searchKsas(keyword: string, courseType?: number): Promise<KsaData[]>

  /** 根据课程类型获取推荐的章节模板 */
  getChapterTemplates(courseType: number): Promise<ChapterData[]>

  /** 获取课程类型列表 */
  getCourseTypes(): Promise<CourseType[]>

  /** 保存课程数据（可选实现） */
  saveCourse?(data: CourseExportData): Promise<{ success: boolean; id?: string }>
}

/**
 * 消息解析服务接口
 * 当前使用本地规则，后续可替换为 LLM API
 */
export interface IMessageParserService {
  /** 从用户输入中提取基本信息 */
  extractBasicInfo(input: string): Partial<CourseBasicInfo>

  /** 从用户输入中提取章节信息 */
  extractChapters(input: string): ChapterData[]

  /** 从用户输入中提取课点 */
  extractPoints(input: string): PointData[]

  /** 从用户输入中提取 KSA */
  extractKsas(input: string): KsaData[]

  /** 判断用户意图 */
  parseIntent(input: string): UserIntent
}

/** 用户意图类型 */
export type UserIntent =
  | { type: 'confirm' }           // 确认
  | { type: 'reject' }            // 拒绝/重新输入
  | { type: 'back' }              // 返回上一步
  | { type: 'skip' }              // 跳过当前步骤
  | { type: 'select'; index: number }  // 选择选项
  | { type: 'input'; content: string } // 自由输入

// ============================================================================
// 组件 Props 类型
// ============================================================================

/** 主组件 Props */
export interface CourseDevAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 完成时的回调，返回最终数据 */
  onComplete?: (data: CourseExportData) => void
  /** 当前专业 ID（用于关联） */
  majorId?: string
  /** 用户名称 */
  userName?: string
}

/** 思考过程组件 Props */
export interface ThinkingProcessProps {
  steps: ThinkingStep[]
  isActive: boolean
}

/** 快捷选项组件 Props */
export interface QuickOptionsProps {
  options: QuickOption[]
  onSelect: (option: QuickOption) => void
  disabled?: boolean
}

/** 进度指示组件 Props */
export interface StageProgressProps {
  currentStage: CourseDevStage
  stages: StageInfo[]
}

/** 结果预览组件 Props */
export interface ResultPreviewProps {
  markdown: string
  onConfirm: () => void
  onEdit: (section: string) => void
  onExportJson: () => void
}
