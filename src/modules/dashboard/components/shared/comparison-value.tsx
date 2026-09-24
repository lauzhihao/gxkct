import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import type { Comparison } from "@/modules/dashboard/types"

interface ComparisonValueProps {
  comparison: Comparison
  format: (value: number) => string
}

/** 与对比学期的比较：取得到时显示数值并在悬停时写明对比学期，取不到时显示 N/A 与原因 */
export function ComparisonValue({ comparison, format }: ComparisonValueProps) {
  if (comparison.kind === "na") return <NaValue reason={comparison.reason} />
  return (
    <span className="font-medium text-foreground" title={`对比 ${comparison.semesterName}`}>
      {format(comparison.value)}
    </span>
  )
}
