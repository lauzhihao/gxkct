import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"
import type { UserPreference } from "@/lib/api/preference-api"

function extractBooleanValue(preference: UserPreference | null): boolean {
  // 从 UserPreference 对象中提取 boolean 值
  // UserPreference 结构为 { [key: string]: any }，取第一个值作为 boolean
  if (!preference) return false
  const firstValue = Object.values(preference)[0]
  return Boolean(firstValue)
}

export const majorPreferencesApi = {
  async getShowMyCourses(): Promise<ApiResponse<boolean>> {
    const response = await api.preferences.getPreference("showMyCourses_global")
    if (response.error || !response.data) {
      return { data: false, error: response.error, status: response.status }
    }
    return { data: extractBooleanValue(response.data), error: null, status: 200 }
  },
  async setShowMyCourses(value: boolean): Promise<ApiResponse<boolean>> {
    const response = await api.preferences.setPreference("showMyCourses_global", value)
    if (response.error || !response.data) {
      return { data: false, error: response.error, status: response.status }
    }
    return { data: true, error: null, status: 200 }
  },
}
