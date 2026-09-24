import { BookOpen, CircleCheckBig, Hammer } from "lucide-react"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
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
        value={{ kind: "value", text: formatCount(overview.courseCount), suffix: "门" }}
        detail={
          <span>
            {overview.departmentName} · {overview.majorName} · 年级 <NaValue reason={NA_REASONS.grade} />
            {overview.leadNames.length > 0 ? ` · 负责人 ${overview.leadNames.join("、")}` : " · 专业负责人未设置"}
          </span>
        }
      />
      <StatTile icon={Hammer} label="总体完成率" value={{ kind: "na", reason: NA_REASONS.completion }} detail="本专业课程建设完成比例" />
      <StatTile icon={CircleCheckBig} label="达标率" value={{ kind: "na", reason: NA_REASONS.qualified }} detail="本专业已达标课程比例" />
    </div>
  )
}
