import type { ApiResponse } from "./types"
import { StorageAdapter } from "./storage-adapter"

export interface CourseGoal {
  id: number
  description: string
  children: CourseGoal[] | null
}

export interface CourseGoalsData {
  data: CourseGoal[]
}

export class CourseGoalsApi {
  private storage = new StorageAdapter()

  /**
   * 获取课程目标数据
   * @param courseId 课程ID
   * @param majorId 专业ID
   */
  async getCourseGoals(courseId: string, majorId: string): Promise<ApiResponse<CourseGoal[] | null>> {
    try {
      console.log(`[CourseGoalsApi] 获取课程目标，courseId: ${courseId}, majorId: ${majorId}`)

      const response = await this.storage.getFromApi<CourseGoal[]>(
        `/api/course/getcoursegoal?courseId=${courseId}&majorId=${majorId}`
      )

      if (response.error || !response.data) {
        console.error("[CourseGoalsApi] 获取课程目标API失败:", response.error)
        return {
          data: null,
          error: response.error || "获取课程目标失败",
          status: response.status,
        }
      }

      console.log("[CourseGoalsApi] 课程目标数据加载成功", response.data.length)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseGoalsApi] 获取课程目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 更新课程目标数据
   * @param courseId 课程ID
   * @param majorId 专业ID
   * @param goals 课程目标数据
   */
  async updateCourseGoals(courseId: string, majorId: string, goals: CourseGoal[]): Promise<ApiResponse<CourseGoal[] | null>> {
    try {
      console.log(`[CourseGoalsApi] 更新课程目标，courseId: ${courseId}, majorId: ${majorId}`)

      // 保存到本地存储
      await this.storage.set(`courseGoals-${courseId}-${majorId}`, goals)

      console.log("[CourseGoalsApi] 课程目标数据保存成功", goals)

      return {
        data: goals,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseGoalsApi] 更新课程目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }
}

