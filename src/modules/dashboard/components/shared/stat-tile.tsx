import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/shared/utils/utils"

interface StatTileProps {
  icon: LucideIcon
  label: string
  value: string
  valueSuffix?: string
  detail: ReactNode
  critical?: boolean
  onClick?: () => void
}

/** KPI 卡：标签 + 大数字 + 一行补充说明；可点击时整卡作为下钻入口 */
export function StatTile({ icon: Icon, label, value, valueSuffix, detail, critical = false, onClick }: StatTileProps) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-sm",
            critical ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cn("text-[28px] font-semibold leading-none", critical ? "text-destructive" : "text-foreground")}>
          {value}
        </span>
        {valueSuffix ? <span className="text-sm text-muted-foreground">{valueSuffix}</span> : null}
      </div>
      <div className="mt-2 min-h-4 text-xs text-muted-foreground">{detail}</div>
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="min-w-0 rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {body}
      </button>
    )
  }

  return <div className="min-w-0 rounded-md border border-border bg-card p-4">{body}</div>
}
