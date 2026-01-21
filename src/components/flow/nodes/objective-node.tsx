"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Target } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { ObjectiveCardData } from "@/components/canvas-elements/types"

/**
 * 扩展的教学目标数据类型
 */
interface ObjectiveNodeData extends ObjectiveCardData {
  isDeleting?: boolean
  onDelete?: (nodeId: string) => void
}

/**
 * 教学目标节点
 */
export const ObjectiveNode = memo(function ObjectiveNode({
  id,
  data,
  selected,
}: NodeProps<ObjectiveNodeData>) {
  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    data.onDelete?.(id)
  }, [data, id])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      isDeleting={data.isDeleting}
      icon={<Target className="h-4 w-4" />}
      title={`教学目标 ${data.index}`}
      headerColorClass="bg-blue-100"
      borderColorClass="border-blue-200"
      textColorClass="text-blue-700"
      width={280}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      <p className="text-sm text-gray-700 line-clamp-3">{data.content}</p>
    </BaseFlowNode>
  )
})

export default ObjectiveNode
