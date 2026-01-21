"use client"

import { memo, useState, type ReactNode } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Plus, Pencil, RefreshCw, Trash2, Loader2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover"
import { Button } from "@/shared/components/ui/button"

export interface BaseFlowNodeProps {
  // 节点ID
  id: string
  // 是否选中
  selected?: boolean
  // 是否高亮（联动高亮）
  highlighted?: boolean
  // 是否正在删除（显示loading遮罩）
  isDeleting?: boolean
  // 是否正在重做（禁用重做按钮并显示加载状态）
  isRefreshing?: boolean
  // 进度信息（显示在loading遮罩下方）
  progressMessage?: string | null
  // 头部图标
  icon?: ReactNode
  // 头部标题
  title: string
  // 头部右侧操作按钮
  headerActions?: ReactNode
  // 头部颜色类
  headerColorClass?: string
  // 边框颜色类
  borderColorClass?: string
  // 背景颜色类
  bgColorClass?: string
  // 文字颜色类
  textColorClass?: string
  // 子内容
  children?: ReactNode
  // 节点宽度
  width?: number
  // 是否显示顶部连接点（默认不显示）
  showTargetHandle?: boolean
  // 是否显示底部连接点（默认不显示）
  showSourceHandle?: boolean
  // 是否显示左侧连接点（默认不显示）
  showLeftHandle?: boolean
  // 是否显示右侧连接点（默认显示，加号样式）
  showRightHandle?: boolean
  // 右侧连接点背景色类（需要静态传入，如 "!bg-sky-500"）
  handleColorClass?: string
  // 删除回调
  onDelete?: (id: string) => void
  // 编辑回调
  onEdit?: (id: string) => void
  // 刷新回调
  onRefresh?: (id: string) => void
}

/**
 * Flow 节点基类组件
 * 提供统一的节点外观和连接点配置
 */
export const BaseFlowNode = memo(function BaseFlowNode({
  id,
  selected = false,
  highlighted = false,
  isDeleting = false,
  isRefreshing = false,
  progressMessage,
  icon,
  title,
  headerActions,
  headerColorClass = "bg-gray-100",
  borderColorClass = "border-gray-200",
  bgColorClass = "bg-white",
  textColorClass = "text-gray-700",
  children,
  width = 280,
  showTargetHandle = false,
  showSourceHandle = false,
  showLeftHandle = false,
  showRightHandle = true,
  handleColorClass = "!bg-gray-500",
  onDelete,
  onEdit,
  onRefresh,
}: BaseFlowNodeProps) {
  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // 确认删除
  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false)
    onDelete?.(id)
  }

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(id)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefresh?.(id)
  }

  return (
    <div
      className={`
        group relative rounded-lg border shadow-sm
        canvas-node-base
        ${borderColorClass} ${bgColorClass}
        ${selected ? "canvas-node-selected ring-2 ring-primary" : ""}
        ${highlighted ? "canvas-node-highlighted" : ""}
      `}
      style={{ width }}
    >
      {/* 删除中/加载中遮罩 - 带动态波浪扫描效果 */}
      {isDeleting && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg canvas-loading-overlay">
          {progressMessage && (
            <span className="text-sm text-white/90 canvas-loading-text">{progressMessage}</span>
          )}
        </div>
      )}

      {/* 顶部连接点 */}
      {showTargetHandle && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* 头部 */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-t-lg border-b
          ${headerColorClass} ${borderColorClass}
        `}
      >
        {icon && <span className={textColorClass}>{icon}</span>}
        <span className={`text-sm font-medium ${textColorClass} truncate flex-1`}>
          {title}
        </span>
        {/* 操作按钮区域 - 带滑入动画 */}
        <div className="flex items-center gap-0.5 flex-shrink-0 canvas-node-actions">
          {headerActions}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleEdit}
                className="p-1 rounded hover:bg-black/10 canvas-action-btn"
              >
                <Pencil className="h-3.5 w-3.5 text-gray-500" />
              </button>
            </TooltipTrigger>
            <TooltipContent>修改</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing || !onRefresh}
                className={`p-1 rounded canvas-action-btn ${
                  isRefreshing || !onRefresh
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-black/10"
                }`}
              >
                {isRefreshing ? (
                  <Loader2 className="h-3.5 w-3.5 text-gray-500 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-gray-500" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isRefreshing ? "重做中..." : "重做"}</TooltipContent>
          </Tooltip>
          <Popover open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                title="删除"
                onClick={(e) => e.stopPropagation()}
                className="p-1 rounded hover:bg-red-100 canvas-action-btn"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="right" align="center" className="w-auto p-3">
              <div className="flex flex-col gap-3">
                <p className="text-sm text-gray-700">请确认删除</p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelDelete}
                  >
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleConfirmDelete}
                  >
                    确认
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-3">{children}</div>

      {/* 底部连接点 */}
      {showSourceHandle && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* 左侧连接点 - 圆点样式，颜色与卡片标题配色一致 */}
      {showLeftHandle && (
        <Handle
          id="left"
          type="target"
          position={Position.Left}
          className={`!w-4 !h-4 !border-2 !border-white !rounded-full !shadow-sm ${handleColorClass}`}
        />
      )}

      {/* 右侧连接点 - 加号图标样式，颜色与卡片标题配色一致 */}
      {showRightHandle && (
        <Handle
          id="right"
          type="source"
          position={Position.Right}
          className={`
            !w-6 !h-6 !border-2 !border-white !rounded-full !shadow-sm
            hover:!shadow-md !transition-all !cursor-pointer
            ${handleColorClass}
          `}
        >
          <Plus
            className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={2.5}
          />
        </Handle>
      )}
    </div>
  )
})

export default BaseFlowNode
