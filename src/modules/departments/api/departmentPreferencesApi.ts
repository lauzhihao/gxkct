import { api } from "@/lib/api"
import type { ApiResponse } from "@/lib/api/types"

export const departmentPreferencesApi = {
  getShowMyMajors(): Promise<ApiResponse<boolean>> {
    return api.preferences.getPreference("showMyMajors_global").then((response) => ({
      ...response,
      data: response.data ? Boolean(response.data.value) : false,
    }))
  },
  setShowMyMajors(value: boolean): Promise<ApiResponse<boolean>> {
    return api.preferences.setPreference("showMyMajors_global", { value }).then((response) => ({
      ...response,
      data: response.data ? Boolean(response.data.value) : false,
    }))
  },
}

