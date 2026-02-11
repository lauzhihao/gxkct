"use client"

import { memo, useCallback } from "react"
import { BookOpen } from "lucide-react"
import { BasePanelNode } from "./base-panel-node"
import type { PanelData } from "@/components/canvas-elements/types"

interface CoursePointPanelNodeProps {
  id: string
  data: PanelData & {
    isDeleting?: boolean
    isRefreshing?: boolean
    onDelete?: (nodeId: string) => void
    onRefresh?: (nodeId: string) => void
    onEdit?: (nodeId: string) => void
    childCount?: number
    totalChildCount?: number
    visibleChildCount?: number
    hiddenChildCount?: number
    isExpanded?: boolean
    onAdd?: () => void
    progressMessage?: string | null
    // 展开/折叠相关
    onExpand?: (nodeId: string) => void
    onCollapse?: (nodeId: string) => void
  }
  selected?: boolean
}

/**
 * 课点 Panel 节点组件
 * 作为 Group Node 包含多个 CoursePointNode 子节点
 */
export const CoursePointPanelNode = memo(function CoursePointPanelNode({
  id,
  data,
  selected,
}: CoursePointPanelNodeProps) {
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

  // 处理添加按钮点击
  const handleAdd = useCallback(() => {
    data.onAdd?.()
  }, [data])

  const handleToggleExpand = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (data.isExpanded) {
      data.onCollapse?.(id)
      return
    }
    data.onExpand?.(id)
  }, [data, id])

  const totalCount = data.totalChildCount ?? data.childCount ?? 0
  const visibleCount = data.visibleChildCount ?? data.childCount ?? 0
  const hiddenCount = data.hiddenChildCount ?? 0
  const showFoldBar = totalCount > visibleCount || Boolean(data.isExpanded)

  return (
    <BasePanelNode
      id={id}
      selected={selected}
      isDeleting={data.isDeleting}
      isRefreshing={data.isRefreshing}
      icon={<BookOpen className="h-4 w-4" />}
      title="课点信息"
      headerColorClass="bg-green-100/90"
      borderColorClass="border-green-300"
      bgColorClass="bg-green-50/60 backdrop-blur-sm"
      textColorClass="text-green-700"
      handleColorClass="!bg-green-500"
      showLeftHandle={true}
      childCount={data.childCount}
      onAdd={handleAdd}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onRefresh={handleRefresh}
      progressMessage={data.progressMessage}
    >
      {showFoldBar ? (
        <div className="relative h-full pointer-events-none">
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 flex justify-center">
            <div className="flex items-center gap-2 rounded bg-slate-50/90 px-2 py-0.5 text-xs text-slate-600">
              <span>已显示 {visibleCount}/{totalCount} 条课点</span>
              <button
                type="button"
                onClick={handleToggleExpand}
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-100"
              >
                {data.isExpanded ? "收起详情" : `展开剩余 ${hiddenCount} 条`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </BasePanelNode>
  )
})

export default CoursePointPanelNode
