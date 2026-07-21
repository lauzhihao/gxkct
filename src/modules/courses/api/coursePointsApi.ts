import { api, type CoursePoint } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const coursePointsApi = {
  getCoursePoints(majorId: number, courseId: number): Promise<ApiResponse<CoursePoint[] | null>> {
    return api.coursePoints.getCoursePoints(majorId, courseId)
  },
  saveCoursePoints(
    majorId: number,
    courseId: number,
    points: Array<{ id: number; title: string; description: string }>,
    upload = false
  ): Promise<ApiResponse<unknown>> {
    return api.coursePoints.saveCoursePoints(majorId, courseId, points, upload)
  },
  createCoursePoint(point: Partial<CoursePoint>): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.createCoursePoint(point)
  },
  updateCoursePoint(
    majorId: number,
    courseId: number,
    coursePointId: number,
    data: Partial<CoursePoint>
  ): Promise<ApiResponse<CoursePoint | null>> {
    return api.coursePoints.updateCoursePoint(majorId, courseId, coursePointId, data)
  },
  deleteCoursePoint(majorId: number, courseId: number, coursePointId: number): Promise<ApiResponse<void | null>> {
    return api.coursePoints.deleteCoursePoint(majorId, courseId, coursePointId)
  },
}
