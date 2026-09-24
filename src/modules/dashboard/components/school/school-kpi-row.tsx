import { AlertTriangle, BookOpen, CircleCheckBig, ClipboardCheck, GraduationCap, Users } from "lucide-react"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent, ratio } from "@/modules/dashboard/format"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { SchoolOverview } from "@/modules/dashboard/types"

interface SchoolKpiRowProps {
  overview: SchoolOverview
  ownerMissingCount: number
  onOpenAllCourses: () => void
  onOpenOwnerMissing: () => void
}

export function SchoolKpiRow({ overview, ownerMissingCount, onOpenAllCourses, onOpenOwnerMissing }: SchoolKpiRowProps) {
  const participation = ratio(overview.participatingTeacherCount, overview.registeredTeacherCount)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        icon={BookOpen}
        label="课程总数"
        value={{ kind: "value", text: formatCount(overview.courseTotal) }}
        onClick={onOpenAllCourses}
        detail={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>
              本学期新开 <NaValue reason={NA_REASONS.newCourse} />
            </span>
            <span>
              同比 <NaValue reason={NA_REASONS.yoy} />
            </span>
          </span>
        }
      />
      <StatTile
        icon={GraduationCap}
        label="专业 / 院系"
        value={{ kind: "value", text: `${overview.majorCount} / ${overview.departmentCount}` }}
        detail={
          <span>
            院系建档覆盖 <NaValue reason={NA_REASONS.archiveCoverage} />（同名计一次）
          </span>
        }
      />
      <StatTile
        icon={CircleCheckBig}
        label="已达标课程"
        value={{ kind: "na", reason: NA_REASONS.qualified }}
        detail={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span>
              达标率 <NaValue reason={NA_REASONS.qualified} />
            </span>
            <span>
              较上学期 <NaValue reason={NA_REASONS.qualified} />
            </span>
          </span>
        }
      />
      <StatTile
        icon={Users}
        label="参与教师"
        value={{ kind: "value", text: formatCount(overview.participatingTeacherCount) }}
        detail={
          <span>
            参与率 {participation === null ? <NaValue reason={NA_REASONS.noTeachers} /> : formatPercent(participation)}（
            {formatCount(overview.registeredTeacherCount)} 名在册）
          </span>
        }
      />
      <StatTile
        icon={ClipboardCheck}
        label="质量评估通过率"
        value={{ kind: "na", reason: NA_REASONS.passLine }}
        detail={`本学期已完成评估 ${formatCount(overview.evaluationCompletedCount)} / ${formatCount(overview.evaluationTargetCount)} 门次`}
      />
      <StatTile
        icon={AlertTriangle}
        label="待整改 / 空缺预警"
        value={{ kind: "na", reason: NA_REASONS.rectification }}
        onClick={onOpenOwnerMissing}
        detail={
          <span>
            逾期未整改 N/A · 负责人未设置 <span className="font-medium text-destructive">{formatCount(ownerMissingCount)}</span> 门
          </span>
        }
      />
    </div>
  )
}
