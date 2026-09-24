import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/shared/utils/utils"

/** KPI 数值：取得到时显示数字，取不到时显示 N/A 并在悬停时说明原因 */
export type StatTileValue = { kind: "value"; text: string; suffix?: string } | { kind: "na"; reason: string }

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: StatTileValue
  detail: ReactNode
  critical?: boolean
  onClick?: () => void
}

/** KPI 卡：标签 + 大数字 + 一行补充说明；可点击时整卡作为下钻入口 */
export function StatTile({ icon: Icon, label, value, detail, critical = false, onClick }: StatTileProps) {
  const emphasizeCritical = critical && value.kind === "value"
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-sm",
            emphasizeCritical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        {value.kind === "value" ? (
          <>
            <span className={cn("text-[28px] font-semibold leading-none", emphasizeCritical ? "text-destructive" : "text-foreground")}>
              {value.text}
            </span>
            {value.suffix !== undefined ? <span className="text-sm text-muted-foreground">{value.suffix}</span> : null}
          </>
        ) : (
          <span className="text-[28px] font-semibold leading-none text-muted-foreground" title={value.reason}>
            N/A
            <span className="sr-only">（{value.reason}）</span>
          </span>
        )}
      </div>
      <div className="mt-2 min-h-4 text-xs text-muted-foreground">{detail}</div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="flex min-w-0 flex-col justify-start rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {body}
      </button>
    )
  }

  return <div className="min-w-0 rounded-md border border-border bg-card p-4">{body}</div>
}
