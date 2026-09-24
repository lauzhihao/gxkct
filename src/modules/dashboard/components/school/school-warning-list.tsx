import { SchoolWarningRow } from "@/modules/dashboard/components/school/school-warning-row"
import { formatCount } from "@/modules/dashboard/format"
import { NA_REASONS, SCHOOL_WARNING_LABELS } from "@/modules/dashboard/labels"
import type { WarningSummary } from "@/modules/dashboard/types"

interface SchoolWarningListProps {
  ownerMissing: WarningSummary
  evaluationDueSoon: WarningSummary
  stale: WarningSummary
  zeroResource: WarningSummary
  onOpenOwnerMissing: () => void
  onOpenStale: () => void
  onOpenZeroResource: () => void
}

function describeTop(summary: WarningSummary, unit: string): string {
  if (summary.topDepartmentName === null) return "无"
  return `最多：${summary.topDepartmentName} ${formatCount(summary.topDepartmentCount)}${unit}`
}

/** 待办预警：按设计稿顺序列出五类；系统里没有数据的类别保留一行并标 N/A */
export function SchoolWarningList({
  ownerMissing,
  evaluationDueSoon,
  stale,
  zeroResource,
  onOpenOwnerMissing,
  onOpenStale,
  onOpenZeroResource,
}: SchoolWarningListProps) {
  return (
    <ul className="flex flex-1 flex-col divide-y divide-border">
      <SchoolWarningRow
        label={SCHOOL_WARNING_LABELS.overdueRectification}
        tone="critical"
        value={{ kind: "na", reason: NA_REASONS.rectificationDeadline }}
        aside={NA_REASONS.rectificationDeadline}
      />
      <SchoolWarningRow
        label={SCHOOL_WARNING_LABELS.ownerMissing}
        tone="critical"
        value={{ kind: "count", text: `${formatCount(ownerMissing.count)} 门` }}
        aside={describeTop(ownerMissing, " 门")}
        onClick={onOpenOwnerMissing}
      />
      <SchoolWarningRow
        label={SCHOOL_WARNING_LABELS.evaluationDueSoon}
        tone="warning"
        value={{ kind: "count", text: `${formatCount(evaluationDueSoon.count)} 门次` }}
        aside={describeTop(evaluationDueSoon, " 门次")}
      />
      <SchoolWarningRow
        label={SCHOOL_WARNING_LABELS.staleOver60Days}
        tone="warning"
        value={{ kind: "count", text: `${formatCount(stale.count)} 门` }}
        aside={describeTop(stale, " 门")}
        onClick={onOpenStale}
      />
      <SchoolWarningRow
        label={SCHOOL_WARNING_LABELS.zeroResource}
        tone="warning"
        value={{ kind: "count", text: `${formatCount(zeroResource.count)} 门` }}
        aside={describeTop(zeroResource, " 门")}
        onClick={onOpenZeroResource}
      />
    </ul>
  )
}
