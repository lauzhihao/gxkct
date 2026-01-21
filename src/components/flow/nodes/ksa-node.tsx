"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Brain, Wrench, Heart } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { KsaItemData } from "@/components/canvas-elements/types"

// KSA 类别配置
const KSA_CONFIG = {
  K: {
    label: "知识",
    icon: Brain,
    headerColorClass: "bg-amber-100",
    borderColorClass: "border-amber-200",
    textColorClass: "text-amber-700",
  },
  S: {
    label: "技能",
    icon: Wrench,
    headerColorClass: "bg-cyan-100",
    borderColorClass: "border-cyan-200",
    textColorClass: "text-cyan-700",
  },
  A: {
    label: "态度",
    icon: Heart,
    headerColorClass: "bg-rose-100",
    borderColorClass: "border-rose-200",
    textColorClass: "text-rose-700",
  },
}

/**
 * 扩展的 KSA 数据类型
 */
interface KsaNodeData extends KsaItemData {
  highlighted?: boolean
  isDeleting?: boolean
  onDelete?: (nodeId: string) => void
}

/**
 * KSA 节点 - 支持高亮联动
 */
export const KsaNode = memo(function KsaNode({
  id,
  data,
  selected,
}: NodeProps<KsaNodeData>) {
  const config = KSA_CONFIG[data.category] || KSA_CONFIG.K
  const Icon = config.icon
  const highlighted = data.highlighted ?? false

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={highlighted}
      isDeleting={data.isDeleting}
      icon={<Icon className="h-4 w-4" />}
      title={`${config.label} ${data.category}${data.index}`}
      headerColorClass={config.headerColorClass}
      borderColorClass={config.borderColorClass}
      textColorClass={config.textColorClass}
      width={260}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      <p className="text-sm text-gray-700 line-clamp-2">{data.content}</p>
    </BaseFlowNode>
  )
})

export default KsaNode
