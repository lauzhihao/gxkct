"use client"

import { useState } from "react"
import { BreakpointList } from "@/modules/dashboard/components/department/breakpoint-list"
import { DepartmentKpiRow } from "@/modules/dashboard/components/department/department-kpi-row"
import { DepartmentLists } from "@/modules/dashboard/components/department/department-lists"
import { MajorStatusTable } from "@/modules/dashboard/components/department/major-status-table"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { NaPanelBody } from "@/modules/dashboard/components/shared/na-panel-body"
import { buildDepartmentConclusion } from "@/modules/dashboard/conclusions"
import { loadDepartmentDashboard } from "@/modules/dashboard/data/load-department"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"
import { NA_REASONS } from "@/modules/dashboard/labels"
import type { DrilldownRequest } from "@/modules/dashboard/types"

interface DepartmentDashboardProps {
  collegeId: number
  semesterId: number | null
  departmentId: string
  onDrillMajor: (majorId: string) => void
}

export function DepartmentDashboard({ collegeId, semesterId, departmentId, onDrillMajor }: DepartmentDashboardProps) {
  const { state, retry } = useDashboardQuery(`department|${collegeId}|${semesterId}|${departmentId}`, () =>
    loadDepartmentDashboard(collegeId, departmentId, semesterId, new Date()),
  )
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null)

  if (state.status !== "ready") {
    return <LoadState state={state} loadingText="正在汇总本系数据" onRetry={retry} />
  }
  const data = state.data
  const openOwnerMissing = () =>
    setDrilldown({ title: `${data.overview.departmentName}负责人未设置课程`, courses: data.ownerMissingCourses })

  return (
    <div className="space-y-4">
      <DepartmentKpiRow
        overview={data.overview}
        onOpenCourses={() => setDrilldown({ title: `${data.overview.departmentName}课程清单`, courses: data.courses })}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="专业进度排行" description="各专业课程建设完成率与达标率">
          <NaPanelBody reason={`${NA_REASONS.completion}；${NA_REASONS.qualified}`} />
        </DashboardPanel>
        <DashboardPanel title="与全校对比" description="本系达标率、教师参与率、资源量相对全校均值">
          <NaPanelBody reason={NA_REASONS.comparison} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="课程建设状态表" description="点击专业进入该专业看板">
        <MajorStatusTable majors={data.majors} onSelectMajor={onDrillMajor} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardPanel title="建设断点分布" description="课程卡在哪一步">
          <BreakpointList
            ownerMissingCount={data.ownerMissingCourses.length}
            courseTotal={data.overview.courseTotal}
            onOpenOwnerMissing={openOwnerMissing}
          />
        </DashboardPanel>
        <DashboardPanel title="清单">
          <DepartmentLists
            registeredTeacherCount={data.overview.registeredTeacherCount}
            idleTeachers={data.idleTeachers}
            tasks={data.tasks}
          />
        </DashboardPanel>
      </div>

      <ConclusionBar text={buildDepartmentConclusion(data)} />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
