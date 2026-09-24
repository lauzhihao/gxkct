"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"

export interface FocusOption {
  value: string
  label: string
}

interface FocusSelectProps {
  label: string
  value: string
  options: FocusOption[]
  onChange: (value: string) => void
}

/** 看板下钻对象选择：院系 / 专业，选项来自当前用户权限内的组织树 */
export function FocusSelect({ label, value, options, onChange }: FocusSelectProps) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      {label}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger size="sm" className="h-7 max-w-[220px] text-xs text-foreground" aria-label={`选择${label}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-xs">
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
