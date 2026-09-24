"use client"

import { useState } from "react"
import { Radio } from "lucide-react"
import { SchoolKpiRow } from "@/modules/dashboard/components/school/school-kpi-row"
import { SchoolWarningList } from "@/modules/dashboard/components/school/school-warning-list"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { NaValue } from "@/modules/dashboard/components/shared/na-value"
import { buildSchoolConclusion } from "@/modules/dashboard/conclusions"
import { loadSchoolDashboard } from "@/modules/dashboard/data/load-school"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { DrilldownRequest } from "@/modules/dashboard/types"

interface SchoolDashboardProps {
  collegeId: number
  semesterId: number | null
}

export function SchoolDashboard({ collegeId, semesterId }: SchoolDashboardProps) {
  const { state, retry } = useDashboardQuery(`school|${collegeId}|${semesterId}`, () =>
    loadSchoolDashboard(collegeId, semesterId, new Date()),
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
        onOpenOwnerMissing={() => setDrilldown({ title: "负责人未设置课程", courses: data.ownerMissingCourses })}
      />

      <div className="flex h-10 items-center gap-3 rounded-md border border-border bg-card px-4 text-sm">
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
          <Radio className="size-3.5" aria-hidden />
          最近更新
        </span>
        <span className="h-4 w-px shrink-0 bg-border" aria-hidden />
        <NaValue reason={NA_REASONS.recentUpdates} />
        <span className="truncate text-xs text-muted-foreground">{NA_REASONS.recentUpdates}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <DashboardPanel title="课程建设进度分布" description="按建设阶段统计本学期课程">
          <NaPanelBody reason={NA_REASONS.stage} />
        </DashboardPanel>

        <DashboardPanel title="院系达标率排行" description="全院系达标率从高到低，末位红标">
          <NaPanelBody reason={NA_REASONS.qualified} />
        </DashboardPanel>

        <DashboardPanel title="本学期建设活跃趋势" description="按月统计新增课程与资源更新次数">
          <NaPanelBody reason={NA_REASONS.activity} />
        </DashboardPanel>

        <DashboardPanel title="质量评估通过率趋势" description="历学期已评课程通过率">
          <NaPanelBody reason={NA_REASONS.passLine} />
        </DashboardPanel>

        <DashboardPanel title="资源建设统计" description="按资源类型统计全校课程资源">
          <NaPanelBody reason={NA_REASONS.schoolResources} />
        </DashboardPanel>

        <DashboardPanel title="待办预警" description="负责人未设置可点击查看课程清单">
          <SchoolWarningList
            ownerMissing={data.ownerMissing}
            evaluationDueSoon={data.evaluationDueSoon}
            onOpenOwnerMissing={() => setDrilldown({ title: "负责人未设置课程", courses: data.ownerMissingCourses })}
          />
        </DashboardPanel>
      </div>

      <ConclusionBar text={buildSchoolConclusion(data)} />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
