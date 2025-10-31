import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface FileData {
  name: string
  size: string
  date: string
  type: string
  uploader: string
  version: string
}

export interface FolderData {
  id: string
  name: string
  count: number
}

export interface ScoringIndicator {
  name: string
  score: number
  weight: string
}

export interface ScoringData {
  total: number
  indicators: ScoringIndicator[]
}

export interface CourseResourceData {
  folders: FolderData[]
  files: Record<string, FileData[]>
  scoring: {
    selfEvaluation: ScoringData
    professionalEvaluation: ScoringData
    supervisionEvaluation: ScoringData
  }
}

export class ResourceApi {
  private storage = new StorageAdapter()
  private storageKeyPrefix = "courseResources-"

  async getCourseResources(courseId: string): Promise<ApiResponse<CourseResourceData>> {
    const key = `${this.storageKeyPrefix}${courseId}`
    const response = await this.storage.get<CourseResourceData>(key)
    return response
  }

  async updateCourseResources(
    courseId: string,
    resources: CourseResourceData,
  ): Promise<ApiResponse<CourseResourceData>> {
    const key = `${this.storageKeyPrefix}${courseId}`
    return await this.storage.set(key, resources)
  }
}
