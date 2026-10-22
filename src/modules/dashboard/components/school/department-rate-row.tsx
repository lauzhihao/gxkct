import { AlertTriangle } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import type { DepartmentRate } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

interface DepartmentRateRowProps {
  department: DepartmentRate
  rank: number
  isLast: boolean
}

/** 院系达标率排行的一行；末位用红字和图标标出 */
export function DepartmentRateRow({ department, rank, isLast }: DepartmentRateRowProps) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{rank}</span>
        <span className={cn("min-w-0 flex-1 truncate", isLast ? "text-destructive" : "text-foreground")} title={department.departmentName}>
          {department.departmentName}
        </span>
        {isLast ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs text-destructive">
            <AlertTriangle className="size-3.5" aria-hidden />
            末位
          </span>
        ) : null}
        <span className={cn("w-14 shrink-0 text-right font-semibold tabular-nums", isLast ? "text-destructive" : "text-foreground")}>
          {formatPercent(department.rate)}
        </span>
        <span className="w-24 shrink-0 whitespace-nowrap text-right text-xs tabular-nums text-muted-foreground">
          {formatCount(department.qualifiedCount)}/{formatCount(department.courseCount)} 门
        </span>
      </div>
      <Meter value={department.rate} ariaLabel={`${department.departmentName}达标率`} className="ml-7 w-auto" />
    </li>
  )
}
