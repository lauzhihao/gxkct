/**
 * 快捷选项组件
 *
 * 渲染可点击的选项按钮
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/utils"
import type { QuickOptionsProps } from "../types"

export function QuickOptions({ options, onSelect, disabled }: QuickOptionsProps) {
  if (options.length === 0) return null

  return (
    <div className="flex flex-col gap-2 py-2">
      {options.map((option, index) => {
        // 生成选项标签（A/B/C/D）
        const label = String.fromCharCode(65 + index) // A, B, C, D...

        return (
          <Button
            key={option.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => onSelect(option)}
            className={cn(
              "w-full h-auto py-2 px-3 text-left justify-start",
              "hover:bg-primary/10 hover:border-primary/50",
              "transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <span className="inline-flex items-center gap-2 w-full">
              {/* 选项标签 */}
              <span className="flex-shrink-0 w-5 h-5 rounded bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                {label}
              </span>
              {/* 选项内容 */}
              <span className="flex flex-col items-start flex-1">
                <span className="text-sm font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </span>
            </span>
          </Button>
        )
      })}
    </div>
  )
}
