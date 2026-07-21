/**
 * 课程开发助手常量配置
 */

import type { CourseDevStage, StageInfo, CourseType, QuickOption } from './types'

// ============================================================================
// 流程阶段配置
// ============================================================================

/** 阶段顺序映射 */
export const STAGE_ORDER: Record<CourseDevStage, number> = {
  welcome: 0,
  basic_info: 1,
  chapters: 2,
  points: 3,
  ksa: 4,
  preview: 5,
  complete: 6,
}

/** 阶段信息列表 */
export const STAGES: StageInfo[] = [
  { id: 'welcome', name: '开始', description: '欢迎使用课程开发助手', order: 0 },
  { id: 'basic_info', name: '基本信息', description: '课程名称、类型、简介、学时', order: 1 },
  { id: 'chapters', name: '章节结构', description: '规划课程章节/项目', order: 2 },
  { id: 'points', name: '课点', description: '定义课程知识点', order: 3 },
  { id: 'ksa', name: 'KSA', description: '知识/技能/态度', order: 4 },
  { id: 'preview', name: '预览', description: '确认课程信息', order: 5 },
  { id: 'complete', name: '完成', description: '课程创建完成', order: 6 },
]

/** 获取下一阶段 */
export function getNextStage(current: CourseDevStage): CourseDevStage | null {
  const order = STAGE_ORDER[current]
  const next = STAGES.find(s => s.order === order + 1)
  return next?.id ?? null
}

/** 获取上一阶段 */
export function getPrevStage(current: CourseDevStage): CourseDevStage | null {
  const order = STAGE_ORDER[current]
  const prev = STAGES.find(s => s.order === order - 1)
  return prev?.id ?? null
}

// ============================================================================
// 课程类型（从 mock 数据提取）
// ============================================================================

export const COURSE_TYPES: CourseType[] = [
  { id: 1, name: '通识教育课' },
  { id: 2, name: '学科基础课' },
  { id: 3, name: '专业课' },
  { id: 4, name: '集中实践教学环节' },
  { id: 5, name: '综合教育' },
]

// ============================================================================
// 引导话术模板
// ============================================================================

export const STAGE_PROMPTS: Record<CourseDevStage, {
  greeting: string
  instruction: string
  example?: string
  thinkingHints: string[]
}> = {
  welcome: {
    greeting: '你好！我是课程开发助手，将协助你完成课程的创建。',
    instruction: '整个过程包括：基本信息填写、章节规划、课点定义、KSA设置。准备好了吗？',
    thinkingHints: [],
  },
  basic_info: {
    greeting: '首先，让我们来设置课程的基本信息。',
    instruction: '请告诉我课程的名称，以及它属于哪种类型的课程？你也可以简单描述一下这门课程。',
    example: '例如：这门课叫"工程测量学"，是一门学科基础课，主要教授工程建设中的测量知识和技能。理论24学时，实践16学时。',
    thinkingHints: [
      '正在检查课程名称是否符合规范...',
      '正在匹配课程类型...',
      '正在分析课程简介完整性...',
    ],
  },
  chapters: {
    greeting: '基本信息已记录。接下来，让我们规划课程的章节结构。',
    instruction: '请描述课程的章节或项目划分，包括每个章节的名称和学时分配。',
    example: '例如：第一章绑论2学时理论；第二章水准测量4学时理论8学时实践...',
    thinkingHints: [
      '正在根据课程类型检索章节模板...',
      '正在分析学时分配合理性...',
      '正在检查章节覆盖度...',
    ],
  },
  points: {
    greeting: '章节结构已确定。现在让我们定义课程的知识点（课点）。',
    instruction: '请列出这门课程需要掌握的核心知识点。我也会根据课程内容推荐一些相关的课点供你参考。',
    example: '例如：测量学的基本概念、水准测量原理、经纬仪的使用方法...',
    thinkingHints: [
      '正在检索相关领域的知识点库...',
      '正在根据章节内容匹配课点...',
      '正在分析课点与章节的关联性...',
    ],
  },
  ksa: {
    greeting: '课点已记录。最后，让我们设置课程的KSA（知识/技能/态度）目标。',
    instruction: 'KSA分为三类：K-知识（Knowledge）、S-技能（Skill）、A-态度（Attitude）。请描述学生学完这门课后应具备的知识、技能和态度。',
    example: '例如：知识方面-掌握水准测量计算方法；技能方面-能够独立操作经纬仪；态度方面-具备精益求精的工匠精神...',
    thinkingHints: [
      '正在检索相关KSA模板...',
      '正在分析KSA与课点的对应关系...',
      '正在检查KSA分类均衡性...',
    ],
  },
  preview: {
    greeting: '所有信息已收集完成！',
    instruction: '请查看下方的课程信息摘要，确认无误后点击"确认完成"，或选择需要修改的部分。',
    thinkingHints: [
      '正在生成课程摘要...',
      '正在检查数据完整性...',
      '正在验证格式规范...',
    ],
  },
  complete: {
    greeting: '课程创建完成！',
    instruction: '你可以复制或下载课程数据，用于后续的系统导入。',
    thinkingHints: [],
  },
}

// ============================================================================
// 快捷选项配置
// ============================================================================

/** 欢迎阶段选项 */
export const WELCOME_OPTIONS: QuickOption[] = [
  { id: 'start', label: '开始创建课程', value: 'start', description: '进入课程创建流程' },
]

/** 课程类型选项 */
export const COURSE_TYPE_OPTIONS: QuickOption[] = COURSE_TYPES.map(type => ({
  id: `type_${type.id}`,
  label: type.name,
  value: type.id.toString(),
  description: `选择 ${type.name}`,
}))

/** 确认选项 */
export const CONFIRM_OPTIONS: QuickOption[] = [
  { id: 'confirm', label: '确认，继续下一步', value: 'confirm' },
  { id: 'modify', label: '需要修改', value: 'modify' },
]

/** 预览阶段选项 */
export const PREVIEW_OPTIONS: QuickOption[] = [
  { id: 'complete', label: '确认完成', value: 'complete' },
  { id: 'edit_basic', label: '修改基本信息', value: 'edit_basic' },
  { id: 'edit_chapters', label: '修改章节', value: 'edit_chapters' },
  { id: 'edit_points', label: '修改课点', value: 'edit_points' },
  { id: 'edit_ksa', label: '修改KSA', value: 'edit_ksa' },
]

/** 完成阶段选项 */
export const COMPLETE_OPTIONS: QuickOption[] = [
  { id: 'copy', label: '复制数据', value: 'copy' },
  { id: 'download', label: '下载JSON', value: 'download' },
  { id: 'new', label: '创建新课程', value: 'new' },
]

// ============================================================================
// 意图识别关键词
// ============================================================================

export const INTENT_KEYWORDS = {
  confirm: ['确认', '好的', '可以', '没问题', '继续', 'ok', 'yes', '是', '对'],
  reject: ['不对', '重新', '修改', '不是', '错了', '不行', 'no'],
  back: ['返回', '上一步', '回去', '后退'],
  skip: ['跳过', '先不', '以后', '暂时'],
}

// ============================================================================
// 默认数据
// ============================================================================

/** 初始课程数据 */
export const INITIAL_COURSE_DATA = {
  basicInfo: {},
  chapters: [],
  points: [],
  ksas: [],
}

// ============================================================================
// 基本信息字段配置（四真三化标准逐字段询问）
// ============================================================================

/** 字段类型 */
export type FieldType = 'input' | 'select'

/** 字段配置 */
export interface FieldConfig {
  key: keyof import('./types').CourseBasicInfo
  label: string
  type: FieldType
  options?: QuickOption[]
  placeholder?: string
}

/** 基本信息字段配置列表（按优先级排序） */
export const BASIC_INFO_FIELDS: FieldConfig[] = [
  {
    key: 'name',
    label: '课程名称',
    type: 'input',
    placeholder: '请输入课程名称，例如：工程测量学',
  },
  {
    key: 'typeId',
    label: '课程类型',
    type: 'select',
    options: COURSE_TYPE_OPTIONS,
  },
  {
    key: 'introduction',
    label: '课程简介',
    type: 'input',
    placeholder: '请简要描述这门课程的主要内容和培养目标',
  },
  {
    key: 'theoryPeriod',
    label: '理论学时',
    type: 'input',
    placeholder: '请输入理论学时数，例如：24',
  },
  {
    key: 'practicePeriod',
    label: '实践学时',
    type: 'input',
    placeholder: '请输入实践学时数，例如：16',
  },
]

/**
 * 生成四真三化格式的字段询问消息
 * @param courseName 课程名称（如果已填写）
 * @param field 字段配置
 */
export function generateFieldPrompt(courseName: string | undefined, field: FieldConfig): string {
  const courseNamePart = courseName ? `您的"${courseName}"` : '您的课程'
  return `根据四真三化课程标准要求，${courseNamePart}还需要提供**${field.label}**信息。${field.placeholder ? `\n\n${field.placeholder}` : ''}`
}
