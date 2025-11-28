import { api, type CourseResourceData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseResourcesApi = {
  getCourseResources(courseId: string): Promise<ApiResponse<CourseResourceData>> {
    return api.resources.getCourseResources(courseId)
  },
  updateCourseResources(courseId: string, data: CourseResourceData): Promise<ApiResponse<CourseResourceData>> {
    return api.resources.updateCourseResources(courseId, data)
  },
}
