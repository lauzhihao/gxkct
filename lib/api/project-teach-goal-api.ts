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
}

