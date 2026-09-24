import { STAGE_LABELS, STAGE_ORDER } from "@/modules/dashboard/labels"
import { STAGE_COLORS } from "@/modules/dashboard/palette"
import { countOfStage, sumStages } from "@/modules/dashboard/stage-utils"
import type { StageCount } from "@/modules/dashboard/types"

interface StageStackBarProps {
  stages: StageCount[]
}

/** 单行阶段构成条：按建设阶段顺序排列，段与段之间留 2px 间隙 */
export function StageStackBar({ stages }: StageStackBarProps) {
  const total = sumStages(stages)
  const summary = STAGE_ORDER.map((stage) => `${STAGE_LABELS[stage]} ${countOfStage(stages, stage)}`).join("，")

  return (
    <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-sm" role="img" aria-label={summary} title={summary}>
      {STAGE_ORDER.map((stage) => {
        const count = countOfStage(stages, stage)
        if (count === 0) return null
        return (
          <span
            key={stage}
            className="h-full first:rounded-l-sm last:rounded-r-sm"
            style={{ width: `${(count / total) * 100}%`, backgroundColor: STAGE_COLORS[stage] }}
          />
        )
      })}
    </div>
  )
}
