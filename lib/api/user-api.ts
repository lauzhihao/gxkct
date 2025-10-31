import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface User {
  id: string
  name: string
  role: "teacher" | "student" | "admin"
  email: string
  avatar?: string
}

export class UserApi {
  private storage = new StorageAdapter()

  async getUsers(nodeId: string): Promise<ApiResponse<User[]>> {
    return this.storage.get<User[]>(`users-${nodeId}`)
  }

  async addUser(nodeId: string, user: User): Promise<ApiResponse<User>> {
    const response = await this.getUsers(nodeId)
    const users = response.data || []
    users.push(user)
    await this.storage.set(`users-${nodeId}`, users)
    return { data: user, error: null, status: 200 }
  }

  async updateUser(nodeId: string, userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
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

  async deleteUser(nodeId: string, userId: string): Promise<ApiResponse<boolean>> {
    const response = await this.getUsers(nodeId)
    if (response.error || !response.data) {
      return { data: null, error: response.error, status: response.status }
    }

    const users = response.data.filter((u) => u.id !== userId)
    await this.storage.set(`users-${nodeId}`, users)
    return { data: true, error: null, status: 200 }
  }

  async updateUsers(nodeId: string, users: any[]): Promise<ApiResponse<any[]>> {
    try {
      await this.storage.set(`users-${nodeId}`, users)
      return { data: users, error: null, status: 200 }
    } catch (error) {
      return { data: null, error: String(error), status: 500 }
    }
  }
}
