/**
 * Major 模块 API 服务层
 * 提供数据转换和错误处理增强
 */

import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import type { ApiResponse } from "@/lib/api/types"

class MajorApiService {
  private static instance: MajorApiService

  private constructor() {}

  static getInstance(): MajorApiService {
    if (!MajorApiService.instance) {
      MajorApiService.instance = new MajorApiService()
    }
    return MajorApiService.instance
  }

  /**
   * 获取专业下的课程列表
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[]>> {
    return api.tree.getMajorCourses(majorId)
  }
}

// 导出单例实例
export const majorApiService = MajorApiService.getInstance()
