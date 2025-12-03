/**
 * 全局类型定义
 *
 * 注意: 模块特定的类型已迁移到各模块的types目录
 * - Courses模块类型: src/modules/courses/types/
 * - Majors模块类型: src/modules/majors/types/
 *
 * 此文件仅保留真正全局共享的类型
 */

// ============================================================================
// 基础类型
// ============================================================================

export type NodeType = "root" | "university" | "department" | "major" | "course"

// 信息点类型 (K=知识, S=技能, A=态度)
export type InfoPointType = "K" | "S" | "A"

// 支撑强度类型
export type SupportStrength = "strong" | "weak"

// ============================================================================
// 督导与质量评价相关类型 (Universities模块使用)
// ============================================================================

// 发布范围成员信息
export type Long = number

export interface TaskMember {
  id: Long
  account: string
  name: string
  auth: string
  belong?: string
  permission?: number
  old?: boolean
  disabled?: boolean
}

// 教学督导任务接口

export interface TeachingSupervisoryTask {
  id?: Long
  universityId: Long
  title: string // 任务标题
  description?: string // 任务说明
  startDate: string // 开始日期
  endDate: string // 结束日期
  status: "not_started" | "in_progress" | "completed"
  creator: string
  scoringType?: "percentage" | "five_level"
  createdAt?: string
  updatedAt?: string
  archived?: boolean
  publishNodes?: PublishNode[] // 发布范围：选定的组织节点
  evaluationCriteria?: TaskEvaluationCriteria // 评价标准，任务接口可直接承载
  // 课程维度扩展信息（课程详情-教学督导使用）
  courseId?: Long
  courseName?: string
  majorId?: Long
  majorName?: string
  deptId?: Long
  deptName?: string
  collegeId?: Long
  evaluationRecordId?: Long
  selfEvaluationStatus?: string
  deptEvaluationStatus?: string
  schoolEvaluationStatus?: string
  overallStatus?: "not_started" | "in_progress" | "completed"
  selfTotalScore?: number | null
  deptTotalScore?: number | null
  schoolTotalScore?: number | null
  finalScore?: number | null
  selfSubmittedAt?: string | null
  deptSubmittedAt?: string | null
  schoolSubmittedAt?: string | null
}

export interface PublishNode {
  nodeId: string  // 保留原始格式，如 'course_2334'
  nodeName?: string  // 用于UI回显
}

// 条件表达式（用于系统指标）
export interface ConditionExpression {
  operator: ">" | "<" | ">=" | "<=" | "=" | "contains" | "not_contains"
  threshold: number
}

// 评价等级
export interface EvaluationLevel {
  level: "A" | "B" | "C" | "D"
  description: string
  coefficient: number
  condition?: ConditionExpression
}

// 系统指标选项
export type SystemIndicator =
  | "course_development_completion"
  | "course_point_optimization_count"
  | "teaching_indicator_count"
  | "resource_count"
  | "material_count"

// 评价标准项接口
export interface EvaluationCriterion {
  id: Long
  sequence: number
  type: "business" | "system"
  indicator?: string
  systemIndicator?: SystemIndicator
  fullScore: number
  weight?: number
  evidenceRequirement?: string
  levels: EvaluationLevel[]
}

export interface TaskEvaluationCriteria {
  taskId?: Long
  universityId: Long
  items: EvaluationCriterion[]
  updatedAt?: string
}

// ============================================================================
// 树节点接口
// ============================================================================

export interface TreeNode {
  nodeId: string  // 使用 API 返回的原始 nodeId 格式（如 'dept_266', 'course_2334'）
  nodeName: string
  nodeType: NodeType
  parentId?: string
  nodeLevel?: number
  children?: TreeNode[]
  isStarred?: boolean
  // 兼容属性：从 nodeId 解析出的数字 ID（右侧组件使用）
  id?: string
  // 兼容属性：等同于 nodeName（右侧组件使用）
  name?: string
  // 兼容属性：等同于 nodeType（右侧组件使用）
  type?: NodeType
  // 兼容属性：节点描述信息
  description?: string
}

// ============================================================================
// 组件Props类型 (全局共享组件)
// ============================================================================

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

// ============================================================================
// 存储键常量
// ============================================================================

export const STORAGE_KEYS = {
  TREE_DATA: "education-tree-data",
  CURRENT_SCHOOL: "education-current-school",
} as const
