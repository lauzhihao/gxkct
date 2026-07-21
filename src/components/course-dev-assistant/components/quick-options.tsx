/**
 * 快捷选项组件
 *
 * 渲染可点击的选项按钮
 */

"use client"

import { Button } from "@/shared/components/ui/button"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"
import { cn } from "@/shared/utils/utils"
import type { QuickOptionsProps } from "../types"

const QUICK_OPTION_MANAGE_ACTION: PermissionAction = "major.course.create"
const QUICK_OPTION_MANAGE_CONTEXT = { scope: "major" as const }

export function QuickOptions({ options, onSelect, disabled }: QuickOptionsProps) {
  const { can } = usePermission()
  const canManageQuickOptions = can(QUICK_OPTION_MANAGE_ACTION, QUICK_OPTION_MANAGE_CONTEXT)

  if (options.length === 0) return null

  const handleSelectOption = (option: QuickOptionsProps["options"][number]) => {
    if (!canManageQuickOptions) return
    onSelect(option)
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {options.map((option, index) => {
        if (!canManageQuickOptions) return null

        // 生成选项标签（A/B/C/D）
        const label = String.fromCharCode(65 + index) // A, B, C, D...

        return (
          <Button
            key={option.id}
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => handleSelectOption(option)}
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
