"use client"

import { useMemo } from "react"
import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { MyCourseCard } from "@/modules/dashboard/components/teacher/my-course-card"
import { MyEvaluations } from "@/modules/dashboard/components/teacher/my-evaluations"
import { MyResourceGaps } from "@/modules/dashboard/components/teacher/my-resource-gaps"
import { MyTodoList } from "@/modules/dashboard/components/teacher/my-todo-list"
import { ProgressReference } from "@/modules/dashboard/components/teacher/progress-reference"
import { buildTeacherSample } from "@/modules/dashboard/sample/teacher-sample"

interface TeacherDashboardProps {
  seed: number
}

export function TeacherDashboard({ seed }: TeacherDashboardProps) {
  const data = useMemo(() => buildTeacherSample(seed), [seed])

  return (
    <div className="space-y-4">
      <DashboardPanel title="我的课程" description="本人负责课程的建设进度、矩阵完成情况与 KSA 课点数量">
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {data.courses.map((course) => (
            <MyCourseCard key={course.id} course={course} />
          ))}
        </div>
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="我的待办" description="待补材料、临期任务、被退回修改" className="xl:col-span-2">
          <MyTodoList todos={data.todos} />
        </DashboardPanel>
        <DashboardPanel title="进度参照">
          <ProgressReference percentile={data.departmentPercentile} departmentName={data.departmentName} />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="我的资源" description="已上传数量 / 专业要求">
          <MyResourceGaps resources={data.resources} />
        </DashboardPanel>
        <DashboardPanel title="我的评估" description="评估结果、整改意见与时限" className="xl:col-span-2">
          <MyEvaluations evaluations={data.evaluations} />
        </DashboardPanel>
      </div>
    </div>
  )
}
