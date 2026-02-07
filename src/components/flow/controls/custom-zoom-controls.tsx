"use client"

import { useCallback, useState, useEffect, useRef } from "react"
import { Panel, useReactFlow, useOnViewportChange, type Viewport } from "@xyflow/react"
import { Plus, Minus, Maximize, Check } from "lucide-react"
import type { CanvasLayoutMode } from "@/components/flow/utils/canvas-layout"

/**
 * 缩放步长（百分比）
 */
const ZOOM_STEP = 5

/**
 * 同步状态指示器组件
 * 上传中/加载中：闪烁的绿点
 * 刚完成：绿色对勾（持续1秒）
 * 空闲：静态绿点
 */
function SyncStatusIndicator({ isUploading, isLoading }: { isUploading: boolean; isLoading: boolean }) {
  // 追踪"刚完成上传"状态，显示对勾1秒后变回绿点
  const [justCompleted, setJustCompleted] = useState(false)
  const wasUploadingRef = useRef(false)

  useEffect(() => {
    // 检测 isUploading 从 true 变为 false（上传刚完成）
    if (wasUploadingRef.current && !isUploading) {
      setJustCompleted(true)
      // 1秒后变回绿点
      const timer = setTimeout(() => {
        setJustCompleted(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
    wasUploadingRef.current = isUploading
  }, [isUploading])

  // 上传中或加载中：闪烁的绿点
  if (isUploading || isLoading) {
    return (
      <div
        className="w-3 h-3 rounded-full bg-green-500 canvas-sync-pulse"
        title={isLoading ? "正在加载..." : "正在同步..."}
      />
    )
  }

  if (justCompleted) {
    // 刚完成：绿色对勾
    return (
      <div
        className="w-4 h-4 flex items-center justify-center text-green-500"
        title="已同步"
      >
        <Check className="w-3.5 h-3.5" strokeWidth={3} />
      </div>
    )
  }

  // 空闲：静态绿点
  return (
    <div
      className="w-3 h-3 rounded-full bg-green-500"
      title="已同步"
    />
  )
}

export interface CustomZoomControlsProps {
  /** 是否正在上传画布数据 */
  isUploading?: boolean
  /** 是否正在加载（画布loading状态） */
  isLoading?: boolean
  /** 当前画布布局模式 */
  layoutMode?: CanvasLayoutMode
  /** 切换布局模式回调 */
  onLayoutModeChange?: (mode: CanvasLayoutMode) => void
}

function HorizontalLayoutIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <rect x="1.5" y="3" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="6.25" y="3" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="11" y="3" width="3.5" height="10" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

function VerticalLayoutIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
      <rect x="3" y="1.5" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.9" />
      <rect x="3" y="6.25" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.7" />
      <rect x="3" y="11" width="10" height="3.5" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  )
}

/**
 * 自定义缩放控件组件
 * 提供缩放比例显示、放大/缩小按钮和适应视图功能
 */
export function CustomZoomControls({
  isUploading = false,
  isLoading = false,
  layoutMode = "horizontal",
  onLayoutModeChange,
}: CustomZoomControlsProps) {
  const { fitView, getZoom, zoomTo } = useReactFlow()
  const [zoom, setZoom] = useState(1)

  // 监听视口变化更新缩放比例
  useOnViewportChange({
    onChange: (viewport: Viewport) => {
      setZoom(viewport.zoom)
    },
  })

  // 初始化获取缩放比例
  useEffect(() => {
    setZoom(getZoom())
  }, [getZoom])

  const zoomPercentage = Math.round(zoom * 100)

  // 放大：跳到下一个 5% 整数倍（如 139% -> 140%，140% -> 145%）
  const handleZoomIn = useCallback(() => {
    const currentPercent = Math.round(getZoom() * 100)
    const remainder = currentPercent % ZOOM_STEP
    const targetPercent = remainder === 0
      ? currentPercent + ZOOM_STEP
      : currentPercent + (ZOOM_STEP - remainder)
    zoomTo(Math.min(targetPercent / 100, 2), { duration: 200 })
  }, [getZoom, zoomTo])

  // 缩小：跳到上一个 5% 整数倍（如 139% -> 135%，140% -> 135%）
  const handleZoomOut = useCallback(() => {
    const currentPercent = Math.round(getZoom() * 100)
    const remainder = currentPercent % ZOOM_STEP
    const targetPercent = remainder === 0
      ? currentPercent - ZOOM_STEP
      : currentPercent - remainder
    zoomTo(Math.max(targetPercent / 100, 0.1), { duration: 200 })
  }, [getZoom, zoomTo])

  return (
    <Panel position="bottom-right" className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm p-1">
      <button
        onClick={handleZoomOut}
        className="p-1.5 rounded canvas-zoom-btn"
        title="缩小"
      >
        <Minus className="h-4 w-4 text-gray-600" />
      </button>
      <span className="min-w-[48px] text-center text-sm text-gray-600 font-medium select-none canvas-zoom-text">
        {zoomPercentage}%
      </span>
      <button
        onClick={handleZoomIn}
        className="p-1.5 rounded canvas-zoom-btn"
        title="放大"
      >
        <Plus className="h-4 w-4 text-gray-600" />
      </button>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button
        onClick={() => fitView({ padding: 0.2, maxZoom: 1 })}
        className="p-1.5 rounded canvas-zoom-btn"
        title="适应视图"
      >
        <Maximize className="h-4 w-4 text-gray-600" />
      </button>
      {/* 同步状态指示器 */}
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <div className="px-1.5 flex items-center justify-center">
        <SyncStatusIndicator isUploading={isUploading} isLoading={isLoading} />
      </div>
      <div className="w-px h-5 bg-gray-200 mx-1" />
      <button
        onClick={() => onLayoutModeChange?.("horizontal")}
        className={`p-1.5 rounded canvas-zoom-btn ${layoutMode === "horizontal" ? "bg-gray-100" : ""}`}
        title="水平布局"
      >
        <HorizontalLayoutIcon />
      </button>
      <button
        onClick={() => onLayoutModeChange?.("vertical")}
        className={`p-1.5 rounded canvas-zoom-btn ${layoutMode === "vertical" ? "bg-gray-100" : ""}`}
        title="垂直布局"
      >
        <VerticalLayoutIcon />
      </button>
    </Panel>
  )
}

export default CustomZoomControls
