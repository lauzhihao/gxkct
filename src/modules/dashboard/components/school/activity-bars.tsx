"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { monthLabel, monthTitle } from "@/modules/dashboard/data/activity"
import { SERIES_COLORS } from "@/modules/dashboard/palette"
import type { ActivityMonth } from "@/modules/dashboard/types"

interface ActivityBarsProps {
  title: string
  months: ActivityMonth[]
  metric: "newCourseCount" | "courseEditCount"
  unit: string
}

/** 单一指标的月度柱图：一个图只放一个指标，两个量级不同的指标分开画，不共用坐标轴 */
export function ActivityBars({ title, months, metric, unit }: ActivityBarsProps) {
  const config: ChartConfig = { [metric]: { label: title, color: SERIES_COLORS.blue } }
  const data = months.map((month) => ({ month: month.month, label: monthLabel(month.month), [metric]: month[metric] }))

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-muted-foreground">{title}</p>
      <ChartContainer config={config} className="aspect-auto h-[112px] w-full">
        <BarChart data={data} margin={{ top: 18, right: 4, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={6} />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const month = payload.length > 0 ? String(payload[0].payload.month) : ""
                  return month === "" ? "" : monthTitle(month)
                }}
                formatter={(value) => `${value} ${unit}`}
              />
            }
          />
          <Bar dataKey={metric} fill={`var(--color-${metric})`} radius={[4, 4, 0, 0]} maxBarSize={28}>
            <LabelList dataKey={metric} position="top" offset={4} className="fill-foreground" fontSize={11} />
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  )
}
