"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { Lightbulb } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { CoursePointCardData } from "@/components/canvas-elements/types"

/**
 * 扩展的课点数据类型
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
}: NodeProps<CoursePointNodeData>) {
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
      icon={<Lightbulb className="h-4 w-4" />}
      title={`课点 ${data.index}: ${data.name}`}
      headerColorClass="bg-green-100"
      borderColorClass="border-green-200"
      textColorClass="text-green-700"
      width={280}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      {data.description ? (
        <p className="text-sm text-gray-600 line-clamp-2">{data.description}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">暂无描述</p>
      )}
    </BaseFlowNode>
  )
})

export default CoursePointNode
