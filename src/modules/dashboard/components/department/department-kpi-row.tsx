import { BookOpen, CircleCheckBig, Trophy, Users } from "lucide-react"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import type { DepartmentOverview } from "@/modules/dashboard/types"

interface DepartmentKpiRowProps {
  overview: DepartmentOverview
  onOpenCourses: () => void
}

export function DepartmentKpiRow({ overview, onOpenCourses }: DepartmentKpiRowProps) {
  const teacherRate = overview.participatingTeacherCount / overview.registeredTeacherCount
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatTile
        icon={BookOpen}
        label="本系课程总数"
        value={formatCount(overview.courseTotal)}
        onClick={onOpenCourses}
        detail={`在建 ${overview.inProgressCount} · 待建 ${overview.notStartedCount}`}
      />
      <StatTile
        icon={Users}
        label="教师参与率"
        value={formatPercent(teacherRate)}
        detail={`${overview.participatingTeacherCount} / ${overview.registeredTeacherCount} 名教师参与建设`}
      />
      <StatTile
        icon={CircleCheckBig}
        label="本系达标率"
        value={formatPercent(overview.qualifiedRate)}
        detail="已达标课程占本系课程比例"
      />
      <StatTile
        icon={Trophy}
        label="全校排名"
        value={`第 ${overview.schoolRank}`}
        valueSuffix={`/ ${overview.departmentCount}`}
        detail="按达标率在全部院系中排名"
      />
    </div>
  )
}
