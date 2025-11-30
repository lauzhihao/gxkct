/**
 * Course 模块 API 服务层
 * 提供缓存管理、数据转换和错误处理增强
 */

import { api, type CombinedCourseDetail, type MajorDetailData } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import { ApiCache } from "@/shared/utils/api-cache"

class CourseApiService {
  private static instance: CourseApiService

  // 课程详情缓存，TTL 60秒
  private courseDetailCache = new ApiCache<CombinedCourseDetail>(60000)

  // 专业详情缓存，TTL 60秒
  private majorDetailCache = new ApiCache<MajorDetailData>(60000)

  private constructor() {}

  static getInstance(): CourseApiService {
    if (!CourseApiService.instance) {
      CourseApiService.instance = new CourseApiService()
    }
    return CourseApiService.instance
  }

  /**
   * 获取课程详情（带缓存）
   */
  async getCourseDetail(courseId: string): Promise<ApiResponse<CombinedCourseDetail>> {
    const cached = this.courseDetailCache.get(courseId)
    if (cached) {
      return {
        data: cached,
        error: null,
        status: 200,
      }
    }

    const response = await api.courseDetail.getCourseDetail(courseId)

    if (response.data) {
      this.courseDetailCache.set(courseId, response.data)
    }

    return response
  }

  /**
   * 获取专业详情（带缓存）
   */
  async getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    const cacheKey = String(majorId)
    const cached = this.majorDetailCache.get(cacheKey)

    if (cached) {
      return {
        data: cached,
        error: null,
        status: 200,
      }
    }

    const response = await api.courseDetail.getMajorDetail(majorId)

    if (response.data) {
      this.majorDetailCache.set(cacheKey, response.data)
    }

    return response
  }

  /**
   * 更新课程详情
   * 自动清除相关缓存
   */
  async updateCourseDetail(courseId: string, data: any): Promise<ApiResponse<any>> {
    // 调用底层 API（假设存在）
    // 这里需要根据实际的更新 API 调整
    this.courseDetailCache.invalidate(courseId)

    // 返回更新结果（实际实现需要调用真实的更新接口）
    return {
      data: null,
      error: null,
      status: 200,
    }
  }

  /**
   * 清除指定课程的缓存
   */
  invalidateCourseCache(courseId: string): void {
    this.courseDetailCache.invalidate(courseId)
  }

  /**
   * 清除指定专业的缓存
   */
  invalidateMajorCache(majorId: string | number): void {
    this.majorDetailCache.invalidate(String(majorId))
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.courseDetailCache.clear()
    this.majorDetailCache.clear()
  }
}

// 导出单例实例
export const courseApiService = CourseApiService.getInstance()
