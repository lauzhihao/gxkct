"use client"

import { memo } from "react"
import { type NodeProps } from "@xyflow/react"
import { Target } from "lucide-react"
import { BaseStaticCardNode } from "./base-static-card-node"
import type { ObjectiveCardData } from "@/components/canvas-elements/types"
import { SupportLabel } from "@/shared/components/support-label"

/**
 * 教学目标节点数据类型
 * 注意：@xyflow/react 的 Node 类型要求 data 满足 Record<string, unknown> 约束
 * 通过类型断言在运行时确保类型安全
 */
interface ObjectiveNodeData extends ObjectiveCardData {
  highlighted?: boolean
  isDeleting?: boolean
  isLoading?: boolean
  progressMessage?: string | null
}

/**
 * 教学目标节点
 */
export const ObjectiveNode = memo(function ObjectiveNode({
  data,
  selected,
}: NodeProps<any>) {
  // [MOD] 使用类型断言确保 data 类型正确推导
  const nodeData = data as ObjectiveNodeData

  return (
    <BaseStaticCardNode
      selected={selected}
      highlighted={nodeData.highlighted}
      isDeleting={nodeData.isDeleting}
      isLoading={nodeData.isLoading}
      progressMessage={nodeData.progressMessage}
      icon={<Target className="h-4 w-4" />}
      title={`教学目标 ${nodeData.index}`}
      headerColorClass="bg-blue-100"
      borderColorClass="border-blue-200"
      textColorClass="text-blue-700"
      width={280}
    >
      <p className="text-sm text-gray-700 line-clamp-3">{nodeData.content}</p>
      {Array.isArray(nodeData.supports) && nodeData.supports.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {nodeData.supports
            .filter((item) => typeof item?.title === "string" && item.title.trim().length > 0)
            .map((item, index) => (
              <SupportLabel
                key={`${item.indicatorId ?? item.title}-${index}`}
                title={item.title}
                desc={item.desc}
                type={item.type === "strong" ? "strong" : "weak"}
                size="sm"
              />
            ))}
        </div>
      )}
    </BaseStaticCardNode>
  )
})

export default ObjectiveNode
