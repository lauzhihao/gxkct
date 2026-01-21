"use client"

import { memo, useCallback } from "react"
import { type NodeProps } from "@xyflow/react"
import { FileText, Clock } from "lucide-react"
import { BaseFlowNode } from "./base-flow-node"
import type { ChapterCardData } from "@/components/canvas-elements/types"

/**
 * 扩展的章节数据类型
 */
interface ChapterNodeData extends ChapterCardData {
  highlighted?: boolean
  isDeleting?: boolean
  onDelete?: (nodeId: string) => void
}

/**
 * 章节节点 - 支持高亮联动
 */
export const ChapterNode = memo(function ChapterNode({
  id,
  data,
  selected,
}: NodeProps<ChapterNodeData>) {
  const totalHours = (data.theory_hours || 0) + (data.practice_hours || 0)
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
      icon={<FileText className="h-4 w-4" />}
      title={`第${data.index}章: ${data.name}`}
      headerColorClass="bg-purple-100"
      borderColorClass="border-purple-200"
      textColorClass="text-purple-700"
      width={280}
      showRightHandle={false}
      onDelete={handleDelete}
    >
      <div className="flex items-center gap-3 text-sm">
        <div className="flex items-center gap-1 text-purple-600">
          <Clock className="h-3.5 w-3.5" />
          <span>{totalHours} 学时</span>
        </div>
        <span className="text-gray-400 text-xs">
          (理论 {data.theory_hours || 0} / 实践 {data.practice_hours || 0})
        </span>
      </div>
    </BaseFlowNode>
  )
})

export default ChapterNode
