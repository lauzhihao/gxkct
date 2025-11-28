import type { ApiResponse } from "./types"
import { StorageAdapter } from "./storage-adapter"

export interface ProjectTeachGoal {
  id: number
  description: string
  children: ProjectTeachGoal[] | null
}

export interface Project {
  id: number | string
  uniqueCode?: string
  courseUnitId?: number
  name: string
  product?: string
  theoryPeriod?: string
  practicePeriod?: string
  indexNo?: number | null
}

export interface ProjectTeachGoalData {
  projects: Project[]
  goals: ProjectTeachGoal[]
}

export class ProjectTeachGoalApi {
  private storage = new StorageAdapter()

  /**
   * 获取项目和教学目标数据
   * @param courseId 课程ID
   */
  async getProjectTeachGoal(courseId: string): Promise<ApiResponse<ProjectTeachGoalData>> {
    try {
      console.log(`[ProjectTeachGoalApi] 获取项目和教学目标，courseId: ${courseId}`)

      // 先尝试从缓存中读取
      const cachedResponse = await this.storage.get<ProjectTeachGoalData>(`projectTeachGoal-${courseId}`)
      if (cachedResponse.data) {
        console.log("[ProjectTeachGoalApi] 从缓存读取项目和教学目标数据", cachedResponse.data)
        return {
          data: cachedResponse.data,
          error: null,
          status: 200,
        }
      }

      const response = await this.storage.getFromApi<ProjectTeachGoalData>(
        `/api/matrix/projectnteachgoal?courseId=${courseId}`
      )

      if (response.error || !response.data) {
        console.error("[ProjectTeachGoalApi] 获取项目和教学目标API失败:", response.error)
        return {
          data: null,
          error: response.error || "获取项目和教学目标失败",
          status: response.status,
        }
      }

      console.log("[ProjectTeachGoalApi] 项目和教学目标数据加载成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[ProjectTeachGoalApi] 获取项目和教学目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 更新项目和教学目标数据
   * @param courseId 课程ID
   * @param data 项目和教学目标数据
   */
  async updateProjectTeachGoal(courseId: string, data: ProjectTeachGoalData): Promise<ApiResponse<ProjectTeachGoalData>> {
    try {
      console.log(`[ProjectTeachGoalApi] 更新项目和教学目标，courseId: ${courseId}`)

      // 保存到本地存储
      await this.storage.set(`projectTeachGoal-${courseId}`, data)

      console.log("[ProjectTeachGoalApi] 项目和教学目标数据保存成功", data)

      return {
        data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[ProjectTeachGoalApi] 更新项目和教学目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 自动保存项目和教学目标数据（静默保存）
   * @param courseId 课程ID
   * @param data 项目和教学目标数据
   */
  async autoSaveProjectTeachGoal(courseId: string, data: ProjectTeachGoalData): Promise<ApiResponse<ProjectTeachGoalData>> {
    try {
      console.log(`[ProjectTeachGoalApi] 自动保存项目和教学目标，courseId: ${courseId}`)

      // 模拟1秒延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 保存到本地存储
      await this.storage.set(`projectTeachGoal-${courseId}`, data)

      console.log("[ProjectTeachGoalApi] 项目和教学目标数据自动保存成功", data)

      return {
        data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[ProjectTeachGoalApi] 自动保存项目和教学目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }
}

