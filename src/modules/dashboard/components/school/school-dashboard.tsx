"use client"

import { useState } from "react"
import { ActivityTrend } from "@/modules/dashboard/components/school/activity-trend"
import { DepartmentRateRanking } from "@/modules/dashboard/components/school/department-rate-ranking"
import { PassRateTrend } from "@/modules/dashboard/components/school/pass-rate-trend"
import { RecentOperationsTicker } from "@/modules/dashboard/components/school/recent-operations-ticker"
import { ResourceStats } from "@/modules/dashboard/components/school/resource-stats"
import { SchoolKpiRow } from "@/modules/dashboard/components/school/school-kpi-row"
import { SchoolWarningList } from "@/modules/dashboard/components/school/school-warning-list"
import { StageDistribution } from "@/modules/dashboard/components/school/stage-distribution"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { buildSchoolConclusion } from "@/modules/dashboard/conclusions"
import { loadSchoolDashboard } from "@/modules/dashboard/data/load-school"
import { comparisonKey, type SemesterComparisons } from "@/modules/dashboard/data/semesters"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"
import type { DrilldownRequest } from "@/modules/dashboard/types"

interface SchoolDashboardProps {
  collegeId: number
  semesterId: number | null
  comparisons: SemesterComparisons
}

export function SchoolDashboard({ collegeId, semesterId, comparisons }: SchoolDashboardProps) {
  const { state, retry } = useDashboardQuery(`school|${collegeId}|${semesterId}|${comparisonKey(comparisons)}`, () =>
    loadSchoolDashboard(collegeId, semesterId, comparisons, new Date()),
  )
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null)

  if (state.status !== "ready") {
    return <LoadState state={state} loadingText="正在汇总全校数据" onRetry={retry} />
  }
  const data = state.data

  return (
    <div className="space-y-4">
      <SchoolKpiRow
        overview={data.overview}
        ownerMissingCount={data.ownerMissing.count}
        onOpenAllCourses={() => setDrilldown({ title: "全校课程清单", courses: data.courses })}
        onOpenUnqualified={() => setDrilldown({ title: "未达标课程（大纲、教案、课件未齐）", courses: data.unqualifiedCourses })}
        onOpenRectify={() => setDrilldown({ title: "待整改课程（最近一次学校评价未达合格线）", courses: data.rectifyCourses })}
      />

      <RecentOperationsTicker operations={data.recentOperations} />

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardPanel title="课程建设进度分布" description="按建设阶段统计本学期课程">
          <StageDistribution counts={data.stageCounts} courseTotal={data.overview.courseTotal} />
        </DashboardPanel>

        <DashboardPanel title="院系达标率排行" description="全院系达标率从高到低，末位红标">
          <DepartmentRateRanking departments={data.departmentRates} />
        </DashboardPanel>

        <DashboardPanel title="建设活跃趋势" description="近 6 个月新增课程与课程编辑次数">
          <ActivityTrend months={data.activityMonths} />
        </DashboardPanel>

        <DashboardPanel title="质量评估通过率" description="各次评估任务中已出分课程的合格比例">
          <PassRateTrend tasks={data.taskPassRates} />
        </DashboardPanel>

        <DashboardPanel title="资源建设统计" description="按资源类型统计全校课程资源">
          <ResourceStats
            resources={data.resources}
            zeroResourceCount={data.zeroResource.count}
            courseTotal={data.overview.courseTotal}
          />
        </DashboardPanel>

        <DashboardPanel title="待办预警" description="有数量的类别可点击查看课程清单">
          <SchoolWarningList
            ownerMissing={data.ownerMissing}
            evaluationDueSoon={data.evaluationDueSoon}
            stale={data.stale}
            zeroResource={data.zeroResource}
            onOpenOwnerMissing={() => setDrilldown({ title: "负责人未设置课程", courses: data.ownerMissingCourses })}
            onOpenStale={() => setDrilldown({ title: "超 60 天未更新课程（课程信息最后保存超过 60 天）", courses: data.staleCourses })}
            onOpenZeroResource={() => setDrilldown({ title: "零资源课程", courses: data.zeroResourceCourses })}
          />
        </DashboardPanel>
      </div>

      <ConclusionBar text={buildSchoolConclusion(data)} />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
