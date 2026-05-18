import { HttpAdapter } from "./http-adapter"
import type { ApiResponse } from "./types"

/**
 * 提交反馈的请求体
 * - description: 富文本 HTML，内嵌图片以 OSS URL 形式呈现（由 RichTextEditor 上传后嵌入）
 */
export interface SubmitFeedbackPayload {
  unique: string
  departmentId?: number | null
  majorId?: number | null
  courseId?: number | null
  feedbackType: "system_error" | "optimization"
  description: string
}

/**
 * 反馈管理（用户提交问题反馈/优化建议）
 * 对应后端 MessageController
 */
export class MessageApi {
  private http = new HttpAdapter()

  /** POST /api/message/feedback */
  submitFeedback(payload: SubmitFeedbackPayload): Promise<ApiResponse<null>> {
    return this.http.post<null>("/api/message/feedback", payload)
  }
}

export const messageApi = new MessageApi()
