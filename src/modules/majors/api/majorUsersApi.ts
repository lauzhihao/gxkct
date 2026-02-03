import { api } from "@/lib/api"
import type { MajorUserRecord } from "@/modules/majors/hooks/use-major-users"
import type { ApiResponse } from "@/lib/api/types"
import type { User } from "@/lib/api/user-api"

function convertToMajorUserRecord(users: User[]): MajorUserRecord[] {
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role, // User.role 是 "teacher" | "student" | "admin"
    enabled: true, // 默认启用
  }))
}

export const majorUsersApi = {
  async getUsers(majorId: string): Promise<ApiResponse<MajorUserRecord[]>> {
    const response = await api.users.getUsers(majorId)
    if (response.error || !response.data) {
      return { data: [], error: response.error, status: response.status }
    }
    return { data: convertToMajorUserRecord(response.data), error: null, status: 200 }
  },
  async updateUsers(majorId: string, users: MajorUserRecord[]): Promise<ApiResponse<MajorUserRecord[]>> {
    // 将 MajorUserRecord 转换为 User 格式再调用底层 API
    const userData = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role as "teacher" | "student" | "admin",
    }))
    const response = await api.users.updateUsers(majorId, userData)
    if (response.error || !response.data) {
      return { data: users, error: response.error, status: response.status }
    }
    return { data: users, error: null, status: 200 }
  },
}
