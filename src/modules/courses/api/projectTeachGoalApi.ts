import { api, type ProjectTeachGoalData, type TaskGoalItem } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const projectTeachGoalApi = {
  getProjectTeachGoal(courseId: string): Promise<ApiResponse<ProjectTeachGoalData>> {
    return api.projectTeachGoal.getProjectTeachGoal(courseId)
  },
  getTaskGoals(projectId: string): Promise<ApiResponse<TaskGoalItem[]>> {
    return api.projectTeachGoal.getTaskGoals(projectId)
  },
  updateTaskGoals(goals: TaskGoalItem[]): Promise<ApiResponse<TaskGoalItem[]>> {
    return api.projectTeachGoal.updateTaskGoals(goals)
  },
}
