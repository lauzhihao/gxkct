"use client"

import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { TIER_LABELS, TIER_ORDER } from "@/modules/dashboard/labels"
import type { DashboardTier } from "@/modules/dashboard/types"

interface TierSwitcherProps {
  value: DashboardTier
  onChange: (tier: DashboardTier) => void
}

function isDashboardTier(value: string): value is DashboardTier {
  return (TIER_ORDER as string[]).includes(value)
}

/** 示例数据阶段的层级切换：一个账号即可预览四个层级 */
export function TierSwitcher({ value, onChange }: TierSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => {
        // Radix 在再次点击已选项时回传空串，此时保持当前层级
        if (isDashboardTier(next)) onChange(next)
      }}
      aria-label="看板层级"
    >
      {TIER_ORDER.map((tier) => (
        <ToggleGroupItem
          key={tier}
          value={tier}
          className="px-3 text-xs data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
        >
          {TIER_LABELS[tier]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
