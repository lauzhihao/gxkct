import type { ApiResponse } from "./types"

export class StorageAdapter {
  private prefix = "education-api-"

  async get<T>(key: string): Promise<ApiResponse<T>> {
    try {
      const fullKey = this.prefix + key
      console.log("[v0] StorageAdapter.get() 查找键:", fullKey)
      const data = localStorage.getItem(fullKey)
      console.log("[v0] StorageAdapter.get() 找到的数据:", data ? `${data.substring(0, 100)}...` : "null")
      if (!data) {
        return { data: null, error: "Not found", status: 404 }
      }
      return { data: JSON.parse(data), error: null, status: 200 }
    } catch (error) {
      console.error("[v0] StorageAdapter.get() 错误:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  async set<T>(key: string, value: T): Promise<ApiResponse<T>> {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
      return { data: value, error: null, status: 200 }
    } catch (error) {
      return { data: null, error: String(error), status: 500 }
    }
  }

  async delete(key: string): Promise<ApiResponse<boolean>> {
    try {
      localStorage.removeItem(this.prefix + key)
      return { data: true, error: null, status: 200 }
    } catch (error) {
      return { data: null, error: String(error), status: 500 }
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
      return { data: items, error: null, status: 200 }
    } catch (error) {
      console.error("[v0] StorageAdapter.getAll() 错误:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }
}
