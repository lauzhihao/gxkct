"use client"

import { useState } from "react"
import { BreakpointList } from "@/modules/dashboard/components/department/breakpoint-list"
import { DepartmentKpiRow } from "@/modules/dashboard/components/department/department-kpi-row"
import { DepartmentLists } from "@/modules/dashboard/components/department/department-lists"
import { MajorProgressRanking } from "@/modules/dashboard/components/department/major-progress-ranking"
import { MajorStatusTable } from "@/modules/dashboard/components/department/major-status-table"
import { SchoolComparison } from "@/modules/dashboard/components/department/school-comparison"
import { ConclusionBar } from "@/modules/dashboard/components/shared/conclusion-bar"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { DrilldownDialog } from "@/modules/dashboard/components/shared/drilldown-dialog"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { buildDepartmentConclusion } from "@/modules/dashboard/conclusions"
import { loadDepartmentDashboard } from "@/modules/dashboard/data/load-department"
import { comparisonKey, type SemesterComparisons } from "@/modules/dashboard/data/semesters"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"
import type { DepartmentBreakpoints, DrilldownRequest } from "@/modules/dashboard/types"

interface DepartmentDashboardProps {
  collegeId: number
  semesterId: number | null
  comparisons: SemesterComparisons
  departmentId: string
  /** 校级账号看得到全校课程，才给出全校排名与全校对比 */
  schoolScopeVisible: boolean
  onDrillMajor: (majorId: string) => void
}

const BREAKPOINT_TITLES: Record<keyof DepartmentBreakpoints, string> = {
  noSyllabus: "无大纲课程",
  noLessonPlanOrCourseware: "无教案或课件课程",
  noResource: "无资源课程",
}

export function DepartmentDashboard({
  collegeId,
  semesterId,
  comparisons,
  departmentId,
  schoolScopeVisible,
  onDrillMajor,
}: DepartmentDashboardProps) {
  const { state, retry } = useDashboardQuery(
    `department|${collegeId}|${semesterId}|${comparisonKey(comparisons)}|${departmentId}|${schoolScopeVisible}`,
    () => loadDepartmentDashboard(collegeId, departmentId, semesterId, comparisons, schoolScopeVisible, new Date()),
  )
  const [drilldown, setDrilldown] = useState<DrilldownRequest | null>(null)

  if (state.status !== "ready") {
    return <LoadState state={state} loadingText="正在汇总本系数据" onRetry={retry} />
  }
  const data = state.data
  const departmentName = data.overview.departmentName
  const openOwnerMissing = () => setDrilldown({ title: `${departmentName}负责人未设置课程`, courses: data.ownerMissingCourses })

  return (
    <div className="space-y-4">
      <DepartmentKpiRow
        overview={data.overview}
        onOpenCourses={() => setDrilldown({ title: `${departmentName}课程清单`, courses: data.courses })}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel title="专业进度排行" description="各专业课程建设完成率与达标率，点击进入专业看板">
          <MajorProgressRanking majors={data.majors} onSelectMajor={onDrillMajor} />
        </DashboardPanel>
        <DashboardPanel title="与全校对比" description="本系达标率、教师参与率、资源量相对全校">
          <SchoolComparison comparison={data.comparison} />
        </DashboardPanel>
      </div>

      <DashboardPanel title="课程建设状态表" description="点击专业进入该专业看板">
        <MajorStatusTable majors={data.majors} onSelectMajor={onDrillMajor} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardPanel title="建设断点分布" description="课程卡在哪一步，点击查看课程清单">
          <BreakpointList
            ownerMissingCount={data.ownerMissingCourses.length}
            breakpoints={data.breakpoints}
            courseTotal={data.overview.courseTotal}
            onOpenOwnerMissing={openOwnerMissing}
            onOpenBreakpoint={(key) =>
              setDrilldown({ title: `${departmentName}${BREAKPOINT_TITLES[key]}`, courses: data.breakpoints[key] })
            }
          />
        </DashboardPanel>
        <DashboardPanel title="清单">
          <DepartmentLists
            registeredTeacherCount={data.overview.registeredTeacherCount}
            unqualifiedCourses={data.unqualifiedCourses}
            idleTeachers={data.idleTeachers}
            tasks={data.tasks}
            rectifyCourses={data.rectifyCourses}
          />
        </DashboardPanel>
      </div>

      <ConclusionBar text={buildDepartmentConclusion(data)} />

      <DrilldownDialog request={drilldown} onClose={() => setDrilldown(null)} />
    </div>
  )
}
