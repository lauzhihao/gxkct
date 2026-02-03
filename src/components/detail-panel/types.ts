import type { TreeNode } from "@/types"

export interface DetailPanelProps {
  node: TreeNode | null
  treeData: TreeNode
  onNodeSelect: (node: TreeNode | null) => void
  onAddDepartment?: (universityId: string, newDepartment: Omit<TreeNode, "id" | "nodeId">) => void
  onAddMajor?: (departmentId: string, newMajor: Omit<TreeNode, "id" | "nodeId">) => void
  onAddCourse?: (majorId: string, newCourse: Omit<TreeNode, "id" | "nodeId">) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode?: (nodeId: string) => void
  onSetCurrentSchool?: (schoolId: string) => void
  onEdit?: (node: TreeNode) => void
  onDelete?: (nodeId: string) => void
  departmentMajors?: Map<string, TreeNode[]>
  currentUser?: { username: string; role: string } | null
  // 添加onToggleExpand回调用于动态加载数据
  onToggleExpand?: (nodeId: string) => void
}

export interface FileData {
  name: string
  size: string
  date: string
  type: string
  uploader: string
  version: string
}
