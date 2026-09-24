import { BookOpen, CircleCheckBig, Hammer } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatPercent } from "@/modules/dashboard/format"
import type { MajorOverview } from "@/modules/dashboard/types"

interface MajorKpiRowProps {
  overview: MajorOverview
}

export function MajorKpiRow({ overview }: MajorKpiRowProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <StatTile
        icon={BookOpen}
        label="本专业课程"
        value={String(overview.courseCount)}
        valueSuffix="门"
        detail={`${overview.departmentName} · ${overview.majorName}（${overview.gradeLabel}）`}
      />
      <StatTile
        icon={Hammer}
        label="总体完成率"
        value={formatPercent(overview.completionRate)}
        detail={<Meter value={overview.completionRate} ariaLabel="总体完成率" className="mt-1" />}
      />
      <StatTile
        icon={CircleCheckBig}
        label="达标率"
        value={formatPercent(overview.qualifiedRate)}
        detail={<Meter value={overview.qualifiedRate} ariaLabel="达标率" className="mt-1" />}
      />
    </div>
  )
}
