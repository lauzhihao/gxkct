"use client"

import { useCallback, useState, useEffect } from "react"
import { Panel, useReactFlow, useOnViewportChange, type Viewport } from "@xyflow/react"
import { Plus, Minus, Maximize } from "lucide-react"

/**
 * 缩放步长（百分比）
 */
const ZOOM_STEP = 5

/**
 * 自定义缩放控件组件
 * 提供缩放比例显示、放大/缩小按钮和适应视图功能
 */
export function CustomZoomControls() {
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
    </Panel>
  )
}

export default CustomZoomControls
