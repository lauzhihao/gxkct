/**
 * Major 模块 API 服务层
 * 提供缓存管理、数据转换和错误处理增强
 */

import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import type { ApiResponse } from "@/lib/api/types"
import { ApiCache } from "@/shared/utils/api-cache"

class MajorApiService {
  private static instance: MajorApiService

  // 专业课程列表缓存，TTL 30秒（课程列表可能频繁变化）
  private majorCoursesCache = new ApiCache<TreeNode[]>(30000)

  private constructor() {}

  static getInstance(): MajorApiService {
    if (!MajorApiService.instance) {
      MajorApiService.instance = new MajorApiService()
    }
    return MajorApiService.instance
  }

  /**
   * 获取专业下的课程列表（带缓存）
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[]>> {
    const cached = this.majorCoursesCache.get(majorId)

    if (cached) {
      return {
        data: cached,
        error: null,
        status: 200,
      }
    }

    const response = await api.tree.getMajorCourses(majorId)

    if (response.data) {
      this.majorCoursesCache.set(majorId, response.data)
    }

    return response
  }

  /**
   * 清除指定专业的课程缓存
   * 在添加/删除/更新课程后调用
   */
  invalidateMajorCoursesCache(majorId: string): void {
    this.majorCoursesCache.invalidate(majorId)
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.majorCoursesCache.clear()
  }
}

// 导出单例实例
export const majorApiService = MajorApiService.getInstance()
