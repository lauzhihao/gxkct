import type { ApiResponse } from "./types"
import { StorageAdapter } from "./storage-adapter"
import { HttpAdapter } from "./http-adapter"

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

export interface TaskGoalItem {
  id: number
  projectId: number
  description: string
  product: string
}

export class ProjectTeachGoalApi {
  private storage = new StorageAdapter()
  private http = new HttpAdapter()

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

  /**
   * 获取单个项目的任务目标列表
   * GET /api/matrix/taskgoal?projectId={projectId}
   */
  async getTaskGoals(projectId: string): Promise<ApiResponse<TaskGoalItem[]>> {
    try {
      const endpoint = `/api/matrix/taskgoal?projectId=${projectId}`
      console.log("[ProjectTeachGoalApi] 获取任务目标:", endpoint)

      const response = await this.http.get<TaskGoalItem[]>(endpoint)

      if (response.error) {
        console.error("[ProjectTeachGoalApi] 获取任务目标失败:", response.error)
        return { data: null, error: response.error, status: response.status ?? 500 }
      }

      const goals = Array.isArray(response.data) ? response.data : []
      console.log("[ProjectTeachGoalApi] 任务目标加载成功, 数量:", goals.length)
      return { data: goals, error: null, status: 200 }
    } catch (error) {
      console.error("[ProjectTeachGoalApi] 获取任务目标异常:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 保存任务目标列表（新增/更新/删除统一接口）
   * POST /api/matrix/updatetaskgoal
   * 规则: id=0 新增, id>0 更新, id<0 删除
   */
  async updateTaskGoals(goals: TaskGoalItem[]): Promise<ApiResponse<TaskGoalItem[]>> {
    try {
      const endpoint = `/api/matrix/updatetaskgoal`
      console.log("[ProjectTeachGoalApi] 保存任务目标:", endpoint, goals)

      const response = await this.http.post<TaskGoalItem[]>(endpoint, goals)

      if (response.error) {
        console.error("[ProjectTeachGoalApi] 保存任务目标失败:", response.error)
        return { data: null, error: response.error, status: response.status ?? 500 }
      }

      console.log("[ProjectTeachGoalApi] 任务目标保存成功")
      return { data: response.data as TaskGoalItem[] | null, error: null, status: 200 }
    } catch (error) {
      console.error("[ProjectTeachGoalApi] 保存任务目标异常:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 更新项目和教学目标数据（canvas-save-wizard 使用）
   * TODO: 对接真实后端接口
   */
  async updateProjectTeachGoal(courseId: string, data: ProjectTeachGoalData): Promise<ApiResponse<ProjectTeachGoalData>> {
    console.log(`[ProjectTeachGoalApi] updateProjectTeachGoal courseId: ${courseId}`, data)
    return { data, error: null, status: 200 }
  }
}
