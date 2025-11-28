import { api, type CoursePoint } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const coursePointsApi = {
  getCoursePoints(majorId: string, courseId: string): Promise<ApiResponse<CoursePoint[]>> {
    return api.coursePoints.getCoursePoints(majorId, courseId)
  },
  createCoursePoint(point: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint>> {
    return api.coursePoints.createCoursePoint(point)
  },
  updateCoursePoint(coursePointId: string | number, data: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint>> {
    return api.coursePoints.updateCoursePoint(coursePointId, data)
  },
  deleteCoursePoint(coursePointId: string | number): Promise<ApiResponse<boolean>> {
    return api.coursePoints.deleteCoursePoint(coursePointId)
  },
}
