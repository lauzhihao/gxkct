import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const departmentPreferencesApi = {
  getShowMyMajors(): Promise<ApiResponse<boolean>> {
    return api.preferences.getPreference("showMyMajors_global")
  },
  setShowMyMajors(value: boolean): Promise<ApiResponse<boolean>> {
    return api.preferences.setPreference("showMyMajors_global", value)
  },
}

