"use client"

import { AlertTriangle } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/shared/components/ui/chart"
import { formatPercent } from "@/modules/dashboard/format"
import { SERIES_COLORS } from "@/modules/dashboard/palette"
import type { MajorProgress } from "@/modules/dashboard/types"

const CHART_CONFIG: ChartConfig = {
  completionRate: { label: "建设完成率", color: SERIES_COLORS.blue },
  qualifiedRate: { label: "达标率", color: SERIES_COLORS.orange },
}

interface MajorProgressChartProps {
  majors: MajorProgress[]
  laggingMajors: MajorProgress[]
}

/** 专业进度排行：完成率与达标率并排比较；落后专业在图下直接点名 */
export function MajorProgressChart({ majors, laggingMajors }: MajorProgressChartProps) {
  const rows = [...majors]
    .sort((left, right) => right.completionRate - left.completionRate)
    .map((major) => ({ ...major, label: `${major.majorName}（${major.gradeLabel}）` }))

  return (
    <div className="flex flex-1 flex-col">
      <ChartContainer config={CHART_CONFIG} className="aspect-auto w-full" style={{ height: rows.length * 44 + 56 }}>
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis
            type="number"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
            tickFormatter={(value: number) => `${Math.round(value * 100)}%`}
            tickLine={false}
            axisLine={false}
          />
          <YAxis type="category" dataKey="label" width={176} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 12 }} />
          <ChartTooltip
            cursor={{ fill: "var(--accent)" }}
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="text-muted-foreground">{CHART_CONFIG[String(name)].label}</span>
                    <span className="font-medium text-foreground">{formatPercent(Number(value))}</span>
                  </div>
                )}
              />
            }
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Bar dataKey="completionRate" fill="var(--color-completionRate)" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false} />
          <Bar dataKey="qualifiedRate" fill="var(--color-qualifiedRate)" radius={[0, 4, 4, 0]} barSize={10} isAnimationActive={false} />
        </BarChart>
      </ChartContainer>
      {laggingMajors.length > 0 ? (
        <p className="mt-2 inline-flex items-start gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" aria-hidden />
          <span>
            落后专业：
            {laggingMajors
              .map((major) => `${major.majorName}（${major.gradeLabel}，达标率 ${formatPercent(major.qualifiedRate)}）`)
              .join("、")}
          </span>
        </p>
      ) : null}
    </div>
  )
}
