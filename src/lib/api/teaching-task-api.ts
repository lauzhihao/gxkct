import { HttpAdapter } from "./http-adapter"
import type { ApiResponse } from "./types"
import type { TeachingSupervisoryTask, Long } from "@/types"

type TeachingStatus = "not_started" | "in_progress" | "completed"

type CreateTeachingTaskPayload = Omit<TeachingSupervisoryTask, "id" | "createdAt" | "updatedAt">
type UpdateTeachingTaskPayload = Omit<TeachingSupervisoryTask, "createdAt">

type ListTaskParams = {
  status?: TeachingStatus
  includeArchived?: boolean
  includeCriteria?: boolean
}

export class TeachingTaskApi {
  private http = new HttpAdapter()

  private getBasePath(universityId: Long): string {
    return `/api/universities/${universityId}/teaching-supervisory-tasks`
  }

  private appendQuery(path: string, params?: ListTaskParams): string {
    if (!params) return path
    const query = new URLSearchParams()
    if (params.status) {
      query.set("status", params.status)
    }
    if (typeof params.includeArchived === "boolean") {
      query.set("includeArchived", String(params.includeArchived))
    }
    if (typeof params.includeCriteria === "boolean") {
      query.set("includeCriteria", String(params.includeCriteria))
    }
    const queryString = query.toString()
    return queryString ? `${path}?${queryString}` : path
  }

  async getTasks(
    universityId: Long,
    params?: ListTaskParams,
  ): Promise<ApiResponse<TeachingSupervisoryTask[] | null>> {
    const endpoint = this.appendQuery(this.getBasePath(universityId), params)
    return this.http.get<TeachingSupervisoryTask[]>(endpoint)
  }

  async getTask(
    universityId: Long,
    taskId: Long,
    params?: Pick<ListTaskParams, "includeCriteria">,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    let endpoint = `${this.getBasePath(universityId)}/${taskId}`
    if (params?.includeCriteria) {
      endpoint = `${endpoint}?includeCriteria=true`
    }
    return this.http.get<TeachingSupervisoryTask>(endpoint)
  }

  async createTask(
    universityId: Long,
    payload: CreateTeachingTaskPayload,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    return this.http.post<TeachingSupervisoryTask>(this.getBasePath(universityId), payload)
  }

  async updateTask(
    universityId: Long,
    taskId: Long,
    payload: UpdateTeachingTaskPayload,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    const endpoint = `${this.getBasePath(universityId)}/${taskId}`
    return this.http.put<TeachingSupervisoryTask>(endpoint, payload)
  }

  async updateTaskStatus(
    universityId: Long,
    taskId: Long,
    status: TeachingStatus,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    const endpoint = `${this.getBasePath(universityId)}/${taskId}/status`
    return this.http.patch<TeachingSupervisoryTask>(endpoint, { status })
  }

  async archiveTask(
    universityId: Long,
    taskId: Long,
    archived = true,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    const endpoint = `${this.getBasePath(universityId)}/${taskId}/archive`
    return this.http.post<TeachingSupervisoryTask>(endpoint, { archived })
  }

  async copyTask(
    universityId: Long,
    taskId: Long,
    titleSuffix?: string,
  ): Promise<ApiResponse<TeachingSupervisoryTask | null>> {
    const endpoint = `${this.getBasePath(universityId)}/${taskId}/copy`
    return this.http.post<TeachingSupervisoryTask>(endpoint, titleSuffix ? { titleSuffix } : undefined)
  }

  async getTasksByStatus(
    universityId: Long,
    status: TeachingStatus,
  ): Promise<ApiResponse<TeachingSupervisoryTask[] | null>> {
    return this.getTasks(universityId, { status })
  }

  // 获取专业下的任务列表
  async getTasksByMajor(majorId: Long): Promise<ApiResponse<TeachingSupervisoryTask[] | null>> {
    const endpoint = `/api/v5/task-evaluation/majors/${majorId}/tasks`
    return this.http.get<TeachingSupervisoryTask[]>(endpoint)
  }
}
