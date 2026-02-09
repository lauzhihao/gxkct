"use client"

import { memo, type ReactNode } from "react"

export interface BaseStaticCardNodeProps {
  selected?: boolean
  highlighted?: boolean
  isDeleting?: boolean
  isLoading?: boolean
  progressMessage?: string | null
  icon?: ReactNode
  title: string
  headerColorClass?: string
  borderColorClass?: string
  bgColorClass?: string
  textColorClass?: string
  width?: number
  children?: ReactNode
}

/**
 * 纯展示卡片节点基类（无任何交互按钮/弹层）
 */
export const BaseStaticCardNode = memo(function BaseStaticCardNode({
  selected = false,
  highlighted = false,
  isDeleting = false,
  isLoading = false,
  progressMessage,
  icon,
  title,
  headerColorClass = "bg-gray-100",
  borderColorClass = "border-gray-200",
  bgColorClass = "bg-white",
  textColorClass = "text-gray-700",
  width = 280,
  children,
}: BaseStaticCardNodeProps) {
  return (
    <div
      className={`
        relative rounded-lg border shadow-sm
        canvas-node-base
        ${borderColorClass} ${bgColorClass}
        ${selected ? "canvas-node-selected ring-2 ring-primary" : ""}
        ${highlighted ? "canvas-node-highlighted" : ""}
      `}
      style={{ width }}
    >
      {(isDeleting || isLoading) && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg canvas-loading-overlay">
          {progressMessage && (
            <span className="text-sm text-white/90 canvas-loading-text">{progressMessage}</span>
          )}
        </div>
      )}

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
      </div>

      <div className="p-3">{children}</div>
    </div>
  )
})

export default BaseStaticCardNode
