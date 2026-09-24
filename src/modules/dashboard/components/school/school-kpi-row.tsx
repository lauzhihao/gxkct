import { AlertTriangle, BookOpen, CircleCheckBig, ClipboardCheck, GraduationCap, Users } from "lucide-react"
import { DeltaText } from "@/modules/dashboard/components/shared/delta-text"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import type { SchoolOverview } from "@/modules/dashboard/types"

interface SchoolKpiRowProps {
  overview: SchoolOverview
  onOpenAllCourses: () => void
  onOpenQualified: () => void
  onOpenRisk: () => void
}

export function SchoolKpiRow({ overview, onOpenAllCourses, onOpenQualified, onOpenRisk }: SchoolKpiRowProps) {
  const teacherRate = overview.participatingTeacherCount / overview.registeredTeacherCount
  const riskTotal = overview.overdueRectificationCount + overview.ownerMissingCount

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        icon={BookOpen}
        label="课程总数"
        value={formatCount(overview.courseTotal)}
        onClick={onOpenAllCourses}
        detail={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>本学期新开 {formatCount(overview.newCourseCount)}</span>
            <DeltaText delta={overview.courseYoyRate} kind="percent" period="同比" />
          </span>
        }
      />
      <StatTile
        icon={GraduationCap}
        label="专业 / 院系"
        value={`${overview.majorCount} / ${overview.departmentCount}`}
        detail={`院系建档覆盖 ${formatPercent(overview.departmentArchiveCoverage, 0)}（同名专业计一次）`}
      />
      <StatTile
        icon={CircleCheckBig}
        label="已达标课程"
        value={formatCount(overview.qualifiedCourseCount)}
        onClick={onOpenQualified}
        detail={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>达标率 {formatPercent(overview.qualifiedRate)}</span>
            <DeltaText delta={overview.qualifiedRateDeltaPp} kind="pp" period="较上学期" />
          </span>
        }
      />
      <StatTile
        icon={Users}
        label="参与教师"
        value={formatCount(overview.participatingTeacherCount)}
        detail={`参与率 ${formatPercent(teacherRate)}（${overview.registeredTeacherCount} 名在册）`}
      />
      <StatTile
        icon={ClipboardCheck}
        label="质量评估通过率"
        value={formatPercent(overview.evaluationPassRate)}
        detail={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>本学期已评 {overview.evaluatedCourseCount} 门</span>
            <DeltaText delta={overview.evaluationPassRateDeltaPp} kind="pp" period="较上学期" />
          </span>
        }
      />
      <StatTile
        icon={AlertTriangle}
        label="待整改 / 空缺预警"
        value={formatCount(riskTotal)}
        critical
        onClick={onOpenRisk}
        detail={`逾期未整改 ${overview.overdueRectificationCount} · 负责人未设置 ${overview.ownerMissingCount}`}
      />
    </div>
  )
}
