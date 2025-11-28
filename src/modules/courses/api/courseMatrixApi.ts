import { api, type MajorMatrixData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { CourseMatrixItem } from "@/lib/api/matrix-api"

export const courseMatrixApi = {
  getCourseMajorMatrix(courseId: string, majorId: string): Promise<ApiResponse<MajorMatrixData>> {
    return api.matrices.getCourseMajorMatrix(courseId, majorId)
  },
  updateCourseMajorMatrix(courseId: string, majorId: string, matrixSupportLevels: Record<string, string>): Promise<ApiResponse<MajorMatrixData>> {
    return api.matrices.updateCourseMajorMatrix(courseId, majorId, matrixSupportLevels)
  },
  getCourseIndicatorSupports(courseId: string, majorId: string): Promise<ApiResponse<string[]>> {
    return api.matrices.getCourseIndicatorSupports(courseId, majorId)
  },
  getCourseTeachingObjectiveIndicators(courseId: string, majorId: string): Promise<ApiResponse<Record<string, string[]>>> {
    return api.matrices.getCourseTeachingObjectiveIndicators(courseId, majorId)
  },
  getCourseMatrix(courseId: string): Promise<ApiResponse<CourseMatrixItem[]>> {
    return api.matrices.getCourseMatrix(courseId)
  },
  updateCourseMatrix(courseId: string, matrix: CourseMatrixItem[]): Promise<ApiResponse<CourseMatrixItem[]>> {
    return api.matrices.updateCourseMatrix(courseId, matrix)
  },
}
