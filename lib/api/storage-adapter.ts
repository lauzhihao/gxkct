import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse, createSuccessResponse, createErrorResponse } from "./response-handler"

export class StorageAdapter {
  private prefix = "education-api-"

  async get<T>(key: string): Promise<ApiResponse<T>> {
    try {
      const fullKey = this.prefix + key
      console.log("[v0] StorageAdapter.get() 查找键:", fullKey)
      const data = localStorage.getItem(fullKey)
      console.log("[v0] StorageAdapter.get() 找到的数据:", data ? `${data.substring(0, 100)}...` : "null")

      if (!data) {
        const backendResponse = createErrorResponse("数据未找到", "404")
        // 数据未找到是正常情况，不显示错误提示
        return handleBackendResponse(backendResponse, false)
      }

      const parsedData = JSON.parse(data)
      const backendResponse = createSuccessResponse(parsedData)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error("[v0] StorageAdapter.get() 错误:", error)
      const backendResponse = createErrorResponse(String(error), "500")
      // 解析错误需要显示提示
      return handleBackendResponse(backendResponse, true)
    }
  }

  async set<T>(key: string, value: T): Promise<ApiResponse<T>> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
      const backendResponse = createSuccessResponse(value)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      const backendResponse = createErrorResponse(String(error), "500")
      return handleBackendResponse(backendResponse)
    }
  }

  async delete(key: string): Promise<ApiResponse<boolean>> {
    try {
      localStorage.removeItem(this.prefix + key)
      const backendResponse = createSuccessResponse(true)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      const backendResponse = createErrorResponse(String(error), "500")
      return handleBackendResponse(backendResponse)
    }
  }

  async getAll<T>(pattern: string): Promise<ApiResponse<T[]>> {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(this.prefix + pattern))
      const items = keys
        .map((k) => {
          const data = localStorage.getItem(k)
          return data ? JSON.parse(data) : null
        })
        .filter(Boolean)
      const backendResponse = createSuccessResponse(items)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error("[v0] StorageAdapter.getAll() 错误:", error)
      const backendResponse = createErrorResponse(String(error), "500")
      return handleBackendResponse(backendResponse)
    }
  }
}
