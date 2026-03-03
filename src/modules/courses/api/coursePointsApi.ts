import { api, type CoursePoint } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const coursePointsApi = {
  getCoursePoints(majorId: string, courseId: string): Promise<ApiResponse<CoursePoint[] | null>> {
    return api.coursePoints.getCoursePoints(majorId, courseId)
  },
  saveCoursePoints(
    majorId: string,
    courseId: string,
    points: Array<{ id: number; title: string; description: string }>
  ): Promise<ApiResponse<unknown>> {
    return api.coursePoints.saveCoursePoints(majorId, courseId, points)
  },
  createCoursePoint(point: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.createCoursePoint(point)
  },
  updateCoursePoint(
    majorId: string,
    courseId: string,
    coursePointId: number,
    data: Partial<CoursePoint>
  ): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.updateCoursePoint(majorId, courseId, coursePointId, data)
  },
  deleteCoursePoint(majorId: string, courseId: string, coursePointId: number): Promise<ApiResponse<void | null>> {
    return api.coursePoints.deleteCoursePoint(majorId, courseId, coursePointId)
  },
}
