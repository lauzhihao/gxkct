"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Target } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { ObjectiveCardData } from "@/components/canvas-elements/types"

/**
 * 教学目标节点数据类型
 * 注意：@xyflow/react 的 Node 类型要求 data 满足 Record<string, unknown> 约束
 * 通过类型断言在运行时确保类型安全
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
}: NodeProps<any>) {
  // [MOD] 使用类型断言确保 data 类型正确推导
  const nodeData = data as ObjectiveNodeData

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    nodeData.onDelete?.(id)
  }, [nodeData, id])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      isDeleting={nodeData.isDeleting}
      icon={<Target className="h-4 w-4" />}
      title={`教学目标 ${nodeData.index}`}
      headerColorClass="bg-blue-100"
      borderColorClass="border-blue-200"
      textColorClass="text-blue-700"
      width={280}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      <p className="text-sm text-gray-700 line-clamp-3">{nodeData.content}</p>
    </BaseFlowNode>
  )
})

export default ObjectiveNode
