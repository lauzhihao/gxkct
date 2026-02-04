"use client"

import { memo, useCallback } from "react"
import { Layers } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

interface KsaPanelNodeProps {
  id: string
  data: PanelData & {
    isDeleting?: boolean
    isRefreshing?: boolean
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    childCount?: number
    onAdd?: () => void
    onEdit?: (panelId: string) => void
    progressMessage?: string | null
    // 展开/折叠相关
    onExpand?: (nodeId: string) => void
    onCollapse?: (nodeId: string) => void
  }
  selected?: boolean
}

// KSA渐变色样式：从左到右 K(黄色/amber) -> S(青色/cyan) -> A(粉色/rose)
const ksaGradientStyle: React.CSSProperties = {
  background: "linear-gradient(to right, rgb(253 230 138 / 0.9), rgb(165 243 252 / 0.9), rgb(253 164 175 / 0.9))",
}

/**
 * KSA Panel 节点组件
 * 作为 Group Node 包含多个 KsaNode 子节点
 * KSA = Knowledge（知识）, Skill（技能）, Attitude（态度）
 */
export const KsaPanelNode = memo(function KsaPanelNode({
  id,
  data,
  selected,
}: KsaPanelNodeProps) {
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
      isRefreshing={data.isRefreshing}
      icon={<Layers className="h-4 w-4" />}
      title="KSA"
      headerStyle={ksaGradientStyle}
      borderColorClass="border-amber-300"
      bgColorClass="bg-amber-50/60 backdrop-blur-sm"
      textColorClass="text-amber-700"
      handleColorClass="!bg-amber-500"
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

export default KsaPanelNode
