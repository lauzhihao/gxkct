import { api, type CombinedCourseDetail, type MajorDetailData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseDetailApi = {
  getCourseDetail(courseId: string, semesterId?: number | null): Promise<ApiResponse<CombinedCourseDetail>> {
    return api.courseDetail.getCourseDetail(courseId, semesterId)
  },
  getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    return api.courseDetail.getMajorDetail(majorId)
  },
}
