/**
 * Major 模块 API 服务层
 * 提供数据转换和错误处理增强
 */

import { api } from "@/lib/api"
import type { TreeNode } from "@/types"
import type { ApiResponse } from "@/lib/api/types"
import { HttpAdapter } from "@/lib/api/http-adapter"

// 创建专业请求体类型
export interface CreateMajorRequest {
  id: number
  departmentId: number
  name: string
  keyword: string
  majorLevel: string
  majorClass: string
  feature: string
  careerLevel: string
  demandType: string
  demandArea: string
  position: string
  requiresVOS: Array<{
    id: number
    description: string
    children: Array<{
      id: number
      description: string
      children: any[]
    }>
  }>
  upload: boolean
  professionsVOS: Array<{
    id: number
    code: string
    task: string
    lang: number
  }>
}

export interface QuickCreateMajorRequest {
  departmentId: number
  name: string
  managerIds: number[]
}

export interface UpdateMajorSettingsRequest {
  majorId: number
  name?: string
  managerIds?: number[]
}

class MajorApiService {
  private static instance: MajorApiService
  private httpAdapter: HttpAdapter

  private constructor() {
    this.httpAdapter = new HttpAdapter()
  }

  static getInstance(): MajorApiService {
    if (!MajorApiService.instance) {
      MajorApiService.instance = new MajorApiService()
    }
    return MajorApiService.instance
  }

  /**
   * 获取专业下的课程列表
   */
  async getMajorCourses(majorId: string): Promise<ApiResponse<TreeNode[] | null>> {
    return api.tree.getMajorCourses(majorId)
  }

  /**
   * 创建专业
   * POST /api/major/v2.0/v3/updatedetail
   */
  async createMajor(data: CreateMajorRequest): Promise<ApiResponse<any>> {
    return this.httpAdapter.post('/api/major/v2.0/v3/updatedetail', data)
  }

  /**
   * 快速开设专业
   * POST /api/v5/tree/major
   */
  async quickCreateMajor(data: QuickCreateMajorRequest): Promise<ApiResponse<any>> {
    return this.httpAdapter.post('/api/v5/tree/major', data)
  }

  /**
   * 更新专业卡片设置
   * PUT /api/v5/tree/major
   */
  async updateMajorSettings(data: UpdateMajorSettingsRequest): Promise<ApiResponse<unknown>> {
    return this.httpAdapter.put('/api/v5/tree/major', data)
  }

  /**
   * 删除专业
   * DELETE /api/v5/tree/semesters/{semesterId}/majors/{majorId}
   */
  async deleteMajor(semesterId: number, majorId: string): Promise<ApiResponse<null>> {
    return this.httpAdapter.delete(`/api/v5/tree/semesters/${semesterId}/majors/${majorId}`)
  }
}

// 导出单例实例
export const majorApiService = MajorApiService.getInstance()
