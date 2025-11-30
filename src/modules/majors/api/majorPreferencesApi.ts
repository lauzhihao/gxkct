import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const majorPreferencesApi = {
  getShowMyCourses(): Promise<ApiResponse<boolean>> {
    return api.preferences.getPreference("showMyCourses_global")
  },
  setShowMyCourses(value: boolean): Promise<ApiResponse<boolean>> {
    return api.preferences.setPreference("showMyCourses_global", value)
  },
}
