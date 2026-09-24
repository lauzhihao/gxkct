"use client"

import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/shared/components/ui/chart"
import { formatPercent } from "@/modules/dashboard/format"
import { SERIES_COLORS, STATUS_COLORS } from "@/modules/dashboard/palette"

export interface RankingItem {
  key: string
  label: string
  value: number
  flagged: boolean
}

interface RankingBarChartProps {
  items: RankingItem[]
  valueLabel: string
  onSelect?: (key: string) => void
  rowHeight?: number
}

const CHART_CONFIG: ChartConfig = {
  value: { label: "比例", color: SERIES_COLORS.blue },
}

/** 横向排行条形图：单一系列同色，被点名的条目用状态红并在图下方配文字说明 */
export function RankingBarChart({ items, valueLabel, onSelect, rowHeight = 22 }: RankingBarChartProps) {
  const height = items.length * rowHeight + 8

  return (
    <ChartContainer config={CHART_CONFIG} className="aspect-auto w-full" style={{ height }}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 44, bottom: 0, left: 0 }} barCategoryGap={4}>
        <XAxis type="number" domain={[0, 1]} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={92}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <ChartTooltip
          cursor={{ fill: "var(--accent)" }}
          content={
            <ChartTooltipContent
              hideIndicator
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-4">
                  <span className="text-muted-foreground">{valueLabel}</span>
                  <span className="font-medium text-foreground">{formatPercent(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          barSize={12}
          isAnimationActive={false}
          className={onSelect ? "cursor-pointer" : undefined}
          onClick={(entry: { payload?: RankingItem }) => {
            if (onSelect && entry.payload) onSelect(entry.payload.key)
          }}
        >
          {items.map((item) => (
            <Cell key={item.key} fill={item.flagged ? STATUS_COLORS.critical : SERIES_COLORS.blue} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            className="fill-foreground"
            fontSize={11}
            formatter={(value: number) => formatPercent(value)}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  )
}
