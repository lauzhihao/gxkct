import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"

interface BreakpointListProps {
  ownerMissingCount: number
  courseTotal: number
  onOpenOwnerMissing: () => void
}

const RESOURCE_BREAKPOINTS = ["无大纲", "无教案课件", "无资源"] as const

/**
 * 建设断点分布。设计稿统计的是"未达标课程卡在哪一步"，达标口径待定义，
 * 这里按本系全部课程统计；资源类断点在院系层暂未汇总。
 */
export function BreakpointList({ ownerMissingCount, courseTotal, onOpenOwnerMissing }: BreakpointListProps) {
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col divide-y divide-border">
        <li>
          <button
            type="button"
            onClick={onOpenOwnerMissing}
            className="group flex w-full items-center gap-3 py-2.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex-1 text-foreground">无负责人</span>
            <span className="font-semibold tabular-nums text-foreground group-hover:text-primary">{formatCount(ownerMissingCount)} 门</span>
            <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">/ {formatCount(courseTotal)}</span>
          </button>
        </li>
        {RESOURCE_BREAKPOINTS.map((label) => (
          <li key={label} className="flex items-center gap-3 py-2.5 text-sm">
            <span className="flex-1 text-muted-foreground">{label}</span>
            <NaValue reason={NA_REASONS.departmentResources} />
            <span className="w-16" aria-hidden />
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">
        未达标口径待定义，按本系全部课程统计；大纲、教案课件、资源在院系层暂未汇总，可进入专业看板逐门查看。
      </p>
    </div>
  )
}
