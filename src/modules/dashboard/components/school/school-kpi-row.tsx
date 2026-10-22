import { AlertTriangle, BookOpen, CircleCheckBig, ClipboardCheck, GraduationCap, Users } from "lucide-react"
import { ComparisonValue } from "@/modules/dashboard/components/shared/comparison-value"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { StatTile } from "@/modules/dashboard/components/shared/stat-tile"
import { formatCount, formatPercent, formatPointChange, formatSignedPercent, ratio } from "@/modules/dashboard/format"
import { DEFINITIONS, NA_REASONS } from "@/modules/dashboard/labels"
import type { SchoolOverview } from "@/modules/dashboard/types"

interface SchoolKpiRowProps {
  overview: SchoolOverview
  ownerMissingCount: number
  onOpenAllCourses: () => void
  onOpenUnqualified: () => void
  onOpenRectify: () => void
}

export function SchoolKpiRow({ overview, ownerMissingCount, onOpenAllCourses, onOpenUnqualified, onOpenRectify }: SchoolKpiRowProps) {
  const participation = ratio(overview.participatingTeacherCount, overview.registeredTeacherCount)
  const qualifiedRate = ratio(overview.qualifiedCount, overview.courseTotal)
  const passRate = ratio(overview.passedCount, overview.scoredCount)

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatTile
        icon={BookOpen}
        label="课程总数"
        value={{ kind: "value", text: formatCount(overview.courseTotal) }}
        onClick={onOpenAllCourses}
        detail={
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2">
            <span>
              本学期新开 <ComparisonValue comparison={overview.newCourses} format={(value) => `${formatCount(value)} 门`} />
            </span>
            <span>
              同比 <ComparisonValue comparison={overview.courseTotalChange} format={formatSignedPercent} />
            </span>
          </span>
        }
      />
      <StatTile
        icon={GraduationCap}
        label="专业 / 院系"
        value={{ kind: "value", text: `${overview.majorCount} / ${overview.departmentCount}` }}
        detail={
          <span title="有课程的院系占全部院系的比例">
            院系建档覆盖{" "}
            {overview.archiveCoverage === null ? (
              <NaValue reason={NA_REASONS.noCourses} />
            ) : (
              <span className="font-medium text-foreground">{formatPercent(overview.archiveCoverage)}</span>
            )}
            （同名计一次）
          </span>
        }
      />
      <StatTile
        icon={CircleCheckBig}
        label="已达标课程"
        value={{ kind: "value", text: formatCount(overview.qualifiedCount) }}
        onClick={onOpenUnqualified}
        detail={
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2" title={DEFINITIONS.qualified}>
            <span>
              达标率{" "}
              {qualifiedRate === null ? (
                <NaValue reason={NA_REASONS.noCourses} />
              ) : (
                <span className="font-medium text-foreground">{formatPercent(qualifiedRate)}</span>
              )}
            </span>
            <span>
              较上学期 <ComparisonValue comparison={overview.qualifiedRateChange} format={formatPointChange} />
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
        value={passRate === null ? { kind: "na", reason: NA_REASONS.noScored } : { kind: "value", text: formatPercent(passRate) }}
        detail={
          <span title={DEFINITIONS.passLine}>
            已出分 {formatCount(overview.scoredCount)} 门 · 已完成评估 {formatCount(overview.evaluationCompletedCount)} /{" "}
            {formatCount(overview.evaluationTargetCount)} 门次
          </span>
        }
      />
      <StatTile
        icon={AlertTriangle}
        label="待整改 / 空缺预警"
        value={{ kind: "value", text: `${formatCount(overview.rectifyCount)} / ${formatCount(ownerMissingCount)}` }}
        critical={overview.rectifyCount + ownerMissingCount > 0}
        onClick={onOpenRectify}
        detail={
          <span>
            待整改 {formatCount(overview.rectifyCount)} 门 · 负责人未设置{" "}
            <span className="font-medium text-destructive">{formatCount(ownerMissingCount)}</span> 门 · 逾期未整改{" "}
            <NaValue reason={NA_REASONS.rectificationDeadline} />
          </span>
        }
      />
    </div>
  )
}
