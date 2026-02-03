import { api, type MajorMatrixData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { CourseMatrixItem, CourseMatrixSavePayload } from "@/lib/api/matrix-api"

export const courseMatrixApi = {
  getCourseMajorMatrix(courseId: string, majorId: string): Promise<ApiResponse<MajorMatrixData | null>> {
    return api.matrices.getCourseMajorMatrix(courseId, majorId)
  },
  updateCourseMajorMatrix(courseId: string, majorId: string, matrixSupportLevels: Record<string, string>): Promise<ApiResponse<MajorMatrixData | null>> {
    return api.matrices.updateCourseMajorMatrix(courseId, majorId, matrixSupportLevels)
  },
  getCourseIndicatorSupports(courseId: string, majorId: string): Promise<ApiResponse<string[] | null>> {
    return api.matrices.getCourseIndicatorSupports(courseId, majorId)
  },
  getCourseTeachingObjectiveIndicators(courseId: string, majorId: string): Promise<ApiResponse<Record<string, string[]> | null>> {
    return api.matrices.getCourseTeachingObjectiveIndicators(courseId, majorId)
  },
  getCourseMatrix(courseId: string): Promise<ApiResponse<CourseMatrixItem[] | null>> {
    return api.matrices.getCourseMatrix(courseId)
  },
  updateCourseMatrix(courseId: string, matrix: CourseMatrixSavePayload[]): Promise<ApiResponse<CourseMatrixItem[] | null>> {
    return api.matrices.updateCourseMatrix(courseId, matrix)
  },
}
