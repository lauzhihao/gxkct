import { api, type CourseGoal } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseGoalsApi = {
  getCourseGoals(courseId: string, majorId: string): Promise<ApiResponse<CourseGoal[]>> {
    return api.courseGoals.getCourseGoals(courseId, majorId)
  },
  updateCourseGoals(courseId: string, majorId: string, goals: CourseGoal[]): Promise<ApiResponse<CourseGoal[]>> {
    return api.courseGoals.updateCourseGoals(courseId, majorId, goals)
  },
}
