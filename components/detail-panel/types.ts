import type { TreeNode } from "@/types"

export interface DetailPanelProps {
  node: TreeNode
  treeData: TreeNode
  onNodeSelect: (node: TreeNode | null) => void
  onAddDepartment?: (universityId: string, newDepartment: Omit<TreeNode, "id">) => void
  onAddMajor?: (departmentId: string, newMajor: Omit<TreeNode, "id">) => void
  onAddCourse?: (majorId: string, newCourse: Omit<TreeNode, "id">) => void
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  onDeleteNode?: (nodeId: string) => void
  onSetCurrentSchool?: (schoolId: string) => void
  onEdit?: (node: TreeNode) => void
  onDelete?: (nodeId: string) => void
}

export interface FileData {
  name: string
  size: string
  date: string
  type: string
  uploader: string
  version: string
}
