import { AlertOctagon, AlertTriangle } from "lucide-react"
import { MAJOR_WARNING_LABELS } from "@/modules/dashboard/labels"
import type { MajorWarning } from "@/modules/dashboard/types"

interface MajorWarningPanelProps {
  warnings: MajorWarning[]
}

/** 专业预警：逐类列出课程名，负责人空缺视为需立即处理 */
export function MajorWarningPanel({ warnings }: MajorWarningPanelProps) {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {warnings.map((warning) => {
        const critical = warning.kind === "ownerMissing"
        const Icon = critical ? AlertOctagon : AlertTriangle
        return (
          <li key={warning.kind} className="py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Icon className={critical ? "size-4 text-destructive" : "size-4 text-warning"} aria-hidden />
              <span className="text-foreground">{MAJOR_WARNING_LABELS[warning.kind]}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">{warning.courseNames.length} 门</span>
            </div>
            {warning.courseNames.length > 0 ? (
              <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">{warning.courseNames.join("、")}</p>
            ) : (
              <p className="mt-1 pl-6 text-xs text-muted-foreground">无</p>
            )}
          </li>
        )
      })}
    </ul>
  )
}
