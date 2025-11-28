"use client"

import { Star } from "lucide-react"
import { cn } from "@/shared/utils/utils"

interface SupportLabelProps {
  title: string
  desc?: string
  type: "strong" | "weak"
  showRemoveButton?: boolean
  onRemove?: () => void
  size?: "sm" | "md"
  tipsPosition?: "top" | "bottom" | "left" | "right"
}

export function SupportLabel({
  title,
  desc,
  type,
  showRemoveButton = false,
  onRemove,
  size = "md",
  tipsPosition = "bottom",
}: SupportLabelProps) {
  const isStrong = type === "strong"
  const labelSize = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "w-3 h-3" : "w-3 h-3"
  const padding = size === "sm" ? "px-2 py-1" : "px-2 py-1"

  // TIPS尺寸为标签的1.5倍
  const tipsSize = size === "sm" ? "text-xs" : "text-sm"
  const tipsPadding = size === "sm" ? "px-3 py-2" : "px-4 py-3"
  const tipsIconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
  const tipsGap = size === "sm" ? "gap-1" : "gap-1.5"

  // TIPS位置和箭头样式
  const getTipsPositionClass = () => {
    switch (tipsPosition) {
      case "top":
        return "bottom-full left-1/2 -translate-x-1/2 mb-2"
      case "bottom":
        return "top-full left-1/2 -translate-x-1/2 mt-2"
      case "left":
        return "right-full top-1/2 -translate-y-1/2 mr-2"
      case "right":
        return "left-full top-1/2 -translate-y-1/2 ml-2"
      default:
        return "bottom-full left-1/2 -translate-x-1/2 mb-2"
    }
  }

  const getTipsArrowClass = () => {
    switch (tipsPosition) {
      case "top":
        // 箭头在下方，指向标签
        return "before:top-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-t-gray-100"
      case "bottom":
        // 箭头在上方，指向标签
        return "before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-gray-100"
      case "left":
        // 箭头在右方，指向标签
        return "before:left-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-l-gray-100"
      case "right":
        // 箭头在左方，指向标签
        return "before:right-full before:top-1/2 before:-translate-y-1/2 before:border-8 before:border-transparent before:border-r-gray-100"
      default:
        return "before:bottom-full before:left-1/2 before:-translate-x-1/2 before:border-8 before:border-transparent before:border-b-gray-100"
    }
  }

  const tipsPositionClass = getTipsPositionClass()
  const tipsArrowClass = getTipsArrowClass()

  return (
    <div className="relative group/tooltip">
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded font-medium cursor-pointer",
          labelSize,
          padding,
          isStrong && "bg-orange-100 border border-orange-300 text-orange-700",
          !isStrong && "bg-green-100 border border-green-300 text-green-700",
        )}
      >
        {isStrong ? (
          <Star className={cn(iconSize, "flex-shrink-0 fill-current")} />
        ) : (
          <span className="flex-shrink-0">☆</span>
        )}
        <span>{title}</span>
        {showRemoveButton && (
          <button
            onClick={onRemove}
            className="hover:text-red-600 transition-colors ml-1"
          >
            ✕
          </button>
        )}
      </span>

      {/* TIPS */}
      {desc && (
        <div
          className={cn(
            "absolute rounded shadow-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50 min-w-max bg-gray-100 flex items-center",
            tipsPositionClass,
            tipsSize,
            tipsPadding,
            tipsGap,
            isStrong ? "text-orange-700" : "text-green-700",
            "before:absolute before:w-0 before:h-0 before:opacity-0 before:invisible group-hover/tooltip:before:opacity-100 group-hover/tooltip:before:visible before:transition-all before:duration-150",
            tipsArrowClass,
          )}
        >
          {isStrong ? (
            <Star className={cn(tipsIconSize, "flex-shrink-0 fill-current")} />
          ) : (
            <span className="flex-shrink-0 text-lg">☆</span>
          )}
          <span>{title}: {desc}</span>
        </div>
      )}
    </div>
  )
}

