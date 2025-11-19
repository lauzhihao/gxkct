// 基础类型
export type NodeType = "root" | "university" | "department" | "major" | "course"

// 信息点类型 (K=知识, S=技能, A=态度)
export type InfoPointType = "K" | "S" | "A"

// 支撑强度类型
export type SupportStrength = "strong" | "weak"

// 信息点接口
export interface InfoPoint {
  id: string
  type: InfoPointType
  content: string
}

// 课点接口
export interface CoursePoint {
  id: string
  content: string
  title?: string
  description?: string
  infoPoints?: InfoPoint[]
}

// 教学目标接口
export interface TeachingObjective {
  id: string
  content: string
  name?: string
  points?: string[]
}

// 章节接口
export interface Chapter {
  id: string
  name: string
  theoryHours?: number
  practiceHours?: number
}

// 资源接口
export interface Resource {
  id: string
  name: string
  type: string
  url?: string
  size?: string
  uploadDate?: string
}

// 教材接口
export interface TeachingMaterial {
  id: string
  name: string
  author?: string
  publisher?: string
  isbn?: string
  year?: string
}

// 课程矩阵单元格数据
export interface CourseMatrixCell {
  id: string
  name: string
  description: string
  support: SupportStrength
}

// 任务目标接口
export interface TaskObjective {
  id: string
  content: string
  ksaPoints?: KsaPoint[]
}

// KSA点接口
export interface KsaPoint {
  id: string
  title: string
  description: string
}

// 教学督导任务接口
export interface TeachingSupervisoryTask {
  id: string
  universityId: string
  title: string // 任务标题，例如：2025秋季学期教学档案检查
  description?: string // 任务说明，500字多行文本
  startDate: string // 开始日期
  endDate: string // 结束日期
  status: "not_started" | "in_progress" | "completed" // 状态：未开始、进行中、已结束
  creator?: string // 创建人
  createdAt: string
  updatedAt?: string
}

// 条件表达式（用于系统指标）
export interface ConditionExpression {
  operator: ">" | "<" | ">=" | "<=" | "=" | "contains" | "not_contains" // 运算符
  threshold: number // 阈值（数值型，包含两位小数）
}

// 评价等级
export interface EvaluationLevel {
  level: "A" | "B" | "C" | "D" // 等级序号
  description: string // 等级说明（最多500字）
  coefficient: number // 等级系数（0.1-1之间的小数）
  condition?: ConditionExpression // 条件表达式（仅用于系统指标）
}

// 系统指标选项
export type SystemIndicator =
  | "course_development_completion" // 课程开发完成度
  | "course_point_optimization_count" // 课点优化次数
  | "teaching_indicator_count" // 教学指标数量
  | "resource_count" // 资源数量
  | "material_count" // 教材数量

// 评价标准项接口
export interface EvaluationStandardItem {
  id: string
  sequence: number // 序号（自动增加）
  type: "business" | "system" // 标准项类型：业务指标或系统指标，默认业务指标
  indicator: string // 指标项（必填，单行文本，200字）
  systemIndicator?: SystemIndicator // 系统指标类型（仅当 type 为 system 时使用）
  fullScore: number // 本项满分（0-100整数）
  levels: EvaluationLevel[] // 等级列表（最少1个，最多4个ABCD）
}

// 教学质量评价标准接口
export interface TeachingQualityStandard {
  id: string
  taskId: string // 关联的任务ID
  universityId: string
  items: EvaluationStandardItem[] // 评价标准项列表
  createdAt: string
  updatedAt?: string
}

// 元数据接口 - 根据节点类型不同而不同
export interface UniversityMetadata {
  description?: string
  address?: string
  website?: string
  establishedYear?: string
}

export interface DepartmentMetadata {
  description?: string
  head?: string
  contact?: string
}

export interface MajorMetadata {
  description?: string
  objectives?: string[]
  duration?: string
  degree?: string
  requiresVOS?: any[]
  matrixSupportLevels?: Record<string, string>
}

export interface CourseMetadata {
  courseType?: string
  courseNature?: string
  openingDate?: string
  teachingObjectives?: TeachingObjective[]
  coursePoints?: CoursePoint[]
  chapters?: Chapter[]
  resources?: Resource[]
  teachingMaterials?: TeachingMaterial[]
  courseMajorMatrixSupportLevels?: Record<string, string>
}

// 联合类型的元数据
export type NodeMetadata = UniversityMetadata | DepartmentMetadata | MajorMetadata | CourseMetadata

// 树节点接口
export interface TreeNode {
  id: string
  name: string
  type: NodeType
  children?: TreeNode[]
  metadata?: NodeMetadata
  isStarred?: boolean
}

// 组件Props类型
export interface DetailPanelProps {
  node: TreeNode | null
  treeData?: TreeNode | null
  onNodeSelect?: (node: TreeNode) => void
  onEdit?: (nodeId: string, updates: Partial<TreeNode>) => void
  onDelete?: (nodeId: string) => void
  onAddDepartment?: (universityId: string, newDepartment: Omit<TreeNode, "id">) => void
  onAddMajor?: (departmentId: string, newMajor: Omit<TreeNode, "id">) => void
  onAddCourse?: (majorId: string, newCourse: Omit<TreeNode, "id">) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode?: (nodeId: string) => void
}

export interface TreeViewProps {
  treeData: TreeNode | null
  onNodeSelect: (node: TreeNode) => void
  selectedNode: TreeNode | null
  onAddSchool: (newSchool: Omit<TreeNode, "id">) => void
  currentSchoolId: string | null
  onSetCurrentSchool: (schoolId: string) => void
}

// 课程矩阵数据结构
export type CourseMatrixData = Record<string, CourseMatrixCell[]>

// 章节任务目标数据结构
export type ChapterTaskObjectives = Record<string, TaskObjective[]>

// 存储键常量
export const STORAGE_KEYS = {
  TREE_DATA: "education-tree-data",
  CURRENT_SCHOOL: "education-current-school",
} as const
