import { FlaskConical } from "lucide-react"

/** 示例数据标识：示例阶段常驻页头，避免被当作真实统计 */
export function SampleDataBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-sm border border-warning/50 bg-warning/10 px-2 py-0.5 text-xs font-medium text-foreground"
      title="当前为示例数据，仅用于评审版式与指标，不代表真实统计"
    >
      <FlaskConical className="size-3.5 text-warning" aria-hidden />
      示例数据
    </span>
  )
}
