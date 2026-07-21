import { HttpAdapter } from "./http-adapter"
import type { ApiResponse } from "./types"

/**
 * 画布上传签名请求参数
 */
export interface CanvasPresignRequest {
  fileName: string
  mimeType?: string
  size: number
}

/**
 * 画布上传签名响应
 */
export interface CanvasPresignResponse {
  uploadUrl: string
  /** OSS 文件路径（用于画布上传） */
  uploadPath?: string
  /** 上传请求头（用于画布上传） */
  uploadHeaders?: Record<string, string>
  /** OSS 文件键名（用于文件上传） */
  ossKey?: string
  /** 上传请求头（用于文件上传） */
  headers?: Record<string, string>
  /** 签名过期时间（秒） */
  expiresIn?: number
}

/**
 * 画布内容数据结构
 */
export interface CanvasContentData {
  version: string
  sessionId: string
  timestamp: number
  elements: unknown[]
  edges: unknown[]
  specialComponents?: Record<string, unknown>
  // 选中的节点ID列表（支持多选）
  selectedIds?: string[]
}

/**
 * 画布 API
 * 处理画布内容的阿里云 OSS 上传
 */
export class CanvasApi {
  private http = new HttpAdapter()

  /**
   * 获取画布内容上传预签名 URL
   * GET /api/oss/presign?fileName=xxx&mimeType=application/json&size=xxx
   */
  getPresignUrl(payload: CanvasPresignRequest): Promise<ApiResponse<CanvasPresignResponse | null>> {
    const params = new URLSearchParams({
      fileName: payload.fileName,
      mimeType: payload.mimeType || "application/json",
      size: String(payload.size),
    })
    return this.http.get<CanvasPresignResponse>(`/api/oss/presign?${params.toString()}`)
  }

  /**
   * 直接上传 JSON 内容到阿里云 OSS
   * @param uploadUrl 预签名上传地址
   * @param content 画布内容 JSON
   * @param headers 上传请求头
   */
  async uploadToOss(
    uploadUrl: string,
    content: CanvasContentData,
    headers?: Record<string, string>
  ): Promise<boolean> {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify(content),
      })

      return response.ok
    } catch (error) {
      console.error("上传画布内容到 OSS 失败:", error)
      return false
    }
  }
}

// 导出单例
export const canvasApi = new CanvasApi()
