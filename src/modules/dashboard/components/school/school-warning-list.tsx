import { AlertOctagon, AlertTriangle, ChevronRight } from "lucide-react"
import { SCHOOL_WARNING_LABELS } from "@/modules/dashboard/labels"
import type { SchoolWarning, SchoolWarningKind } from "@/modules/dashboard/types"

/** 逾期整改与负责人空缺属于需要立即处理的问题，其余为提醒 */
const CRITICAL_KINDS: SchoolWarningKind[] = ["overdueRectification", "ownerMissing"]

interface SchoolWarningListProps {
  warnings: SchoolWarning[]
  onOpen: (warning: SchoolWarning) => void
}

export function SchoolWarningList({ warnings, onOpen }: SchoolWarningListProps) {
  return (
    <ul className="flex flex-1 flex-col divide-y divide-border">
      {warnings.map((warning) => {
        const critical = CRITICAL_KINDS.includes(warning.kind)
        const Icon = critical ? AlertOctagon : AlertTriangle
        return (
          <li key={warning.kind}>
            <button
              type="button"
              onClick={() => onOpen(warning)}
              className="group flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className={critical ? "size-4 shrink-0 text-destructive" : "size-4 shrink-0 text-warning"} aria-hidden />
              <span className="min-w-0 flex-1 text-sm leading-5 text-foreground">{SCHOOL_WARNING_LABELS[warning.kind]}</span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground group-hover:text-primary">
                {warning.count} 门
              </span>
              <span className="w-[132px] shrink-0 truncate text-right text-xs text-muted-foreground">
                最多：{warning.topDepartmentName} {warning.topDepartmentCount}
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
