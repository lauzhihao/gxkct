import { buildApiUrl } from "./config"
import { getStoredAuthToken } from "./auth-config"
import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse, BackendResponse } from "./types"

export interface DownloadTemplateData {
  blob: Blob
  filename: string
  mimeType: string
}

export interface ResolvedCoursePoint {
  id: number
  title: string
  description: string
}

function buildAuthHeaders(): Headers {
  const headers = new Headers()
  const authToken = getStoredAuthToken()
  if (authToken && authToken.trim() !== "") {
    headers.set("authToken", authToken)
  }
  return headers
}

function parseContentDispositionFilename(contentDisposition: string | null, fallbackFilename: string): string {
  if (!contentDisposition) {
    return fallbackFilename
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    return decodeURIComponent(utf8Match[1])
  }

  const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (normalMatch && normalMatch[1]) {
    return normalMatch[1]
  }

  return fallbackFilename
}

function isSuccessCode(code: string | number | undefined): boolean {
  return code === "0" || code === 0
}

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
  private storage: StorageAdapter

  constructor(storage: StorageAdapter) {
    this.storage = storage
  }

  /**
   * 获取课点列表
   * @param majorId 专业ID
   * @param courseId 课程ID
   */
  async getCoursePoints(majorId: number, courseId: number): Promise<ApiResponse<CoursePoint[] | null>> {
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
    majorId: number,
    courseId: number,
    points: Array<{ id: number; title: string; description: string }>,
    upload = false
  ): Promise<ApiResponse<any>> {
    try {
      console.log(`[CoursePointsApi] 批量保存课点，majorId: ${majorId}, courseId: ${courseId}, 数量: ${points.length}`)

      const response = await this.storage.postToApi<any>(
        `/api/major/v2.0/savepoints`,
        {
          majorId,
          courseId,
          points,
          upload,
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
  ): Promise<ApiResponse<CoursePoint | null>> {
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
   * 更新课点（通过 savepoints 批量接口，发送单条正 ID 实现更新）
   * @param majorId 专业ID
   * @param courseId 课程ID
   * @param coursePointId 课点ID
   * @param data 更新数据
   */
  async updateCoursePoint(
    majorId: number,
    courseId: number,
    coursePointId: number,
    data: Partial<CoursePoint>
  ): Promise<ApiResponse<CoursePoint | null>> {
    try {
      console.log(`[CoursePointsApi] 更新课点，coursePointId: ${coursePointId}`)

      const response = await this.saveCoursePoints(majorId, courseId, [
        { id: coursePointId, title: data.title || "", description: data.description || "" },
      ])

      if (response.error) {
        console.error("[CoursePointsApi] 更新课点失败:", response.error)
        return { data: null, error: response.error, status: response.status }
      }

      console.log("[CoursePointsApi] 课点更新成功")
      return { data: null, error: null, status: 200 }
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
   * 删除课点（通过 savepoints 批量接口，发送负 ID 实现删除）
   * @param majorId 专业ID
   * @param courseId 课程ID
   * @param coursePointId 课点ID（正数，内部会取反）
   */
  async deleteCoursePoint(
    majorId: number,
    courseId: number,
    coursePointId: number
  ): Promise<ApiResponse<void>> {
    try {
      console.log(`[CoursePointsApi] 删除课点，coursePointId: ${coursePointId}`)

      // 后端约定：负 ID 表示删除
      const response = await this.saveCoursePoints(majorId, courseId, [
        { id: -Math.abs(coursePointId), title: "", description: "" },
      ])

      if (response.error) {
        console.error("[CoursePointsApi] 删除课点失败:", response.error)
        return { data: null, error: response.error, status: response.status }
      }

      console.log("[CoursePointsApi] 课点删除成功")
      return { data: null, error: null, status: 200 }
    } catch (error) {
      console.error("[CoursePointsApi] 删除课点异常:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : "删除课点异常",
        status: 500,
      }
    }
  }

  async downloadPointTemplate(lang: string | number): Promise<ApiResponse<DownloadTemplateData | null>> {
    try {
      const url = buildApiUrl(`/api/major/v2.0/download/point?lang=${encodeURIComponent(String(lang))}`)
      const response = await fetch(url, {
        method: "POST",
        headers: buildAuthHeaders(),
      })

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const contentType = response.headers.get("content-type")
      const blob = await response.blob()
      const filename = parseContentDispositionFilename(
        response.headers.get("content-disposition"),
        "课点信息点模板.xlsx"
      )

      return {
        data: {
          blob,
          filename,
          mimeType:
            contentType && contentType.trim() !== ""
              ? contentType
              : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "下载课点模板失败",
        status: 500,
      }
    }
  }

  async resolveCoursePoints(
    majorId: number,
    courseId: number,
    file: File
  ): Promise<ApiResponse<ResolvedCoursePoint[] | null>> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(
        buildApiUrl(`/api/major/v2.0/resolvepoint?majorid=${encodeURIComponent(majorId)}&courseid=${encodeURIComponent(courseId)}`),
        {
          method: "POST",
          headers: buildAuthHeaders(),
          body: formData,
        }
      )

      if (!response.ok) {
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backend = (await response.json()) as BackendResponse<ResolvedCoursePoint[] | { points?: ResolvedCoursePoint[] }>
      if (!isSuccessCode(backend.code)) {
        return {
          data: null,
          error: backend.message,
          status: response.status,
        }
      }

      const resolvedData = backend.data
      const normalizedPoints = Array.isArray(resolvedData)
        ? resolvedData
        : Array.isArray(resolvedData?.points)
          ? resolvedData.points
          : null

      if (normalizedPoints === null) {
        return {
          data: null,
          error: "课点导入结果格式错误",
          status: response.status,
        }
      }

      return {
        data: normalizedPoints,
        error: null,
        status: response.status,
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : "导入课点模板失败",
        status: 500,
      }
    }
  }
}
