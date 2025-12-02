import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { TeachingSupervisoryTask, Long } from "@/types"

export const courseTeachingTasksApi = {
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
