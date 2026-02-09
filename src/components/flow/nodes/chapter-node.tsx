"use client"

import { memo } from "react"
import { type Node, type NodeProps } from "@xyflow/react"
import { FileText, Clock } from "lucide-react"
import { BaseStaticCardNode } from "./base-static-card-node"
import { FlowNodeType } from "@/components/flow/utils/types"
import type { ChapterCardData } from "@/components/canvas-elements/types"

/**
 * 章节节点类型定义
 * 使用 ChapterCardData（含扩展字段 highlighted/isDeleting/onDelete）满足 @xyflow/react 的 Node 泛型约束
 */
export type ChapterNode = Node<ChapterCardData, FlowNodeType.CHAPTER>

/**
 * 章节节点 - 支持高亮联动
 */
export const ChapterNodeComponent = memo(function ChapterNodeComponent({
  data,
  selected,
}: NodeProps<ChapterNode>) {
  const totalHours = (data.theory_hours || 0) + (data.practice_hours || 0)
  const highlighted = data.highlighted ?? false
  const isLoading = Boolean((data as { isLoading?: unknown }).isLoading)
  const progressMessage = (data as { progressMessage?: unknown }).progressMessage

  return (
    <BaseStaticCardNode
      selected={selected}
      highlighted={highlighted}
      isDeleting={data.isDeleting}
      isLoading={isLoading}
      progressMessage={typeof progressMessage === "string" ? progressMessage : null}
      icon={<FileText className="h-4 w-4" />}
      title={`第${data.index}章: ${data.name}`}
      headerColorClass="bg-purple-100"
      borderColorClass="border-purple-200"
      textColorClass="text-purple-700"
      width={280}
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
    </BaseStaticCardNode>
  )
})

// 导出带类型的命名组件供 @xyflow/react 使用
export { ChapterNodeComponent as ChapterNode }
