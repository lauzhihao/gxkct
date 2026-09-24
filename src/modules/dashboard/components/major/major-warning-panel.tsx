import { AlertOctagon, AlertTriangle, MinusCircle } from "lucide-react"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { NA_REASONS } from "@/modules/dashboard/labels"

interface MajorWarningPanelProps {
  ownerMissingCourseNames: string[]
  unpreparedCourseNames: string[]
}

/** 专业预警：负责人空缺视为需立即处理；取不到的类别保留一行并标 N/A */
export function MajorWarningPanel({ ownerMissingCourseNames, unpreparedCourseNames }: MajorWarningPanelProps) {
  const rows = [
    { key: "ownerMissing", label: "负责人未设置", names: ownerMissingCourseNames, critical: true },
    { key: "unprepared", label: "临近评估批次未准备（30 天内到期、未交自评）", names: unpreparedCourseNames, critical: false },
  ]

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.map((row) => {
        const Icon = row.critical ? AlertOctagon : AlertTriangle
        return (
          <li key={row.key} className="py-2.5">
            <div className="flex items-center gap-2 text-sm">
              <Icon className={row.critical ? "size-4 text-destructive" : "size-4 text-warning"} aria-hidden />
              <span className="text-foreground">{row.label}</span>
              <span className="ml-auto font-semibold tabular-nums text-foreground">{row.names.length} 门</span>
            </div>
            <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">{row.names.length > 0 ? row.names.join("、") : "无"}</p>
          </li>
        )
      })}
      <li className="py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <MinusCircle className="size-4 text-muted-foreground" aria-hidden />
          <span className="text-muted-foreground">超 60 天未更新</span>
          <NaValue reason={NA_REASONS.lastUpdated} className="ml-auto" />
        </div>
        <p className="mt-1 pl-6 text-xs leading-5 text-muted-foreground">{NA_REASONS.lastUpdated}</p>
      </li>
    </ul>
  )
}
