import { STAGE_ORDER } from "@/modules/dashboard/data/course-status"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { STAGE_LABELS } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import type { CourseStage } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

interface StageCompositionProps {
  counts: Record<CourseStage, number>
  /** 在条下方列出各阶段的数量 */
  showLegend?: boolean
  className?: string
}

/** 建设阶段构成：按阶段顺序排列的分段条，段间留 2px 间隙；悬停每段显示数量与占比 */
export function StageComposition({ counts, showLegend = false, className }: StageCompositionProps) {
  const total = STAGE_ORDER.reduce((sum, stage) => sum + counts[stage], 0)
  const summary = STAGE_ORDER.map((stage) => `${STAGE_LABELS[stage]} ${counts[stage]}`).join("，")

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {total === 0 ? (
        <div className="h-2.5 w-full rounded-full bg-muted" role="img" aria-label="没有课程" />
      ) : (
        <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`建设阶段：${summary}`}>
          {STAGE_ORDER.filter((stage) => counts[stage] > 0).map((stage) => (
            <div
              key={stage}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(counts[stage] / total) * 100}%`, backgroundColor: STAGE_COLORS[stage] }}
              title={`${STAGE_LABELS[stage]} ${formatCount(counts[stage])} 门（${formatPercent(counts[stage] / total)}）`}
            />
          ))}
        </div>
      )}
      {showLegend ? (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
          {STAGE_ORDER.map((stage) => (
            <li key={stage} className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} aria-hidden />
              <span className="text-muted-foreground">{STAGE_LABELS[stage]}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">{formatCount(counts[stage])}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
