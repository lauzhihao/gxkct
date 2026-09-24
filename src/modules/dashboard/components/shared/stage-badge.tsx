import { DEFINITIONS, STAGE_LABELS } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import type { CourseStage } from "@/modules/dashboard/types"

interface StageBadgeProps {
  stage: CourseStage
}

/** 建设阶段：色点 + 文字，颜色只做辅助，悬停给出判定口径 */
export function StageBadge({ stage }: StageBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-foreground" title={DEFINITIONS.stage}>
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} aria-hidden />
      {STAGE_LABELS[stage]}
    </span>
  )
}
