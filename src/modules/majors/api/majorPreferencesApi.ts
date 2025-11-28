import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const majorPreferencesApi = {
  getShowMyCourses(majorId: string): Promise<ApiResponse<boolean>> {
    return api.preferences.getPreference(`showMyCourses_${majorId}`)
  },
  setShowMyCourses(majorId: string, value: boolean): Promise<ApiResponse<boolean>> {
    return api.preferences.setPreference(`showMyCourses_${majorId}`, value)
  },
}
