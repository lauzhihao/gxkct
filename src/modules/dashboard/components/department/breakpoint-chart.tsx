"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { BREAKPOINT_LABELS } from "@/modules/dashboard/labels"
import { DEEMPHASIS_COLOR, SERIES_COLORS } from "@/modules/dashboard/palette"
import type { BreakpointCount } from "@/modules/dashboard/types"

const CHART_CONFIG: ChartConfig = {
  count: { label: "课程数", color: SERIES_COLORS.blue },
}

interface BreakpointChartProps {
  breakpoints: BreakpointCount[]
}

/** 建设断点分布：只突出最集中的那一步，其余置灰 */
export function BreakpointChart({ breakpoints }: BreakpointChartProps) {
  const rows = [...breakpoints]
    .sort((left, right) => right.count - left.count)
    .map((item) => ({ key: item.kind, label: BREAKPOINT_LABELS[item.kind], count: item.count }))
  const maxCount = Math.max(...rows.map((row) => row.count))

  return (
    <ChartContainer config={CHART_CONFIG} className="aspect-auto w-full" style={{ height: rows.length * 40 + 8 }}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="label" width={80} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
        <ChartTooltip cursor={{ fill: "var(--accent)" }} content={<ChartTooltipContent hideIndicator />} />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}>
          {rows.map((row) => (
            <Cell key={row.key} fill={row.count === maxCount ? SERIES_COLORS.blue : DEEMPHASIS_COLOR} />
          ))}
          <LabelList dataKey="count" position="right" className="fill-foreground" fontSize={11} formatter={(value: number) => `${value} 门`} />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
