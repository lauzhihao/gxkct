"use client"

import { CourseMatrixTable } from "@/modules/dashboard/components/major/course-matrix-table"
import { EvaluationRecordsTable } from "@/modules/dashboard/components/major/evaluation-records-table"
import { MajorKpiRow } from "@/modules/dashboard/components/major/major-kpi-row"
import { MajorWarningPanel } from "@/modules/dashboard/components/major/major-warning-panel"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { loadMajorDashboard } from "@/modules/dashboard/data/load-major"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"

interface MajorDashboardProps {
  collegeId: number
  semesterId: number | null
  majorId: string
}

export function MajorDashboard({ collegeId, semesterId, majorId }: MajorDashboardProps) {
  const { state, retry } = useDashboardQuery(`major|${collegeId}|${semesterId}|${majorId}`, () =>
    loadMajorDashboard(collegeId, majorId, semesterId, new Date()),
  )

  if (state.status !== "ready") {
    return <LoadState state={state} loadingText="正在读取本专业课程、资源与评估数据" onRetry={retry} />
  }
  const data = state.data

  return (
    <div className="space-y-4">
      <MajorKpiRow overview={data.overview} />

      <DashboardPanel title="课程建设状态" description="每门课的负责人、支撑的毕业要求指标点、材料是否齐备与评估情况">
        <CourseMatrixTable courses={data.courses} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardPanel title="预警" description="负责人空缺、评估批次未准备、长期未更新">
          <MajorWarningPanel
            ownerMissingCourseNames={data.ownerMissingCourseNames}
            unpreparedCourseNames={data.unpreparedCourseNames}
            staleCourseNames={data.staleCourseNames}
          />
        </DashboardPanel>
        <DashboardPanel title="评估记录" description="本专业各课程在本学期各次评估中的得分">
          <EvaluationRecordsTable columns={data.evaluationColumns} records={data.evaluationRecords} />
        </DashboardPanel>
      </div>
    </div>
  )
}
