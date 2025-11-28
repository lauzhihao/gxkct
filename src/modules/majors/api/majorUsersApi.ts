import { api } from "@/lib/api"
import type { MajorUserRecord } from "@/modules/majors/hooks/use-major-users"
import type { ApiResponse } from "@/lib/api/types"

export const majorUsersApi = {
  getUsers(majorId: string): Promise<ApiResponse<MajorUserRecord[]>> {
    return api.users.getUsers(majorId)
  },
  updateUsers(majorId: string, users: MajorUserRecord[]): Promise<ApiResponse<MajorUserRecord[]>> {
    return api.users.updateUsers(majorId, users)
  },
}
