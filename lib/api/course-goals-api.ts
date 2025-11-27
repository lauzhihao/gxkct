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
  async getCourseGoals(courseId: string, majorId: string): Promise<ApiResponse<CourseGoal[]>> {
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

      console.log("[CourseGoalsApi] 课程目标数据加载成功", response.data)

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
}

