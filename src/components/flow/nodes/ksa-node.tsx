"use client"

import { memo } from "react"
import { type NodeProps, type Node } from "@xyflow/react"
import { Brain, Wrench, Heart } from "lucide-react"
import { BaseStaticCardNode } from "./base-static-card-node"
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
  isLoading?: boolean
  progressMessage?: string | null
  // 索引签名，满足 @xyflow/react Node 泛型约束
  [key: string]: unknown
}

/**
 * KSA 节点类型
 */
type KsaNodeType = Node<KsaNodeData, "ksa">

/**
 * KSA 节点 - 支持高亮联动
 */
export const KsaNode = memo(function KsaNode({
  data,
  selected,
}: NodeProps<KsaNodeType>) {
  const config = KSA_CONFIG[data.category] || KSA_CONFIG.K
  const Icon = config.icon
  const highlighted = data.highlighted ?? false

  return (
    <BaseStaticCardNode
      selected={selected}
      highlighted={highlighted}
      isDeleting={data.isDeleting}
      isLoading={data.isLoading}
      progressMessage={data.progressMessage}
      icon={<Icon className="h-4 w-4" />}
      title={`${config.label} ${data.category}${data.index}`}
      headerColorClass={config.headerColorClass}
      borderColorClass={config.borderColorClass}
      textColorClass={config.textColorClass}
      width={260}
    >
      <p className="text-sm text-gray-700 line-clamp-2">{data.content}</p>
    </BaseStaticCardNode>
  )
})

export default KsaNode
