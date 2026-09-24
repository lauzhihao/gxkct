"use client"

import { Cell, Pie, PieChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { formatCount, formatPercent } from "@/modules/dashboard/format"

export interface DonutSegment {
  key: string
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  segments: DonutSegment[]
  centerValue: string
  centerLabel: string
}

/**
 * 占比环形图：扇区之间留 2px 卡片底色间隙；图例同时给出数值与占比，
 * 这样浅色扇区（对比度不足 3:1）也不依赖颜色辨认。
 */
export function DonutChart({ segments, centerValue, centerLabel }: DonutChartProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0)
  const config: ChartConfig = Object.fromEntries(
    segments.map((segment) => [segment.key, { label: segment.label, color: segment.color }]),
  )

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3">
      <div className="relative">
        <ChartContainer config={config} className="aspect-square h-[176px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  nameKey="key"
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-4">
                      <span className="text-muted-foreground">{config[String(name)].label}</span>
                      <span className="font-medium text-foreground">
                        {formatCount(Number(value))}（{formatPercent(Number(value) / total)}）
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={segments}
              dataKey="value"
              nameKey="key"
              innerRadius={56}
              outerRadius={82}
              stroke="var(--card)"
              strokeWidth={2}
              startAngle={90}
              endAngle={-270}
              isAnimationActive={false}
            >
              {segments.map((segment) => (
                <Cell key={segment.key} fill={segment.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold leading-none text-foreground">{centerValue}</span>
          <span className="mt-1 text-xs text-muted-foreground">{centerLabel}</span>
        </div>
      </div>
      <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
        {segments.map((segment) => (
          <li key={segment.key} className="flex min-w-0 items-center gap-2 text-xs">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: segment.color }} aria-hidden />
            <span className="truncate text-muted-foreground">{segment.label}</span>
            <span className="ml-auto whitespace-nowrap font-medium tabular-nums text-foreground">
              {formatCount(segment.value)}
              <span className="ml-1 font-normal text-muted-foreground">{formatPercent(segment.value / total, 0)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
