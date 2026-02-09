/**
 * Courses模块组件Props类型定义
 */

import type { TreeNode } from "@/types"

// CourseProjectMatrix主组件Props
export interface CourseProjectMatrixProps {
  node: TreeNode
  onUpdate: (updates: Record<string, unknown>) => void
  majorId?: string | number
}

// 其他组件Props可在此添加
// 注: 旧组件的Props保持在组件文件中,新增组件或重构组件的Props应迁移至此
