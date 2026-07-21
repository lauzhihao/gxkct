"use client"

import { memo, useCallback } from "react"
import { FileText } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

interface ChapterPanelNodeProps {
  id: string
  data: PanelData & {
    isDeleting?: boolean
    isLoading?: boolean
    isRefreshing?: boolean
    progressMessage?: string | null
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    childCount?: number
    onAdd?: () => void
    onEdit?: (panelId: string) => void
  }
  selected?: boolean
}

/**
 * 章节 Panel 节点组件
 * 作为 Group Node 包含多个 ChapterNode 子节点
 * 特有右侧矩阵扩展连接点
 */
export const ChapterPanelNode = memo(function ChapterPanelNode({
  id,
  data,
  selected,
}: ChapterPanelNodeProps) {
  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  // 处理重做按钮点击
  const handleRefresh = useCallback(() => {
    data.onRefresh?.(id)
  }, [data, id])

  // 处理添加按钮点击
  const handleAdd = useCallback(() => {
    data.onAdd?.()
  }, [data])

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    data.onEdit?.(id)
  }, [data, id])

  return (
    <BasePanelNode
      id={id}
      selected={selected}
      isDeleting={data.isDeleting}
      isLoading={data.isLoading}
      isRefreshing={data.isRefreshing}
      icon={<FileText className="h-4 w-4" />}
      title="章节 / 项目"
      headerColorClass="bg-purple-100/90"
      borderColorClass="border-purple-300"
      bgColorClass="bg-purple-50/60 backdrop-blur-sm"
      textColorClass="text-purple-700"
      handleColorClass="!bg-purple-500"
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

export default ChapterPanelNode
