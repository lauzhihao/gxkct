"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Lightbulb } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { CoursePointCardData } from "@/components/canvas-elements/types"

/**
 * 课点节点数据类型
 * 注意：@xyflow/react 的 Node 类型要求 data 满足 Record<string, unknown> 约束
 * 通过类型断言在运行时确保类型安全
 */
interface CoursePointNodeData extends CoursePointCardData {
  highlighted?: boolean
  isDeleting?: boolean
  onDelete?: (nodeId: string) => void
}

/**
 * 课点节点 - 支持高亮联动
 */
export const CoursePointNode = memo(function CoursePointNode({
  id,
  data,
  selected,
}: NodeProps<any>) {
  // [MOD] 使用类型断言确保 data 类型正确推导
  const nodeData = data as CoursePointNodeData
  const highlighted = nodeData.highlighted ?? false

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    nodeData.onDelete?.(id)
  }, [nodeData, id])

  return (
    <BaseFlowNode
      id={id}
      selected={selected}
      highlighted={highlighted}
      isDeleting={nodeData.isDeleting}
      icon={<Lightbulb className="h-4 w-4" />}
      title={`课点 ${nodeData.index}: ${nodeData.name}`}
      headerColorClass="bg-green-100"
      borderColorClass="border-green-200"
      textColorClass="text-green-700"
      width={280}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      {nodeData.description ? (
        <p className="text-sm text-gray-600 line-clamp-2">{nodeData.description}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">暂无描述</p>
      )}
    </BaseFlowNode>
  )
})

export default CoursePointNode
