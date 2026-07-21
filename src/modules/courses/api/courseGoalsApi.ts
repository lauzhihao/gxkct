import { api, type CourseGoal } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseGoalsApi = {
  getCourseGoals(courseId: string, majorId: string): Promise<ApiResponse<CourseGoal[] | null>> {
    return api.courseGoals.getCourseGoals(courseId, majorId)
  },
  getCourseMatrixHeaderGoals(courseId: string): Promise<ApiResponse<CourseGoal[] | null>> {
    return api.courseGoals.getCourseMatrixHeaderGoals(courseId)
  },
  updateCourseGoals(courseId: string, majorId: string, goals: CourseGoal[]): Promise<ApiResponse<CourseGoal[] | null>> {
    return api.courseGoals.updateCourseGoals(courseId, majorId, goals)
  },
  deleteCourseGoal(courseGoalId: string): Promise<ApiResponse<boolean | null>> {
    return api.courseGoals.deleteCourseGoal(courseGoalId)
  },
}
