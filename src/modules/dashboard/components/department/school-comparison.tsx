import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { formatPercent } from "@/modules/dashboard/format"
import type { ComparisonRow, SchoolComparison as SchoolComparisonData } from "@/modules/dashboard/types"
import { cn } from "@/shared/utils/utils"

interface SchoolComparisonProps {
  comparison: SchoolComparisonData
}

function formatValue(row: ComparisonRow, value: number | null): string {
  if (value === null) return "-"
  return row.key === "resources" ? value.toFixed(1) : formatPercent(value)
}

/** 差值：比例项用百分点，课均资源数用个；取不到任一侧时不给差值 */
function formatDifference(row: ComparisonRow): { text: string; tone: "higher" | "lower" | "equal" } | null {
  if (row.departmentValue === null || row.schoolValue === null) return null
  const scale = row.key === "resources" ? 1 : 100
  const difference = Number(((row.departmentValue - row.schoolValue) * scale).toFixed(1))
  if (difference === 0) return { text: "持平", tone: "equal" }
  const unit = row.key === "resources" ? " 个" : " 个百分点"
  return { text: `${difference > 0 ? "高" : "低"} ${Math.abs(difference).toFixed(1)}${unit}`, tone: difference > 0 ? "higher" : "lower" }
}

/** 与全校对比：本系与全校的达标率、教师参与率、课均资源数；看不到全校数据时说明原因 */
export function SchoolComparison({ comparison }: SchoolComparisonProps) {
  if (comparison.kind === "na") {
    return <NaPanelBody reason={comparison.reason} />
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1.5 text-left font-normal">指标</th>
            <th className="py-1.5 text-right font-normal">本系</th>
            <th className="py-1.5 text-right font-normal">全校</th>
            <th className="py-1.5 text-right font-normal">差值</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {comparison.rows.map((row) => {
            const difference = formatDifference(row)
            return (
              <tr key={row.key}>
                <td className="py-2.5 text-foreground">{row.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-foreground">{formatValue(row, row.departmentValue)}</td>
                <td className="py-2.5 text-right tabular-nums text-muted-foreground">{formatValue(row, row.schoolValue)}</td>
                <td
                  className={cn(
                    "py-2.5 text-right text-xs tabular-nums",
                    difference !== null && difference.tone === "lower" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {difference === null ? "-" : difference.text}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-auto text-xs leading-5 text-muted-foreground">
        达标率：大纲、教案、课件齐备的课程占比；教师参与率：在册教师中担任课程负责人的比例；课均资源数：资源总数 ÷ 课程数。
      </p>
    </div>
  )
}
