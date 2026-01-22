import { ApiStorage } from "./storage"
import type { ApiResponse } from "./types"

export interface CoursePoint {
  id: number
  uniqueCode: string
  majorId: number
  courseUnitId: number
  title: string
  description: string
  relate: number
  createTime: string
  updateTime: string
  deleted: number
}

export class CoursePointsApi {
  private storage: ApiStorage

  constructor(storage: ApiStorage) {
    this.storage = storage
  }

  /**
   * 获取课点列表
   * @param majorId 专业ID
   * @param courseId 课程ID
   */
  async getCoursePoints(majorId: string, courseId: string): Promise<ApiResponse<CoursePoint[]>> {
    try {
      console.log(`[CoursePointsApi] 获取课点列表，majorId: ${majorId}, courseId: ${courseId}`)

      const response = await this.storage.getFromApi<CoursePoint[]>(
        `/api/major/v2.0/pointlist?majorid=${majorId}&courseid=${courseId}`
      )

      if (response.error || !response.data) {
        console.error("[CoursePointsApi] 获取课点列表API失败:", response.error)
        return {
          data: null,
          error: response.error || "获取课点列表失败",
          status: response.status,
        }
      }

      console.log("[CoursePointsApi] 课点列表加载成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CoursePointsApi] 获取课点列表异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "获取课点列表异常",
        status: 500,
      }
    }
  }

  /**
   * 批量保存课点
   * @param majorId 专业ID
   * @param courseId 课程ID
   * @param points 课点列表
   */
  async saveCoursePoints(
    majorId: string,
    courseId: string,
    points: Array<{ id: number; title: string; description: string }>
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`[CoursePointsApi] 批量保存课点，majorId: ${majorId}, courseId: ${courseId}, 数量: ${points.length}`)

      const response = await this.storage.postToApi<any>(
        `/api/major/v2.0/savepoints`,
        {
          majorId,
          courseId,
          points,
          upload: false,
        }
      )

      if (response.error) {
        console.error("[CoursePointsApi] 批量保存课点API失败:", response.error)
        return {
          data: null,
          error: response.error || "批量保存课点失败",
          status: response.status,
        }
      }

      console.log("[CoursePointsApi] 课点批量保存成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CoursePointsApi] 批量保存课点异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "批量保存课点异常",
        status: 500,
      }
    }
  }

  /**
   * 创建课点（单个）
   * @deprecated 请使用 saveCoursePoints 批量保存
   * @param data 课点数据
   */
  async createCoursePoint(
    data: Partial<CoursePoint>
  ): Promise<ApiResponse<CoursePoint>> {
    try {
      console.log(`[CoursePointsApi] 创建课点`)

      const response = await this.storage.postToApi<CoursePoint>(
        `/api/major/v2.0/addpoint`,
        data
      )

      if (response.error || !response.data) {
        console.error("[CoursePointsApi] 创建课点API失败:", response.error)
        return {
          data: null,
          error: response.error || "创建课点失败",
          status: response.status,
        }
      }

      console.log("[CoursePointsApi] 课点创建成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CoursePointsApi] 创建课点异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "创建课点异常",
        status: 500,
      }
    }
  }

  /**
   * 更新课点
   * @param coursePointId 课点ID
   * @param data 更新数据
   */
  async updateCoursePoint(
    coursePointId: number,
    data: Partial<CoursePoint>
  ): Promise<ApiResponse<CoursePoint>> {
    try {
      console.log(`[CoursePointsApi] 更新课点，coursePointId: ${coursePointId}`)

      // 模拟接口调用，1秒延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 返回成功响应
      const updatedData: CoursePoint = {
        id: coursePointId,
        uniqueCode: "",
        majorId: 0,
        courseUnitId: 0,
        title: data.title || "",
        description: data.description || "",
        relate: 0,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        deleted: 0,
      }

      console.log("[CoursePointsApi] 课点更新成功", updatedData)

      return {
        data: updatedData,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CoursePointsApi] 更新课点异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "更新课点异常",
        status: 500,
      }
    }
  }

  /**
   * 删除课点
   * @param coursePointId 课点ID
   */
  async deleteCoursePoint(coursePointId: number): Promise<ApiResponse<void>> {
    try {
      console.log(`[CoursePointsApi] 删除课点，coursePointId: ${coursePointId}`)

      // 模拟接口调用，1秒延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      console.log("[CoursePointsApi] 课点删除成功")

      return {
        data: null,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CoursePointsApi] 删除课点异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "删除课点异常",
        status: 500,
      }
    }
  }
}

