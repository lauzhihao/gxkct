"use client"

import { useMemo, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { ActivityTrendChart } from "@/modules/dashboard/components/school/activity-trend-chart"
import { PassRateTrendChart } from "@/modules/dashboard/components/school/pass-rate-trend-chart"
import { SchoolKpiRow } from "@/modules/dashboard/components/school/school-kpi-row"
import { SchoolWarningList } from "@/modules/dashboard/components/school/school-warning-list"
import { UpdateTicker } from "@/modules/dashboard/components/school/update-ticker"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DonutChart } from "@/modules/dashboard/components/shared/donut-chart"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { RankingBarChart } from "@/modules/dashboard/components/shared/ranking-bar-chart"
import { buildSchoolConclusion } from "@/modules/dashboard/conclusions"
import { formatCount, formatPercent } from "@/modules/dashboard/format"
import { RESOURCE_LABELS, SCHOOL_WARNING_LABELS, STAGE_LABELS } from "@/modules/dashboard/labels"
import { RESOURCE_COLORS, STAGE_COLORS } from "@/modules/dashboard/palette"
import { buildDrilldownSample } from "@/modules/dashboard/sample/drilldown-sample"
import { buildSchoolSample } from "@/modules/dashboard/sample/school-sample"
import type { DrilldownRequest } from "@/modules/dashboard/types"

/** 末位几个院系在排行中红标提示 */
const FLAGGED_TAIL_COUNT = 2

interface SchoolDashboardProps {
  seed: number
  onDrillDepartment: (departmentName: string) => void
}

export function SchoolDashboard({ seed, onDrillDepartment }: SchoolDashboardProps) {
  const data = useMemo(() => buildSchoolSample(seed), [seed])
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null)
  const { overview } = data

  const rankingItems = data.departmentRanking.map((item, index) => ({
    key: item.departmentName,
    label: item.departmentName,
    value: item.qualifiedRate,
    flagged: index >= data.departmentRanking.length - FLAGGED_TAIL_COUNT,
  }))
  const resourceTotal = data.resourceStats.reduce((sum, item) => sum + item.count, 0)

  return (
    <div className="space-y-4">
      <SchoolKpiRow
        overview={overview}
        onOpenAllCourses={() =>
          setDrilldown(
            buildDrilldownSample({ title: "全校课程清单", total: overview.courseTotal, departmentName: null, ownerMode: "mixed", fixedStage: null }),
          )
        }
        onOpenQualified={() =>
          setDrilldown(
            buildDrilldownSample({
              title: "已达标课程清单",
              total: overview.qualifiedCourseCount,
              departmentName: null,
              ownerMode: "all",
              fixedStage: "qualified",
            }),
          )
        }
        onOpenRisk={() =>
          setDrilldown(
            buildDrilldownSample({
              title: "待整改 / 负责人空缺课程",
              total: overview.overdueRectificationCount + overview.ownerMissingCount,
              departmentName: null,
              ownerMode: "mixed",
              fixedStage: null,
            }),
          )
        }
      />

      <UpdateTicker events={data.recentUpdates} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardPanel title="课程建设进度分布" description="按建设阶段统计本学期课程">
          <DonutChart
            segments={data.stageDistribution.map((item) => ({
              key: item.stage,
              label: STAGE_LABELS[item.stage],
              value: item.count,
              color: STAGE_COLORS[item.stage],
            }))}
            centerValue={formatPercent(overview.qualifiedRate)}
            centerLabel="总达标率"
          />
        </DashboardPanel>

        <DashboardPanel title="院系达标率排行" description="点击院系进入该院系看板">
          <RankingBarChart items={rankingItems} valueLabel="达标率" onSelect={onDrillDepartment} />
          <p className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5 text-destructive" aria-hidden />
            红色为末位 {FLAGGED_TAIL_COUNT} 个院系
          </p>
        </DashboardPanel>

        <DashboardPanel title="本学期建设活跃趋势" description="按月统计新增课程与资源更新次数">
          <ActivityTrendChart data={data.monthlyActivity} />
        </DashboardPanel>

        <DashboardPanel title="质量评估通过率趋势" description="历学期已评课程通过率">
          <PassRateTrendChart data={data.passRateTrend} target={data.passRateTarget} />
        </DashboardPanel>

        <DashboardPanel title="资源建设统计" description="按资源类型统计全校课程资源">
          <DonutChart
            segments={data.resourceStats.map((item) => ({
              key: item.category,
              label: RESOURCE_LABELS[item.category],
              value: item.count,
              color: RESOURCE_COLORS[item.category],
            }))}
            centerValue={formatCount(resourceTotal, true)}
            centerLabel="资源总数"
          />
        </DashboardPanel>

        <DashboardPanel title="待办预警" description="点击查看对应课程清单">
          <SchoolWarningList
            warnings={data.warnings}
            onOpen={(warning) =>
              setDrilldown(
                buildDrilldownSample({
                  title: SCHOOL_WARNING_LABELS[warning.kind],
                  total: warning.count,
                  departmentName: null,
                  ownerMode: warning.kind === "ownerMissing" ? "none" : "all",
                  fixedStage: null,
                }),
              )
            }
          />
        </DashboardPanel>
      </div>

      <ConclusionBar text={buildSchoolConclusion(data)} />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
