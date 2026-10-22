import { ActivityBars } from "@/modules/dashboard/components/school/activity-bars"
import { DEFINITIONS } from "@/modules/dashboard/labels"
import type { ActivityMonth } from "@/modules/dashboard/types"

interface ActivityTrendProps {
  months: ActivityMonth[]
}

/** 建设活跃趋势：近 6 个自然月的新增课程与课程编辑次数，两个量级不同，上下分开画 */
export function ActivityTrend({ months }: ActivityTrendProps) {
  return (
    <div className="flex flex-1 flex-col gap-2">
      <ActivityBars title="新增课程（门）" months={months} metric="newCourseCount" unit="门" />
      <ActivityBars title="课程编辑（次）" months={months} metric="courseEditCount" unit="次" />
      <p className="mt-auto text-xs leading-5 text-muted-foreground">{DEFINITIONS.activity}；改 KSA、改矩阵不在操作日志里，未计入。</p>
    </div>
  )
}
