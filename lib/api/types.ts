// 后端接口返回的原始数据结构
export interface BackendResponse<T = any> {
  code: string
  message: string
  data: T
  success?: boolean
}

// 内部使用的API响应结构
export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: number
}

export interface ApiConfig {
  useLocalStorage: boolean
  baseUrl?: string
}
