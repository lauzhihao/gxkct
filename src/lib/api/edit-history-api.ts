import type { ApiResponse } from "./types"
import { StorageAdapter } from "./storage-adapter"
import { buildApiUrl } from "./config"
import { getStoredAuthToken } from "./auth-config"

/**
 * Course edit history list item.
 * Backend: com.college.course.application.model.v4.support.history.EditHistoryList
 */
export interface EditHistoryListItem {
  editor: string
  type: string
  detail: string
  time: string
  // more=true 表示该记录可下钻查看字段级前后对比详情
  more: boolean
}

/**
 * Field-level detail for one edit record.
 * Backend: com.college.course.application.model.v4.support.history.EditHistoryDetail
 */
export interface EditHistoryDetailItem {
  editor: string
  type: string
  time: string
  // 每项形如 "课程名称: 旧值 修改为: 新值;"
  detail: string[]
}

export class EditHistoryApi {
  private storage = new StorageAdapter()

  /**
   * 获取课程修改记录列表
   * @param courseId 课程ID
   */
  async getCourseHistory(courseId: number): Promise<ApiResponse<EditHistoryListItem[] | null>> {
    try {
      const response = await this.storage.getFromApi<EditHistoryListItem[]>(
        `/api/v4/edithistory/coursehistory?id=${courseId}`
      )
      if (response.error) {
        console.error("[EditHistoryApi] getCourseHistory failed:", response.error)
        return { data: null, error: response.error, status: response.status }
      }
      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error("[EditHistoryApi] getCourseHistory failed:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 获取某条修改记录的字段级详情（前后对比）
   * @param courseId 课程ID
   * @param data 列表项（后端据此定位具体记录）
   */
  async getHistoryDetail(
    courseId: number,
    data: EditHistoryListItem
  ): Promise<ApiResponse<EditHistoryDetailItem[] | null>> {
    try {
      const response = await this.storage.postToApi<EditHistoryDetailItem[]>(
        "/api/v4/edithistory/historydetail",
        { courseId, data }
      )
      if (response.error) {
        console.error("[EditHistoryApi] getHistoryDetail failed:", response.error)
        return { data: null, error: response.error, status: response.status }
      }
      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error("[EditHistoryApi] getHistoryDetail failed:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 导出课程修改记录为 Word 文档。
   * 直接返回原始 Response，以便调用方读取 content-disposition 与文件流。
   * @param courseId 课程ID
   */
  async exportCourseHistory(courseId: number): Promise<Response> {
    const headers: Record<string, string> = {}
    const authToken = getStoredAuthToken()
    if (authToken) {
      headers.authToken = authToken
    }
    const response = await fetch(buildApiUrl(`/api/v4/edithistory/exportcourse?courseid=${courseId}`), {
      method: "GET",
      headers,
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    return response
  }
}
