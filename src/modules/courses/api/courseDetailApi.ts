import { api, type CombinedCourseDetail, type MajorDetailData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const courseDetailApi = {
  getCourseDetail(courseId: string): Promise<ApiResponse<CombinedCourseDetail>> {
    return api.courseDetail.getCourseDetail(courseId)
  },
  getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    return api.courseDetail.getMajorDetail(majorId)
  },
}
