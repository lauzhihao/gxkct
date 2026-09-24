"use client"

import { Bar, BarChart, LabelList, ReferenceLine, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { formatPercent, formatSignedPercent } from "@/modules/dashboard/format"
import { SERIES_COLORS } from "@/modules/dashboard/palette"
import type { ComparisonMetric } from "@/modules/dashboard/types"

/** 发散色的"低于"一端：与"高于"的蓝色冷暖相对 */
const BELOW_COLOR = "#e34948"

const CHART_CONFIG: ChartConfig = {
  above: { label: "高于全校均值", color: SERIES_COLORS.blue },
  below: { label: "低于全校均值", color: BELOW_COLOR },
}

interface ComparisonRow {
  key: string
  label: string
  index: number
  above: number
  below: number
  departmentText: string
  averageText: string
}

interface ComparisonChartProps {
  metrics: ComparisonMetric[]
}

function formatMetricValue(metric: ComparisonMetric, value: number): string {
  return metric.unit === "rate" ? formatPercent(value) : value.toFixed(1)
}

/**
 * 与全校对比（差值图）：各指标统一换算成"相对全校均值高 / 低百分之几"，
 * 同一根横轴上比较才不会混用单位；0 为全校均值。
 */
export function ComparisonChart({ metrics }: ComparisonChartProps) {
  const rows: ComparisonRow[] = metrics.map((metric) => {
    const index = metric.departmentValue / metric.schoolAverage - 1
    return {
      key: metric.key,
      label: metric.label,
      index,
      above: index > 0 ? index : 0,
      below: index < 0 ? index : 0,
      departmentText: formatMetricValue(metric, metric.departmentValue),
      averageText: formatMetricValue(metric, metric.schoolAverage),
    }
  })
  const extent = Math.max(0.2, ...rows.map((row) => Math.abs(row.index))) * 1.35

  return (
    <div className="flex flex-1 flex-col">
      <ChartContainer config={CHART_CONFIG} className="aspect-auto w-full" style={{ height: rows.length * 36 + 12 }}>
        <BarChart data={rows} layout="vertical" stackOffset="sign" margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
          <XAxis type="number" domain={[-extent, extent]} hide />
          <YAxis type="category" dataKey="label" width={88} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
          <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeOpacity={0.5} />
          <ChartTooltip
            cursor={{ fill: "var(--accent)" }}
            content={
              <ChartTooltipContent
                hideIndicator
                formatter={(_value, _name, item) => {
                  const row = item.payload as ComparisonRow
                  return (
                    <div className="grid w-full gap-0.5">
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">本系</span>
                        <span className="font-medium text-foreground">{row.departmentText}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-muted-foreground">全校均值</span>
                        <span className="font-medium text-foreground">{row.averageText}</span>
                      </div>
                    </div>
                  )
                }}
              />
            }
          />
          {/* 高于 / 低于拆成两个同堆叠系列，圆角各自落在数据端，基线一侧保持直角 */}
          <Bar dataKey="above" stackId="diff" fill={SERIES_COLORS.blue} radius={[0, 4, 4, 0]} barSize={12} isAnimationActive={false}>
            <LabelList
              dataKey="above"
              position="right"
              className="fill-foreground"
              fontSize={11}
              formatter={(value: number) => (value > 0 ? formatSignedPercent(value) : "")}
            />
          </Bar>
          <Bar dataKey="below" stackId="diff" fill={BELOW_COLOR} radius={[4, 0, 0, 4]} barSize={12} isAnimationActive={false}>
            <LabelList
              dataKey="below"
              position="left"
              className="fill-foreground"
              fontSize={11}
              formatter={(value: number) => (value < 0 ? formatSignedPercent(value) : "")}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: SERIES_COLORS.blue }} aria-hidden />
          高于全校均值
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ backgroundColor: BELOW_COLOR }} aria-hidden />
          低于全校均值
        </span>
      </div>
    </div>
  )
}
