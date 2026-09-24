"use client"

import { AlertTriangle } from "lucide-react"
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { formatPercent } from "@/modules/dashboard/format"
import { SERIES_COLORS, STATUS_COLORS } from "@/modules/dashboard/palette"
import type { TermPassRate } from "@/modules/dashboard/types"

const CHART_CONFIG: ChartConfig = {
  passRate: { label: "通过率", color: SERIES_COLORS.blue },
}

interface TrendDotProps {
  cx?: number
  cy?: number
  index?: number
  payload?: TermPassRate
}

interface PassRateTrendChartProps {
  data: TermPassRate[]
  target: number
}

/** 历学期评估通过率：低于目标的学期点用状态红，并在图下用文字点名 */
export function PassRateTrendChart({ data, target }: PassRateTrendChartProps) {
  const belowTarget = data.filter((item) => item.passRate < target)

  const renderDot = ({ cx, cy, index, payload }: TrendDotProps) => {
    if (cx === undefined || cy === undefined || payload === undefined) {
      return <g key={`dot-empty-${index}`} />
    }
    const isBelow = payload.passRate < target
    return (
      <circle
        key={`dot-${payload.termLabel}`}
        cx={cx}
        cy={cy}
        r={4}
        strokeWidth={2}
        stroke="var(--card)"
        fill={isBelow ? STATUS_COLORS.critical : SERIES_COLORS.blue}
      />
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <ChartContainer config={CHART_CONFIG} className="aspect-auto h-[228px] w-full">
        <AreaChart data={data} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="termLabel"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            fontSize={11}
            padding={{ left: 14, right: 22 }}
          />
          <YAxis
            domain={[0.8, 1]}
            ticks={[0.8, 0.85, 0.9, 0.95, 1]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tickLine={false}
            axisLine={false}
            width={46}
          />
          <ReferenceLine
            y={target}
            stroke={STATUS_COLORS.critical}
            strokeDasharray="4 4"
            label={{ value: `目标 ${formatPercent(target, 0)}`, position: "insideTopRight", fontSize: 11, fill: "var(--muted-foreground)" }}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)" }}
            content={
              <ChartTooltipContent
                formatter={(value) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">通过率</span>
                    <span className="font-medium text-foreground">{formatPercent(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <Area
            dataKey="passRate"
            type="monotone"
            stroke="var(--color-passRate)"
            strokeWidth={2}
            fill="var(--color-passRate)"
            fillOpacity={0.1}
            dot={renderDot}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--card)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ChartContainer>
      {belowTarget.length > 0 ? (
        <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="size-3.5 text-destructive" aria-hidden />
          低于目标：{belowTarget.map((item) => `${item.termLabel} ${formatPercent(item.passRate)}`).join("、")}
        </p>
      ) : null}
    </div>
  )
}
