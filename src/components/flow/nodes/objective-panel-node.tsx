"use client"

import { memo, useCallback } from "react"
import { Target } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

interface ObjectivePanelNodeProps {
  id: string
  data: PanelData & {
    isDeleting?: boolean
    isRefreshing?: boolean
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    onEdit?: (nodeId: string) => void
    childCount?: number
    onAdd?: () => void
  }
  selected?: boolean
}

/**
 * 教学目标 Panel 节点组件
 * 作为 Group Node 包含多个 ObjectiveNode 子节点
 */
export const ObjectivePanelNode = memo(function ObjectivePanelNode({
  id,
  data,
  selected,
}: ObjectivePanelNodeProps) {
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
      icon={<Target className="h-4 w-4" />}
      title="教学目标"
      headerColorClass="bg-blue-100/90"
      borderColorClass="border-blue-300"
      bgColorClass="bg-blue-50/60 backdrop-blur-sm"
      textColorClass="text-blue-700"
      handleColorClass="!bg-blue-500"
      showLeftHandle={true}
      childCount={data.childCount}
      onAdd={handleAdd}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      onEdit={handleEdit}
    />
  )
})

export default ObjectivePanelNode
