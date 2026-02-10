import { api, type ProjectTeachGoalData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const projectTeachGoalApi = {
  getProjectTeachGoal(courseId: string): Promise<ApiResponse<ProjectTeachGoalData>> {
    return api.projectTeachGoal.getProjectTeachGoal(courseId)
  },
  updateProjectTeachGoal(courseId: string, data: ProjectTeachGoalData): Promise<ApiResponse<ProjectTeachGoalData>> {
    return api.projectTeachGoal.updateProjectTeachGoal(courseId, data)
  },
}
