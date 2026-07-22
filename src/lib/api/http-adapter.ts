import type { ApiResponse, BackendResponse } from "./types"
import { handleBackendResponse } from "./response-handler"
import { buildApiUrl, getApiConfig } from "./config"
import { getStoredAuthToken } from "./auth-config"
import { clearAllAuthData } from "./auth-config"

export interface BinaryDownload {
  blob: Blob
  fileName: string
}

const BINARY_DOWNLOAD_TIMEOUT_MS = 600_000

export class HttpAdapter {
  private forceLogoutOnUnauthorized(): void {
    if (typeof window === "undefined") return
    clearAllAuthData()
    if (window.location.pathname !== "/login") {
      window.location.href = "/login"
    }
  }

  private async handleHttpError<T>(response: Response): Promise<ApiResponse<T | null>> {
    let rawBody: Partial<BackendResponse<T>> | null = null

    try {
      rawBody = (await response.json()) as Partial<BackendResponse<T>>
    } catch {
      // ignore JSON parse failure and use fallback error below
    }

    if (response.status === 401) {
      this.forceLogoutOnUnauthorized()
      return {
        data: null,
        error: rawBody?.message || `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
      }
    }

    if (rawBody && typeof rawBody.code === "string") {
      return handleBackendResponse(rawBody as BackendResponse<T>)
    }

    return {
      data: null,
      error: `HTTP ${response.status}: ${response.statusText}`,
      status: response.status,
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }

    const authToken = getStoredAuthToken()
    if (authToken) {
      headers['authToken'] = authToken
    }

    return headers
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T | null>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] GET ${url}`)

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return this.handleHttpError<T>(response)
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

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T | null>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] POST ${url}`, data)

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return this.handleHttpError<T>(response)
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

  async postBinary(endpoint: string, data: unknown): Promise<ApiResponse<BinaryDownload | null>> {
    try {
      const url = buildApiUrl(endpoint)

      console.log(`[HttpAdapter] POST binary ${url}`)

      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
        cache: 'no-store',
        signal: AbortSignal.timeout(BINARY_DOWNLOAD_TIMEOUT_MS),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] Binary response failed: ${response.status}`)
        return this.handleHttpError<BinaryDownload>(response)
      }

      const contentType = response.headers.get('Content-Type')
      if (contentType === null || contentType.split(';')[0].trim().toLowerCase() !== 'application/zip') {
        throw new Error('批量下载响应类型无效')
      }

      const disposition = response.headers.get('Content-Disposition')
      if (disposition === null) {
        throw new Error('批量下载响应缺少文件名')
      }
      const fileNameMatch = /^attachment;\s*filename="([A-Za-z0-9._-]+)"$/i.exec(disposition)
      if (fileNameMatch === null) {
        throw new Error('批量下载响应文件名无效')
      }
      const fileName = fileNameMatch[1]
      if (!fileName.toLowerCase().endsWith('.zip')) {
        throw new Error('批量下载响应文件扩展名无效')
      }

      const blob = await response.blob()
      if (blob.size <= 0) {
        throw new Error('批量下载响应为空')
      }

      return {
        data: { blob, fileName },
        error: null,
        status: response.status,
      }
    } catch (error) {
      console.error('[HttpAdapter] Binary request failed:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '批量下载失败',
        status: 500,
      }
    }
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T | null>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] PATCH ${url}`, data)

      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return this.handleHttpError<T>(response)
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

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T | null>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] PUT ${url}`, data)

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return this.handleHttpError<T>(response)
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

  async delete<T>(endpoint: string): Promise<ApiResponse<T | null>> {
    try {
      const url = buildApiUrl(endpoint)
      const config = getApiConfig()

      console.log(`[HttpAdapter] DELETE ${url}`)

      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getHeaders(),
        cache: 'no-store',
        signal: AbortSignal.timeout(config.timeout),
      })

      if (!response.ok) {
        console.error(`[HttpAdapter] HTTP错误: ${response.status}`)
        return this.handleHttpError<T>(response)
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
