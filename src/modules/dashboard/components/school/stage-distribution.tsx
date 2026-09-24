import { Meter } from "@/modules/dashboard/components/shared/meter"
import { StageComposition } from "@/modules/dashboard/components/shared/stage-composition"
import { STAGE_ORDER } from "@/modules/dashboard/data/course-status"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { STAGE_LABELS, STAGE_RULES } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import type { CourseStage } from "@/modules/dashboard/types"

interface StageDistributionProps {
  counts: Record<CourseStage, number>
  courseTotal: number
}

/** 课程建设进度分布：构成条看整体，下面逐行列出各阶段的判定、数量与占比 */
export function StageDistribution({ counts, courseTotal }: StageDistributionProps) {
  const total = STAGE_ORDER.reduce((sum, stage) => sum + counts[stage], 0)
  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">本学期没有课程</p>
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <p className="text-xs text-muted-foreground">本学期 {formatCount(courseTotal)} 门课程</p>
      <StageComposition counts={counts} />
      <ul className="flex flex-col gap-3">
        {STAGE_ORDER.map((stage) => {
          const share = counts[stage] / total
          return (
            <li key={stage} className="flex flex-col gap-1" title={`${STAGE_LABELS[stage]}：${STAGE_RULES[stage]}`}>
              <div className="flex items-baseline gap-2 text-sm">
                <span className="size-2 shrink-0 self-center rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] }} aria-hidden />
                <span className="shrink-0 text-foreground">{STAGE_LABELS[stage]}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{STAGE_RULES[stage]}</span>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">{formatCount(counts[stage])}</span>
                <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{formatPercent(share)}</span>
              </div>
              <Meter value={share} color={STAGE_COLORS[stage]} ariaLabel={`${STAGE_LABELS[stage]}占比`} className="ml-4 w-auto" />
            </li>
          )
        })}
      </ul>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        5 项：大纲、教案、课件、KSA 课点、专业矩阵支撑点。阶段里的“已达标”要求 5 项做完且已出分，所以比上方“已达标课程”（大纲、教案、课件齐备即可）少。
      </p>
    </div>
  )
}
