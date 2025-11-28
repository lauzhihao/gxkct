import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { TeachingSupervisoryTask, TeachingQualityStandard } from "@/types"

export const courseTeachingTasksApi = {
  getTasksByStatus(
    universityId: string,
    status: "not_started" | "in_progress" | "completed",
  ): Promise<ApiResponse<TeachingSupervisoryTask[]>> {
    return api.teachingTasks.getTasksByStatus(universityId, status)
  },
  getTaskStandards(taskId: string): Promise<ApiResponse<TeachingQualityStandard>> {
    return api.teachingTasks.getTaskStandards(taskId)
  },
}
