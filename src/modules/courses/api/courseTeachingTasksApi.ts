import { api } from "@/lib/api"
import { HttpAdapter } from "@/lib/api/http-adapter"
import type { ApiResponse } from "@/lib/api/types"
import type { TeachingSupervisoryTask, Long } from "@/types"

const http = new HttpAdapter()

export interface CourseTeachingTaskResponse {
  id: Long
  taskId: Long
  title: string
  startDate: string
  endDate: string
  courseId: Long
  courseName: string
  majorId: Long
  majorName: string
  deptId: Long
  deptName: string
  collegeId: Long
  collegeName: string
  selfEvaluationStatus: string
  deptEvaluationStatus: string
  schoolEvaluationStatus: string
  overallStatus: "not_started" | "in_progress" | "completed"
  selfTotalScore: number | null
  deptTotalScore: number | null
  schoolTotalScore: number | null
  finalScore: number | null
  selfSubmittedAt: string | null
  deptSubmittedAt: string | null
  schoolSubmittedAt: string | null
  description?: string | null
}

export const courseTeachingTasksApi = {
  getTasksByCourse(courseId: Long): Promise<ApiResponse<CourseTeachingTaskResponse[]>> {
    return http.get<CourseTeachingTaskResponse[]>(`/api/v5/task-evaluation/courses/${courseId}/tasks`)
  },
  getTasksByStatus(
    universityId: Long,
    status: "not_started" | "in_progress" | "completed",
  ): Promise<ApiResponse<TeachingSupervisoryTask[]>> {
    return api.teachingTasks.getTasksByStatus(universityId, status)
  },
  getTask(
    universityId: Long,
    taskId: Long,
  ): Promise<ApiResponse<TeachingSupervisoryTask>> {
    return api.teachingTasks.getTask(universityId, taskId, { includeCriteria: true })
  },
}
