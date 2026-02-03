import { api, type CoursePoint } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const coursePointsApi = {
  getCoursePoints(majorId: string, courseId: string): Promise<ApiResponse<CoursePoint[] | null>> {
    return api.coursePoints.getCoursePoints(majorId, courseId)
  },
  createCoursePoint(point: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.createCoursePoint(point)
  },
  updateCoursePoint(coursePointId: number, data: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.updateCoursePoint(coursePointId, data)
  },
  deleteCoursePoint(coursePointId: number): Promise<ApiResponse<void | null>> {
    return api.coursePoints.deleteCoursePoint(coursePointId)
  },
}
