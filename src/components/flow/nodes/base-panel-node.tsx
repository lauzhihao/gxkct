"use client"

import { memo, useEffect, useState, type ReactNode } from "react"
import { Handle, Position, useUpdateNodeInternals } from "@xyflow/react"
import { Plus, Pencil, RefreshCw, Trash2, Loader2 } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover"
import { Button } from "@/shared/components/ui/button"
import { useCanvasLayoutMode } from "@/components/flow/utils/canvas-layout-context"

export interface BasePanelNodeProps {
  // 节点ID
  id: string
  // 是否选中
  selected?: boolean
  // 是否正在删除（隐藏 Handle，显示 loading 遮罩）
  isDeleting?: boolean
  // 是否正在加载（仅显示 loading 遮罩，不隐藏 Handle）
  isLoading?: boolean
  // 是否正在重做（禁用重做按钮并显示加载状态）
  isRefreshing?: boolean
  // 头部图标
  icon?: ReactNode
  // 头部标题
  title: string
  // 头部颜色类
  headerColorClass?: string
  // 头部自定义样式（用于渐变色等复杂样式）
  headerStyle?: React.CSSProperties
  // 边框颜色类
  borderColorClass?: string
  // 背景颜色类
  bgColorClass?: string
  // 文字颜色类
  textColorClass?: string
  // 节点宽度（由 React Flow style 控制）
  width?: number
  // 节点高度（由 React Flow style 控制）
  height?: number
  // 最大高度限制（超出时启用内部滚动）
  maxHeight?: number
  // 是否显示顶部连接点（默认不显示）
  showTargetHandle?: boolean
  // 是否显示底部连接点（默认不显示）
  showSourceHandle?: boolean
  // 是否显示左侧连接点（默认不显示）
  showLeftHandle?: boolean
  // 是否显示右侧连接点（默认显示，加号样式）
  showRightHandle?: boolean
  // 右侧连接点背景色类（需要静态传入，如 "!bg-blue-500"）
  handleColorClass?: string
  // 是否显示右侧扩展连接点（带加号图标）
  showRightExpandHandle?: boolean
  // 右侧扩展连接点的颜色类（默认使用 borderColorClass 对应的颜色）
  rightExpandColorClass?: string
  // 子节点数量（用于显示空状态）
  childCount?: number
  // 添加子节点回调（用于空状态点击）
  onAdd?: () => void
  // 编辑回调
  onEdit?: (id: string) => void
  // 刷新回调
  onRefresh?: (id: string) => void
  // 删除回调
  onDelete?: (id: string) => void
  // 进度消息（显示在loading遮罩中）
  progressMessage?: string | null
}

/**
 * Panel 节点基类组件
 * 作为 React Flow Group Node 使用，包含子节点
 * 特点：虚线边框、半透明背景、子节点在内部渲染
 */
export const BasePanelNode = memo(function BasePanelNode({
  id,
  selected = false,
  isDeleting = false,
  isLoading = false,
  isRefreshing = false,
  icon,
  title,
  headerColorClass = "bg-gray-100",
  headerStyle,
  borderColorClass = "border-gray-300",
  bgColorClass = "bg-gray-50/50",
  textColorClass = "text-gray-700",
  width,
  height,
  showTargetHandle = false,
  showSourceHandle = false,
  showLeftHandle = false,
  showRightHandle = true,
  handleColorClass = "!bg-gray-500",
  showRightExpandHandle = false,
  rightExpandColorClass,
  childCount,
  onAdd,
  onEdit,
  onRefresh,
  onDelete,
  progressMessage,
}: BasePanelNodeProps) {
  const updateNodeInternals = useUpdateNodeInternals()
  const layoutMode = useCanvasLayoutMode()
  const leftHandlePosition = layoutMode === "vertical" ? Position.Top : Position.Left
  const rightHandlePosition = layoutMode === "vertical" ? Position.Bottom : Position.Right
  const rightExpandHandleStyle = layoutMode === "vertical" ? { left: "30%" } : { top: "30%" }

  useEffect(() => {
    // 布局切换后强制刷新锚点，避免边路径使用旧的 Handle 缓存
    updateNodeInternals(id)
  }, [id, layoutMode, updateNodeInternals])

  // 删除确认对话框状态
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(id)
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    onRefresh?.(id)
  }

  // 确认删除
  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false)
    onDelete?.(id)
  }

  // 取消删除
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false)
  }

  // [MOD] 计算 Handle 是否处于禁用状态（loading 或 refreshing 时禁用，但不隐藏以保持连线稳定）
  const isHandleDisabled = isLoading || isRefreshing
  const disabledHandleClass = isHandleDisabled
    ? "!opacity-40 !cursor-not-allowed !pointer-events-none"
    : ""

  return (
    <div
      className={`
        relative rounded-lg border-2
        canvas-node-base
        ${selected ? "border-solid" : "border-dashed"}
        ${borderColorClass} ${bgColorClass}
        ${selected ? "canvas-node-selected ring-2 ring-primary" : ""}
      `}
      style={{
        width: width || "100%",
        height: height || "100%",
        minWidth: 300,
        minHeight: 200,
      }}
    >
      {/* 删除中/加载中遮罩 - 带动态波浪扫描效果 */}
      {/* [MOD] isLoading/isRefreshing 用于更新/重做时显示遮罩但不隐藏 Handle */}
      {(isDeleting || isLoading || isRefreshing) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg canvas-loading-overlay">
          {progressMessage && (
            <span className="text-sm text-white/90 canvas-loading-text">{progressMessage}</span>
          )}
        </div>
      )}

      {/* 顶部连接点 - loading 时隐藏 */}
      {showTargetHandle && !isDeleting && (
        <Handle
          id="top"
          type="target"
          position={Position.Top}
          isConnectableStart={false}
          className="!w-3 !h-3 !bg-gray-400 !border-2 !border-white"
        />
      )}

      {/* 头部标题栏 */}
      <div
        className={`
          group flex items-center gap-2 px-3 py-2 rounded-t-md border-b
          ${selected ? "border-solid" : "border-dashed"}
          ${headerStyle ? '' : headerColorClass} ${borderColorClass}
        `}
        style={headerStyle}
      >
        {icon && <span className={textColorClass}>{icon}</span>}
        <span className={`text-sm font-medium ${textColorClass} flex-1`}>
          {title}
        </span>
        {/* 操作按钮区域 - 带滑入动画 */}
        <div className="flex items-center gap-0.5 flex-shrink-0 canvas-node-actions">
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

      {/* 子节点渲染区域 - React Flow 会自动在这里渲染子节点 */}
      {/* 注意：Group Node 的子节点由 React Flow 根据 parentId 自动渲染，无需手动处理 */}

      {/* 空状态显示 - 当没有子节点时显示添加按钮，带弹性动画；loading 时隐藏 */}
      {childCount === 0 && onAdd && !isDeleting && (
        <div className="absolute inset-0 top-[41px] flex items-center justify-center pointer-events-none">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onAdd()
                }}
                className={`
                  w-12 h-12 rounded-full border-2 border-dashed
                  ${borderColorClass} ${textColorClass}
                  flex items-center justify-center
                  hover:bg-white/50 hover:border-solid hover:shadow-md
                  hover:scale-110 active:scale-95
                  transition-all duration-200 cursor-pointer
                  pointer-events-auto nopan nodrag
                `}
              >
                <Plus className="h-6 w-6" />
              </button>
            </TooltipTrigger>
            <TooltipContent>点击添加</TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* 底部连接点 - 删除时隐藏，loading 时禁用 */}
      {showSourceHandle && !isDeleting && (
        <Handle
          id="bottom"
          type="source"
          position={Position.Bottom}
          className={`!w-3 !h-3 !bg-gray-400 !border-2 !border-white ${disabledHandleClass}`}
        />
      )}

      {/* 左侧连接点 - 圆点样式，颜色与卡片标题配色一致；删除时隐藏，loading 时禁用 */}
      {showLeftHandle && !isDeleting && (
        <Handle
          id="left"
          type="target"
          position={leftHandlePosition}
          isConnectableStart={false}
          className={`!w-4 !h-4 !border-2 !border-white !rounded-full !shadow-sm ${handleColorClass} ${disabledHandleClass}`}
        />
      )}

      {/* 右侧连接点 - 加号图标样式，颜色与卡片标题配色一致；删除时隐藏，loading 时禁用 */}
      {showRightHandle && !isDeleting && (
        <Handle
          id="right"
          type="source"
          position={rightHandlePosition}
          className={`
            !w-6 !h-6 !border-2 !border-white !rounded-full !shadow-sm
            ${isHandleDisabled ? "" : "hover:!shadow-md"} !transition-all
            ${isHandleDisabled ? "!cursor-not-allowed" : "!cursor-pointer"}
            ${handleColorClass} ${disabledHandleClass}
          `}
        >
          <Plus
            className="w-4 h-4 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            strokeWidth={2.5}
          />
        </Handle>
      )}

      {/* 右侧扩展连接点 - 带加号图标，用于扩展矩阵等；删除时隐藏，loading 时禁用 */}
      {showRightExpandHandle && !isDeleting && (
        <Handle
          id="matrix"
          type="source"
          position={rightHandlePosition}
          style={rightExpandHandleStyle}
          className={`
            !w-6 !h-6 !border-2 !border-white !shadow-md
            ${isHandleDisabled ? "" : "hover:!shadow-lg"} !transition-all
            ${isHandleDisabled ? "!cursor-not-allowed" : "!cursor-pointer"}
            ${rightExpandColorClass || '!bg-gray-500'} ${disabledHandleClass}
          `}
        >
          <Plus className="w-3.5 h-3.5 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        </Handle>
      )}
    </div>
  )
})

export default BasePanelNode
