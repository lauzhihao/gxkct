import { ChevronRight } from "lucide-react"
import type { DashboardFocus, DashboardTier } from "@/modules/dashboard/types"

interface DashboardBreadcrumbProps {
  tier: DashboardTier
  focus: DashboardFocus
  onNavigate: (tier: DashboardTier) => void
}

/** 下钻路径：全校 > 院系 > 专业，点击上级回到对应层 */
export function DashboardBreadcrumb({ tier, focus, onNavigate }: DashboardBreadcrumbProps) {
  if (tier === "school" || tier === "teacher") return null

  const crumbs: { tier: DashboardTier; label: string }[] = [
    { tier: "school", label: "全校" },
    { tier: "department", label: focus.departmentName },
  ]
  if (tier === "major") crumbs.push({ tier: "major", label: focus.majorName })

  return (
    <nav aria-label="看板下钻路径" className="flex items-center gap-1 text-xs text-muted-foreground">
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        return (
          <span key={crumb.tier} className="inline-flex items-center gap-1">
            {index > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
            {isLast ? (
              <span className="font-medium text-foreground">{crumb.label}</span>
            ) : (
              <button type="button" onClick={() => onNavigate(crumb.tier)} className="hover:text-primary hover:underline">
                {crumb.label}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
