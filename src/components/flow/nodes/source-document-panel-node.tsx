"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { FileStack } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

/**
 * 扩展的源文档面板数据类型，包含注入的回调
 */
interface SourceDocumentPanelNodeData extends PanelData {
  highlighted?: boolean
  isDeleting?: boolean
  isLoading?: boolean
  isRefreshing?: boolean
  childCount?: number
  onEdit?: (nodeId: string) => void
  onDelete?: (nodeId: string) => void
  onRefresh?: (nodeId: string) => void
  onAdd?: (panelType: string, panelId: string) => void
  progressMessage?: string | null
}

/**
 * 源文档面板节点
 * 作为 Group Node 容纳多个源文档卡片
 */
export const SourceDocumentPanelNode = memo(function SourceDocumentPanelNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<any>) {
  // [MOD] 使用类型断言确保 data 类型正确推导
  const nodeData = data as SourceDocumentPanelNodeData

  // 处理编辑按钮点击
  const handleEdit = useCallback((nodeId: string) => {
    nodeData.onEdit?.(nodeId)
  }, [nodeData])

  // 处理删除按钮点击
  const handleDelete = useCallback((nodeId: string) => {
    nodeData.onDelete?.(nodeId)
  }, [nodeData])

  // 处理重做按钮点击
  const handleRefresh = useCallback((nodeId: string) => {
    nodeData.onRefresh?.(nodeId)
  }, [nodeData])

  // 处理添加按钮点击
  const handleAdd = useCallback(() => {
    nodeData.onAdd?.("sourceDocumentPanel", id)
  }, [nodeData, id])

  return (
    <BasePanelNode
      id={id}
      selected={selected}
      isDeleting={nodeData.isDeleting}
      isLoading={nodeData.isLoading}
      isRefreshing={nodeData.isRefreshing}
      icon={<FileStack className="h-4 w-4" />}
      title="源文档"
      headerColorClass="bg-orange-100"
      borderColorClass="border-orange-300"
      bgColorClass="bg-orange-50/30"
      textColorClass="text-orange-700"
      handleColorClass="!bg-orange-500"
      width={width}
      height={height}
      showLeftHandle={false}
      showRightHandle={false}
      showSourceHandle={true}
      childCount={nodeData.childCount}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      progressMessage={nodeData.progressMessage}
    />
  )
})

export default SourceDocumentPanelNode
