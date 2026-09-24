"use client"

import { useMemo } from "react"
import { CourseMatrixTable } from "@/modules/dashboard/components/major/course-matrix-table"
import { EvaluationRecordsTable } from "@/modules/dashboard/components/major/evaluation-records-table"
import { MajorKpiRow } from "@/modules/dashboard/components/major/major-kpi-row"
import { MajorWarningPanel } from "@/modules/dashboard/components/major/major-warning-panel"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { buildMajorSample } from "@/modules/dashboard/sample/major-sample"

interface MajorDashboardProps {
  seed: number
  departmentName: string
  majorName: string
}

export function MajorDashboard({ seed, departmentName, majorName }: MajorDashboardProps) {
  const data = useMemo(() => buildMajorSample(seed, departmentName, majorName), [seed, departmentName, majorName])
  const shownCount = data.courses.length

  return (
    <div className="space-y-4">
      <MajorKpiRow overview={data.overview} />

      <DashboardPanel
        title="课程建设状态"
        description={
          data.overview.courseCount > shownCount
            ? `共 ${data.overview.courseCount} 门，示例数据列出 ${shownCount} 门`
            : "每门课的建设步骤与负责人"
        }
      >
        <CourseMatrixTable courses={data.courses} />
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <DashboardPanel title="预警" description="负责人空缺、长期未更新、评估批次未准备">
          <MajorWarningPanel warnings={data.warnings} />
        </DashboardPanel>
        <DashboardPanel title="评估记录" description="本专业各课程历次评估得分">
          <EvaluationRecordsTable
            terms={data.evaluationTerms}
            passScore={data.evaluationPassScore}
            records={data.evaluationRecords}
          />
        </DashboardPanel>
      </div>
    </div>
  )
}
