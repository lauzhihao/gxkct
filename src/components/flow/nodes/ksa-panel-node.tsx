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
    ksaStats?: {
      K: number
      S: number
      A: number
    }
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
  const stats = data.ksaStats || { K: 0, S: 0, A: 0 }

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

  const handleStatCardClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation()
    data.onEdit?.(id)
  }, [data, id])

  const statCards = [
    {
      key: "K",
      labelCn: "知识",
      labelEn: "Knowledge",
      value: stats.K,
      className: "border-amber-300 bg-amber-50/85 text-amber-900 hover:bg-amber-100",
    },
    {
      key: "S",
      labelCn: "技能",
      labelEn: "Skill",
      value: stats.S,
      className: "border-cyan-300 bg-cyan-50/85 text-cyan-900 hover:bg-cyan-100",
    },
    {
      key: "A",
      labelCn: "态度",
      labelEn: "Attitude",
      value: stats.A,
      className: "border-rose-300 bg-rose-50/85 text-rose-900 hover:bg-rose-100",
    },
  ]

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
      onAdd={undefined}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      progressMessage={data.progressMessage}
    >
      <div className="grid h-full grid-cols-3 gap-2">
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={handleStatCardClick}
            className={`flex flex-col items-center justify-center rounded-lg border shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md nopan nodrag ${card.className}`}
          >
            <span className="text-[12px] font-semibold leading-none">{card.labelCn}</span>
            <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.08em] leading-none opacity-80">{card.labelEn}</span>
            <span className="mt-2 text-[30px] font-bold leading-none tabular-nums">{card.value}</span>
          </button>
        ))}
      </div>
    </BasePanelNode>
  )
})

export default KsaPanelNode
