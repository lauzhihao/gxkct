"use client"

import { ToggleGroup, ToggleGroupItem } from "@/shared/components/ui/toggle-group"
import { TIER_LABELS } from "@/modules/dashboard/labels"
import type { DashboardTier } from "@/modules/dashboard/types"

interface TierSwitcherProps {
  tiers: DashboardTier[]
  value: DashboardTier
  onChange: (tier: DashboardTier) => void
}

/** 层级切换：只列出当前身份可查看的层级（本级及以下） */
export function TierSwitcher({ tiers, value, onChange }: TierSwitcherProps) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      size="sm"
      value={value}
      onValueChange={(next) => {
        // Radix 在再次点击已选项时回传空串，此时保持当前层级
        const matched = tiers.find((tier) => tier === next)
        if (matched !== undefined) onChange(matched)
      }}
      aria-label="看板层级"
    >
      {tiers.map((tier) => (
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
