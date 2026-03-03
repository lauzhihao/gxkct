"use client"

import { Star } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"

interface SupportLabelProps {
  title: string
  desc?: string
  type: "strong" | "weak"
  showRemoveButton?: boolean
  onRemove?: () => void
  size?: "sm" | "md"
  tipsPosition?: "top" | "bottom" | "left" | "right"
  disableInnerTruncate?: boolean
}

export function SupportLabel({
  title,
  desc,
  type,
  showRemoveButton = false,
  onRemove,
  size = "md",
  tipsPosition = "bottom",
  disableInnerTruncate = false,
}: SupportLabelProps) {
  const isStrong = type === "strong"
  const labelSize = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3 h-3"
  const padding = size === "sm" ? "px-2 py-1" : "px-2 py-1"

  // Tooltip尺寸
  const tipsIconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"

  // 将tipsPosition映射为Radix Tooltip的side属性
  const sideMap: Record<string, "top" | "bottom" | "left" | "right"> = {
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
  }

  // Tooltip 内容仅展示 desc，title 仅用于标签本体
  const tooltipText = typeof desc === "string" ? desc.trim() : ""
  const hasTooltip = tooltipText.length > 0

  const labelContent = (
    <span
      className={cn(
        // 基础样式
        "inline-flex items-center gap-1 rounded font-medium cursor-pointer",
        // hover 效果：仅在有 tooltip 时启用
        hasTooltip && "transition-transform duration-150 ease-out origin-center hover:scale-[1.2]",
        labelSize,
        padding,
        isStrong && "bg-orange-100 border border-orange-300 text-orange-700 hover:bg-orange-200",
        !isStrong && "bg-green-100 border border-green-300 text-green-700 hover:bg-green-200",
      )}
    >
      <Star className={cn(iconSize, "flex-shrink-0", isStrong && "fill-current")} />
      {/* 固定宽度截断，hover 时通过 Tooltip 显示完整内容 */}
      <span className={cn("inline-block", !disableInnerTruncate && "max-w-[80px] truncate")}>{title}</span>
      {showRemoveButton && (
        <button
          onClick={onRemove}
          className="hover:text-red-600 transition-colors ml-1"
        >
          ✕
        </button>
      )}
    </span>
  )

  if (!hasTooltip) {
    return labelContent
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {labelContent}
      </TooltipTrigger>
      <TooltipContent
        side={sideMap[tipsPosition] || "bottom"}
        className="max-w-[300px]"
      >
        <div className={cn(
          "flex items-center gap-1.5",
          isStrong ? "text-orange-700" : "text-green-700",
        )}>
          <Star className={cn(tipsIconSize, "flex-shrink-0", isStrong && "fill-current")} />
          <span className="leading-relaxed">{tooltipText}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
