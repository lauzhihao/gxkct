import { BookOpen, CircleCheckBig, Trophy, Users } from "lucide-react"
import { Meter } from "@/modules/dashboard/components/shared/meter"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { DepartmentOverview } from "@/modules/dashboard/types"

interface DepartmentKpiRowProps {
  overview: DepartmentOverview
  onOpenCourses: () => void
}

export function DepartmentKpiRow({ overview, onOpenCourses }: DepartmentKpiRowProps) {
  const participation = ratio(overview.participatingTeacherCount, overview.registeredTeacherCount)
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={BookOpen}
        label="本系课程总数"
        value={{ kind: "value", text: formatCount(overview.courseTotal) }}
        onClick={onOpenCourses}
        detail={
          <span>
            在建 <NaValue reason={NA_REASONS.stage} /> · 待建 <NaValue reason={NA_REASONS.stage} />
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
        value={{ kind: "na", reason: NA_REASONS.qualified }}
        detail="已达标课程占本系课程比例"
      />
      <StatTile
        icon={Trophy}
        label="全校排名"
        value={{ kind: "na", reason: NA_REASONS.qualified }}
        detail="按达标率在全部院系中排名"
      />
    </div>
  )
}
