"use client"

import { memo, useCallback } from "react"
import { BookOpen } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

interface CoursePointPanelNodeProps {
  id: string
  data: PanelData & {
    isDeleting?: boolean
    isRefreshing?: boolean
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    onEdit?: (nodeId: string) => void
    childCount?: number
    onAdd?: () => void
    progressMessage?: string | null
  }
  selected?: boolean
}

/**
 * 课点 Panel 节点组件
 * 作为 Group Node 包含多个 CoursePointNode 子节点
 */
export const CoursePointPanelNode = memo(function CoursePointPanelNode({
  id,
  data,
  selected,
}: CoursePointPanelNodeProps) {
  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id)
  }, [data, id])

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  // 处理添加按钮点击
  const handleAdd = useCallback(() => {
    data.onAdd?.()
  }, [data])

  return (
    <BasePanelNode
      id={id}
      selected={selected}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      icon={<BookOpen className="h-4 w-4" />}
      title="课点信息"
      headerColorClass="bg-green-100/90"
      borderColorClass="border-green-300"
      bgColorClass="bg-green-50/60 backdrop-blur-sm"
      textColorClass="text-green-700"
      handleColorClass="!bg-green-500"
      showLeftHandle={true}
      childCount={data.childCount}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      progressMessage={data.progressMessage}
    />
  )
})

export default CoursePointPanelNode
