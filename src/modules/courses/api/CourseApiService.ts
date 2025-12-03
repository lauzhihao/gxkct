/**
 * Course 模块 API 服务层
 * 提供数据转换和错误处理增强
 */

import { api, type CombinedCourseDetail, type MajorDetailData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

class CourseApiService {
  private static instance: CourseApiService

  private constructor() {}

  static getInstance(): CourseApiService {
    if (!CourseApiService.instance) {
      CourseApiService.instance = new CourseApiService()
    }
    return CourseApiService.instance
  }

  /**
   * 获取课程详情
   */
  async getCourseDetail(courseId: string): Promise<ApiResponse<CombinedCourseDetail>> {
    return api.courseDetail.getCourseDetail(courseId)
  }

  /**
   * 获取专业详情
   */
  async getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    return api.courseDetail.getMajorDetail(majorId)
  }
}

// 导出单例实例
export const courseApiService = CourseApiService.getInstance()
