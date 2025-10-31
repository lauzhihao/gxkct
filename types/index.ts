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
