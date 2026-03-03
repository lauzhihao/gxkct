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

  private toNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }

    if (typeof value === "string") {
      const parsed = Number.parseInt(value, 10)
      if (Number.isFinite(parsed)) {
        return parsed
      }
    }

    return null
  }

  private buildUpdatePayload(courseId: string, goals: CourseGoal[]): Array<{
    id: number
    parentId: number
    courseId: number
    description: string
  }> {
    const numericCourseId = this.toNumber(courseId)
    if (numericCourseId === null) {
      return []
    }

    const payload: Array<{
      id: number
      parentId: number
      courseId: number
      description: string
    }> = []

    goals.forEach((goal) => {
      const parentId = this.toNumber(goal.id)
      if (parentId === null || !Array.isArray(goal.children)) {
        return
      }

      goal.children.forEach((child) => {
        const description = String(child?.description ?? "").trim()
        if (!description) {
          return
        }

        payload.push({
          id: this.toNumber(child?.id) ?? 0,
          parentId,
          courseId: numericCourseId,
          description,
        })
      })
    })

    return payload
  }

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

      const payload = this.buildUpdatePayload(courseId, goals)
      if (payload.length === 0) {
        return {
          data: goals,
          error: null,
          status: 200,
        }
      }

      const response = await this.storage.postToApi<CourseGoal[]>("/api/course/updateCourseGoals", payload)
      if (response.error) {
        console.error("[CourseGoalsApi] 更新课程目标API失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      console.log("[CourseGoalsApi] 课程目标API更新成功", payload.length)

      return {
        data: response.data ?? goals,
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

  /**
   * 删除单条教学目标
   * @param courseGoalId 教学目标ID
   */
  async deleteCourseGoal(courseGoalId: string): Promise<ApiResponse<boolean | null>> {
    try {
      console.log(`[CourseGoalsApi] 删除教学目标，courseGoalId: ${courseGoalId}`)

      const response = await this.storage.getFromApi<boolean>(`/api/course/deletecoursegoal?courseGoalId=${courseGoalId}`)
      if (response.error) {
        console.error("[CourseGoalsApi] 删除教学目标API失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      return {
        data: response.data ?? true,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseGoalsApi] 删除教学目标失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }
}
