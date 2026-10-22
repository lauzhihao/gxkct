import { BookOpen, CircleCheckBig, Hammer } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { MajorOverview } from "@/modules/dashboard/types"

interface MajorKpiRowProps {
  overview: MajorOverview
}

export function MajorKpiRow({ overview }: MajorKpiRowProps) {
  const qualifiedRate = ratio(overview.qualifiedCount, overview.courseCount)
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
      <StatTile
        icon={Hammer}
        label="总体完成率"
        value={
          overview.completion === null
            ? { kind: "na", reason: NA_REASONS.noCourses }
            : { kind: "value", text: formatPercent(overview.completion) }
        }
        detail={
          <span className="flex flex-col gap-1.5" title={DEFINITIONS.completion}>
            <span>课程 5 项建设内容完成比例的平均值</span>
            {overview.completion !== null ? <Meter value={overview.completion} ariaLabel="总体完成率" /> : null}
          </span>
        }
      />
      <StatTile
        icon={CircleCheckBig}
        label="达标率"
        value={qualifiedRate === null ? { kind: "na", reason: NA_REASONS.noCourses } : { kind: "value", text: formatPercent(qualifiedRate) }}
        detail={<span title={DEFINITIONS.qualified}>大纲、教案、课件齐备 {formatCount(overview.qualifiedCount)} / {formatCount(overview.courseCount)} 门</span>}
      />
    </div>
  )
}
