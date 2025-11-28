import { api, type ProjectTeachGoalData, type Project, type ProjectTeachGoal } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const projectTeachGoalApi = {
  getProjectTeachGoal(courseId: string): Promise<ApiResponse<ProjectTeachGoalData>> {
    return api.projectTeachGoal.getProjectTeachGoal(courseId)
  },
  updateProject(project: Project): Promise<ApiResponse<ProjectTeachGoal>> {
    return api.projectTeachGoal.updateProject(project)
  },
}
