import { BookOpen, CircleCheckBig, Trophy, Users } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { DepartmentOverview } from "@/modules/dashboard/types"

interface DepartmentKpiRowProps {
  overview: DepartmentOverview
  onOpenCourses: () => void
}

export function DepartmentKpiRow({ overview, onOpenCourses }: DepartmentKpiRowProps) {
  const participation = ratio(overview.participatingTeacherCount, overview.registeredTeacherCount)
  const qualifiedRate = ratio(overview.qualifiedCount, overview.courseTotal)
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={BookOpen}
        label="本系课程总数"
        value={{ kind: "value", text: formatCount(overview.courseTotal) }}
        onClick={onOpenCourses}
        detail={
          <span title={DEFINITIONS.stage}>
            在建 {formatCount(overview.buildingCount)} · 待建 {formatCount(overview.notStartedCount)}
          </span>
        }
      />
      <StatTile
        icon={Users}
        label="教师参与率"
        value={participation === null ? { kind: "na", reason: NA_REASONS.noTeachers } : { kind: "value", text: formatPercent(participation) }}
        detail={
          <span className="flex flex-col gap-1.5">
            <span>
              {formatCount(overview.participatingTeacherCount)} / {formatCount(overview.registeredTeacherCount)} 名在册教师担任课程负责人
            </span>
            {participation !== null ? <Meter value={participation} ariaLabel="教师参与率" /> : null}
          </span>
        }
      />
      <StatTile
        icon={CircleCheckBig}
        label="本系达标率"
        value={qualifiedRate === null ? { kind: "na", reason: NA_REASONS.noCourses } : { kind: "value", text: formatPercent(qualifiedRate) }}
        detail={<span title={DEFINITIONS.qualified}>已达标 {formatCount(overview.qualifiedCount)} / {formatCount(overview.courseTotal)} 门</span>}
      />
      <StatTile
        icon={Trophy}
        label="全校排名"
        value={
          overview.schoolRank.kind === "value"
            ? { kind: "value", text: `第 ${overview.schoolRank.rank}`, suffix: `/ ${overview.schoolRank.total}` }
            : { kind: "na", reason: overview.schoolRank.reason }
        }
        detail="按达标率在全部院系中排名（同名院系合并）"
      />
    </div>
  )
}
