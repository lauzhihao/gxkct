import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"
import { HttpAdapter } from "./http-adapter"
import { setStoredAuthToken, setStoredAuthUser, type AuthResponse } from "./auth-config"

interface CurrentDepartmentResponse {
  permissionId?: number
  current?: {
    permissionId?: number
  }
  manage?: {
    permissionId?: number
  }
  college?: {
    id?: number
  }
}

export interface User {
  id: string
  name: string
  role: "teacher" | "student" | "admin"
  email: string
  avatar?: string
}

export interface InsertNewUserPayload {
  id: number
  collegeId: number
  permissionId: number
  relativeId: number
  userName: string
  email: string
}

export interface InsertNewUserResult {
  id: number
  collegeId: number
  permissionId: number
  relativeId: number
  userName: string
  email: string
  password?: string
}

export interface UpdateManagedUserPayload {
  id: number
  account: string
  name: string
  auth: number
  relative: string
  status: boolean
}

export interface UpdateManagedUserResult {
  id: number
  account: string
  name: string
  auth: number
  relative: string
  status: boolean
}

export interface ResetPasswordPayload {
  id: number
  password: string
}

export interface ResetPasswordResult {
  success?: boolean
}

export interface DeleteManagedUserPayload {
  id: number
}

export interface DeleteManagedUserResult {
  success?: boolean
}

export interface UpdateManagedUserStatusPayload {
  id: number
  status: boolean
}

export interface UpdateManagedUserStatusResult {
  id: number
  status: boolean
}

export class UserApi {
  private storage = new StorageAdapter()
  private httpAdapter = new HttpAdapter()

  /**
   * 用户登录
   * @param email 邮箱
   * @param password 密码
   * @param lang 语言代码，默认80101
   */
  async login(email: string, password: string, lang: number = 80101): Promise<ApiResponse<AuthResponse | null>> {
    try {
      const response = await this.httpAdapter.post<AuthResponse>('/api/user/login', {
        email,
        password,
        lang,
      })

      if (response.error || !response.data) {
        return response
      }

      // 先保存 token，确保后续接口请求携带 authToken
      setStoredAuthToken(response.data.authToken)

      let resolvedUser = response.data.user
      const currentDepartmentResponse = await this.httpAdapter.get<CurrentDepartmentResponse>(
        `/api/manage/getcurrentdepartment?collegeId=${response.data.user.collegeId}&userId=${response.data.user.id}`
      )

      const resolvedCollegeId = currentDepartmentResponse.data?.college?.id
      const resolvedPermissionId =
        currentDepartmentResponse.data?.permissionId ??
        currentDepartmentResponse.data?.current?.permissionId ??
        currentDepartmentResponse.data?.manage?.permissionId
      if (typeof resolvedCollegeId === "number") {
        resolvedUser = {
          ...response.data.user,
          collegeId: resolvedCollegeId,
        }
      }

      if (typeof resolvedPermissionId === "number") {
        resolvedUser = {
          ...resolvedUser,
          permissionId: resolvedPermissionId,
        }
      }

      // 保存用户信息到localStorage
      setStoredAuthUser(resolvedUser)

      response.data = {
        ...response.data,
        user: resolvedUser,
      }

      console.log(`[UserApi] 登录成功，用户: ${response.data.user.userName}`)
      return response
    } catch (error) {
      console.error('[UserApi] 登录失败:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : '登录失败',
        status: 500,
      }
    }
  }

  async getUsers(nodeId: string): Promise<ApiResponse<User[] | null>> {
    return this.storage.get<User[]>(`users-${nodeId}`)
  }

  async addUser(nodeId: string, user: User): Promise<ApiResponse<User | null>> {
    const response = await this.getUsers(nodeId)
    const users = response.data || []
    users.push(user)
    await this.storage.set(`users-${nodeId}`, users)
    return { data: user, error: null, status: 200 }
  }

  async updateUser(nodeId: string, userId: string, updates: Partial<User>): Promise<ApiResponse<User | null>> {
    const response = await this.getUsers(nodeId)
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const users = response.data.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    await this.storage.set(`users-${nodeId}`, users)

    const updatedUser = users.find((u) => u.id === userId)
    if (!updatedUser) {
      return { data: null, error: "User not found", status: 404 }
    }
    return { data: updatedUser, error: null, status: 200 }
  }

  async deleteUser(nodeId: string, userId: string): Promise<ApiResponse<boolean | null>> {
    const response = await this.getUsers(nodeId)
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const users = response.data.filter((u) => u.id !== userId)
    await this.storage.set(`users-${nodeId}`, users)
    return { data: true, error: null, status: 200 }
  }

  async updateUsers(nodeId: string, users: any[]): Promise<ApiResponse<any[] | null>> {
    try {
      await this.storage.set(`users-${nodeId}`, users)
      return { data: users, error: null, status: 200 }
    } catch (error) {
      return { data: null, error: String(error), status: 500 }
    }
  }

  async insertNewUser(payload: InsertNewUserPayload[]): Promise<ApiResponse<InsertNewUserResult[] | null>> {
    return this.httpAdapter.post<InsertNewUserResult[]>("/api/manage/insertNewUser", payload)
  }

  async updateManagedUser(payload: UpdateManagedUserPayload): Promise<ApiResponse<UpdateManagedUserResult | null>> {
    return this.httpAdapter.post<UpdateManagedUserResult>("/api/v3/manage/updateUser", payload)
  }

  async resetPassword(payload: ResetPasswordPayload): Promise<ApiResponse<ResetPasswordResult | null>> {
    return this.httpAdapter.post<ResetPasswordResult>("/api/manage/resetpassword", payload)
  }

  async deleteManagedUser(payload: DeleteManagedUserPayload): Promise<ApiResponse<DeleteManagedUserResult | null>> {
    return this.httpAdapter.post<DeleteManagedUserResult>("/api/manage/deleteuser", payload)
  }

  async updateManagedUserStatus(
    payload: UpdateManagedUserStatusPayload
  ): Promise<ApiResponse<UpdateManagedUserStatusResult | null>> {
    return this.httpAdapter.put<UpdateManagedUserStatusResult>(
      `/api/v5/manage/user/${payload.id}/status/${payload.status}`
    )
  }
}
