import { AlertOctagon, AlertTriangle } from "lucide-react"

interface MajorWarningPanelProps {
  ownerMissingCourseNames: string[]
  unpreparedCourseNames: string[]
  staleCourseNames: string[]
}

/** 专业预警：负责人空缺视为需立即处理 */
export function MajorWarningPanel({ ownerMissingCourseNames, unpreparedCourseNames, staleCourseNames }: MajorWarningPanelProps) {
  const rows = [
    { key: "ownerMissing", label: "负责人未设置", names: ownerMissingCourseNames, critical: true },
    { key: "unprepared", label: "临近评估批次未准备（30 天内到期、未交自评）", names: unpreparedCourseNames, critical: false },
    { key: "stale", label: "超 60 天未更新（课程信息最后保存超过 60 天）", names: staleCourseNames, critical: false },
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
    </ul>
  )
}
