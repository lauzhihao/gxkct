import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse } from "./response-handler"
import { buildApiUrl, getApiConfig } from "./config"
import { getStoredAuthToken } from "./auth-config"

export class HttpAdapter {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    const authToken = getStoredAuthToken()
    if (authToken) {
      headers['authToken'] = authToken
    }

    return headers
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] GET ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backendResponse: BackendResponse<T> = await response.json()
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error(`[HttpAdapter] 请求失败:`, error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '请求失败',
        status: 500,
      }
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] POST ${url}`, data)

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backendResponse: BackendResponse<T> = await response.json()
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error(`[HttpAdapter] 请求失败:`, error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '请求失败',
        status: 500,
      }
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] PUT ${url}`, data)

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backendResponse: BackendResponse<T> = await response.json()
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error(`[HttpAdapter] 请求失败:`, error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '请求失败',
        status: 500,
      }
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] DELETE ${url}`)

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return {
          data: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
        }
      }

      const backendResponse: BackendResponse<T> = await response.json()
      return handleBackendResponse(backendResponse)
    } catch (error) {
      console.error(`[HttpAdapter] 请求失败:`, error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '请求失败',
        status: 500,
      }
    }
  }
}

