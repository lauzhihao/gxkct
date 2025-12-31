"use client"

import type { TeachingSupervisoryTask, Long } from "@/types"
import { EvaluationDetail } from "@/shared/components/supervision"

interface CourseSupervisionDetailProps {
  task: TeachingSupervisoryTask
  onBack: () => void
}

/**
 * 课程级别的评分详情组件
 * 已知 courseId，直接显示评分详情
 */
export function CourseSupervisionDetail({ task, onBack }: CourseSupervisionDetailProps) {
  const taskId = (task.id ?? task.taskId) as Long
  const courseId = task.courseId as Long

  return (
    <EvaluationDetail
      taskId={taskId}
      courseId={courseId}
      courseName={task.courseName || task.title}
      onBack={onBack}
    />
  )
}
