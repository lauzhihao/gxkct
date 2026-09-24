"use client"

import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart"
import { niceCountTicks } from "@/modules/dashboard/axis"
import { SERIES_COLORS } from "@/modules/dashboard/palette"
import type { MonthlyActivity } from "@/modules/dashboard/types"

const CHART_CONFIG: ChartConfig = {
  newCourses: { label: "新增课程", color: SERIES_COLORS.blue },
  resourceUpdates: { label: "资源更新", color: SERIES_COLORS.orange },
}

interface ActivityTrendChartProps {
  data: MonthlyActivity[]
}

/** 建设活跃趋势：两个计数量共用一根纵轴（同单位"次/门"），不做双轴 */
export function ActivityTrendChart({ data }: ActivityTrendChartProps) {
  const ticks = niceCountTicks(Math.max(...data.map((item) => Math.max(item.newCourses, item.resourceUpdates))))

  return (
    <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[250px] w-full">
      <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis
          domain={[0, ticks[ticks.length - 1]]}
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          width={40}
          tickMargin={4}
          allowDecimals={false}
        />
        <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="newCourses" fill="var(--color-newCourses)" radius={[4, 4, 0, 0]} barSize={16} isAnimationActive={false} />
        <Line
          dataKey="resourceUpdates"
          type="monotone"
          stroke="var(--color-resourceUpdates)"
          strokeWidth={2}
          dot={{ r: 4, strokeWidth: 2, stroke: "var(--card)", fill: "var(--color-resourceUpdates)" }}
          activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}
