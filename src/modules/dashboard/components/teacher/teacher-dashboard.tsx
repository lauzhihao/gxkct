"use client"

import { DashboardPanel } from "@/modules/dashboard/components/shared/dashboard-panel"
import { LoadState } from "@/modules/dashboard/components/shared/load-state"
import { MyCourseCard } from "@/modules/dashboard/components/teacher/my-course-card"
import { MyEvaluations } from "@/modules/dashboard/components/teacher/my-evaluations"
import { MyResources } from "@/modules/dashboard/components/teacher/my-resources"
import { MyTodoList } from "@/modules/dashboard/components/teacher/my-todo-list"
import { ProgressReference } from "@/modules/dashboard/components/teacher/progress-reference"
import { loadTeacherDashboard, type TeacherIdentity } from "@/modules/dashboard/data/load-teacher"
import { useDashboardQuery } from "@/modules/dashboard/data/use-dashboard-query"

interface TeacherDashboardProps {
  collegeId: number
  semesterId: number | null
  identity: TeacherIdentity
}

export function TeacherDashboard({ collegeId, semesterId, identity }: TeacherDashboardProps) {
  const { state, retry } = useDashboardQuery(`teacher|${collegeId}|${semesterId}|${identity.userId}`, () =>
    loadTeacherDashboard(collegeId, semesterId, identity, new Date()),
  )

  if (state.status !== "ready") {
    return <LoadState state={state} loadingText="正在读取本人课程" onRetry={retry} />
  }
  const data = state.data

  return (
    <div className="space-y-4">
      <DashboardPanel title="我的课程" description={`${data.teacherName}担任负责人的课程：建设进度、矩阵完成情况与 KSA 课点数量`}>
        {data.courses.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">本学期没有担任负责人的课程</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
            {data.courses.map((course) => (
              <MyCourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </DashboardPanel>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="我的待办" description="待补材料（大纲 / 教案 / 课件）、30 天内到期未交自评的评估" className="xl:col-span-2">
          <MyTodoList todos={data.todos} />
        </DashboardPanel>
        <DashboardPanel title="进度参照">
          <ProgressReference />
        </DashboardPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <DashboardPanel title="我的资源" description="本人课程已上传资源 / 专业要求">
          <MyResources resources={data.resources} />
        </DashboardPanel>
        <DashboardPanel title="我的评估" description="评估得分、等级、整改意见与时限" className="xl:col-span-2">
          <MyEvaluations evaluations={data.evaluations} />
        </DashboardPanel>
      </div>
    </div>
  )
}
