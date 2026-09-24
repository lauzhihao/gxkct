import type { ReactNode } from "react"
import { cn } from "@/shared/utils/utils"

interface DashboardPanelProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}

/** 看板里的一块内容区：标题 + 可选说明 + 可选右上角操作 */
export function DashboardPanel({ title, description, action, className, children }: DashboardPanelProps) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-md border border-border bg-card p-4", className)}>
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  )
}
