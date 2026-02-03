import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse, createSuccessResponse, createErrorResponse } from "./response-handler"
import { HttpAdapter } from "./http-adapter"

export class StorageAdapter {
  private prefix = "education-api-"
  private httpAdapter = new HttpAdapter()

  async get<T>(key: string): Promise<ApiResponse<T | null>> {
    try {
      const fullKey = this.prefix + key
      const data = localStorage.getItem(fullKey)

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

  // 通过HTTP调用远程API
  async getFromApi<T>(endpoint: string): Promise<ApiResponse<T | null>> {
    return this.httpAdapter.get<T>(endpoint)
  }

  // 通过HTTP调用远程API POST
  async postToApi<T>(endpoint: string, data?: any): Promise<ApiResponse<T | null>> {
    return this.httpAdapter.post<T>(endpoint, data)
  }

  // 通过HTTP调用远程API PUT
  async putToApi<T>(endpoint: string, data?: any): Promise<ApiResponse<T | null>> {
    return this.httpAdapter.put<T>(endpoint, data)
  }

  // 通过HTTP调用远程API DELETE
  async deleteFromApi<T>(endpoint: string): Promise<ApiResponse<T | null>> {
    return this.httpAdapter.delete<T>(endpoint)
  }

  async set<T>(key: string, value: T): Promise<ApiResponse<T | null>> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
      const backendResponse = createSuccessResponse(value)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      const backendResponse = createErrorResponse(String(error), "500")
      return handleBackendResponse(backendResponse)
    }
  }

  async delete(key: string): Promise<ApiResponse<boolean | null>> {
    try {
      localStorage.removeItem(this.prefix + key)
      const backendResponse = createSuccessResponse(true)
      return handleBackendResponse(backendResponse)
    } catch (error) {
      const backendResponse = createErrorResponse(String(error), "500")
      return handleBackendResponse(backendResponse)
    }
  }

  async getAll<T>(pattern: string): Promise<ApiResponse<T[] | null>> {
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
