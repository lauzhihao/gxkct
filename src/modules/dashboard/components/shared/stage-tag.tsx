import { STAGE_LABELS } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import type { ConstructionStage } from "@/modules/dashboard/types"

interface StageTagProps {
  stage: ConstructionStage
}

/** 建设阶段标签：色点与阶段色阶一致，文字始终可读 */
export function StageTag({ stage }: StageTagProps) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border border-border px-1.5 py-0.5 text-xs text-foreground">
      <span className="size-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} aria-hidden />
      {STAGE_LABELS[stage]}
    </span>
  )
}
