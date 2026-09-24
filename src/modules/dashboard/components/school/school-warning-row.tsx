import { AlertOctagon, AlertTriangle, ChevronRight, MinusCircle } from "lucide-react"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { cn } from "@/shared/utils/utils"

export type SchoolWarningRowValue = { kind: "count"; text: string } | { kind: "na"; reason: string }

interface SchoolWarningRowProps {
  label: string
  /** critical：需立即处理；warning：提醒；取不到的类别不用状态色 */
  tone: "critical" | "warning"
  value: SchoolWarningRowValue
  aside: string
  onClick?: () => void
}

const TONE_ICON = { critical: AlertOctagon, warning: AlertTriangle } as const
const TONE_CLASS = { critical: "text-destructive", warning: "text-warning" } as const

/** 预警区的一行：图标 + 类别 + 数量 + 最集中的院系；可下钻时整行可点 */
export function SchoolWarningRow({ label, tone, value, aside, onClick }: SchoolWarningRowProps) {
  const available = value.kind === "count"
  const Icon = available ? TONE_ICON[tone] : MinusCircle
  const content = (
    <>
      <Icon className={cn("size-4 shrink-0", available ? TONE_CLASS[tone] : "text-muted-foreground")} aria-hidden />
      <span className={cn("min-w-0 flex-1 text-sm leading-5", available ? "text-foreground" : "text-muted-foreground")}>{label}</span>
      {value.kind === "count" ? (
        <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground group-hover:text-primary">{value.text}</span>
      ) : (
        <NaValue reason={value.reason} className="shrink-0 text-sm" />
      )}
      <span className="w-[148px] shrink-0 truncate text-right text-xs text-muted-foreground" title={aside}>
        {aside}
      </span>
      {onClick ? (
        <ChevronRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" aria-hidden />
      ) : (
        <span className="size-4 shrink-0" aria-hidden />
      )}
    </>
  )

  if (onClick) {
    return (
      <li>
        <button
          type="button"
          onClick={onClick}
          className="group flex w-full items-center gap-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {content}
        </button>
      </li>
    )
  }
  return <li className="flex items-center gap-3 py-2.5">{content}</li>
}
