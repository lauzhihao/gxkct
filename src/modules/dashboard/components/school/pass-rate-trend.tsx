import { Meter } from "@/modules/dashboard/components/shared/meter"
import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { TaskPassRate } from "@/modules/dashboard/types"

interface PassRateTrendProps {
  tasks: TaskPassRate[]
}

/**
 * 质量评估通过率：按评估任务的截止日期先后排列。
 * 评估任务不归属学期、学期也没有起止日期，无法按学期出趋势，这里按任务列出。
 */
export function PassRateTrend({ tasks }: PassRateTrendProps) {
  if (tasks.length === 0) {
    return <NaPanelBody reason={NA_REASONS.noScored} />
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <ol className="flex max-h-[240px] flex-col gap-2.5 overflow-auto pr-1">
        {tasks.map((task) => {
          const rate = task.passedCount / task.scoredCount
          return (
            <li key={task.taskId} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-foreground" title={task.title}>
                  {task.title}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{task.endDate !== null ? `截止 ${task.endDate}` : "无截止日期"}</span>
                <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-foreground">{formatPercent(rate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Meter value={rate} ariaLabel={`${task.title}通过率`} />
                <span className="w-32 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
                  {formatCount(task.passedCount)}/{formatCount(task.scoredCount)} 门合格
                </span>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        {DEFINITIONS.passLine}；{DEFINITIONS.score}。评估任务不归属学期，按任务截止日期排列。
      </p>
    </div>
  )
}
