"use client"

import { useMemo, useState } from "react"
import { BreakpointChart } from "@/modules/dashboard/components/department/breakpoint-chart"
import { ComparisonChart } from "@/modules/dashboard/components/department/comparison-chart"
import { DepartmentKpiRow } from "@/modules/dashboard/components/department/department-kpi-row"
import { DepartmentLists } from "@/modules/dashboard/components/department/department-lists"
import { MajorProgressChart } from "@/modules/dashboard/components/department/major-progress-chart"
import { MajorStatusTable } from "@/modules/dashboard/components/department/major-status-table"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { buildDepartmentConclusion } from "@/modules/dashboard/conclusions"
import { BREAKPOINT_LABELS } from "@/modules/dashboard/labels"
import { buildDepartmentSample } from "@/modules/dashboard/sample/department-sample"
import { buildDrilldownSample } from "@/modules/dashboard/sample/drilldown-sample"
import type { DrilldownRequest } from "@/modules/dashboard/types"

/** 达标率低于本系达标率该比例的专业在排行下方点名 */
const LAGGING_RATIO = 0.8

interface DepartmentDashboardProps {
  seed: number
  departmentName: string
  onDrillMajor: (majorName: string) => void
}

export function DepartmentDashboard({ seed, departmentName, onDrillMajor }: DepartmentDashboardProps) {
  const data = useMemo(() => buildDepartmentSample(seed, departmentName), [seed, departmentName])
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null)

  const laggingMajors = data.majorProgress.filter(
    (major) => major.qualifiedRate < data.overview.qualifiedRate * LAGGING_RATIO,
  )
  const topBreakpoint = [...data.breakpoints].sort((left, right) => right.count - left.count)[0]

  return (
    <div className="space-y-4">
      <DepartmentKpiRow
        overview={data.overview}
        onOpenCourses={() =>
          setDrilldown(
            buildDrilldownSample({
              title: `${departmentName}课程清单`,
              total: data.overview.courseTotal,
              departmentName,
              ownerMode: "mixed",
              fixedStage: null,
            }),
          )
        }
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="专业进度排行" description="各专业（按年级）课程建设完成率与达标率">
          <MajorProgressChart majors={data.majorProgress} laggingMajors={laggingMajors} />
        </DashboardPanel>
        <DashboardPanel title="与全校对比" description="本系指标相对全校均值高 / 低的幅度">
          <ComparisonChart metrics={data.comparison} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="课程建设状态表" description="点击专业进入该专业看板">
        <MajorStatusTable majors={data.majorProgress} onSelectMajor={onDrillMajor} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardPanel title="建设断点分布" description="未达标课程卡在哪一步">
          <BreakpointChart breakpoints={data.breakpoints} />
        </DashboardPanel>
        <DashboardPanel title="清单">
          <DepartmentLists unqualifiedCourses={data.unqualifiedCourses} idleTeachers={data.idleTeachers} tasks={data.tasks} />
        </DashboardPanel>
      </div>

      <ConclusionBar
        text={buildDepartmentConclusion(
          data,
          laggingMajors.map((major) => `${major.majorName}（${major.gradeLabel}）`),
          BREAKPOINT_LABELS[topBreakpoint.kind],
        )}
      />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
