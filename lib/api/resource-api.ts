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
  comment?: string
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

  // 将数字 ID 映射到 mock 数据的 key
  private getMockDataKey(courseId: string): string {
    console.log(`[ResourceApi.getMockDataKey] 输入 courseId: ${courseId}, 类型: ${typeof courseId}`)

    // 如果已经是 "course-X" 格式（简单格式），直接返回
    if (courseId.startsWith("course-") && !courseId.includes("-", 7)) {
      console.log(`[ResourceApi.getMockDataKey] 已是 course-X 简单格式，直接返回: ${courseId}`)
      return courseId
    }

    // 处理复杂的课程 ID 格式：course-${majorId}-${item.self.value}-${index}
    // 从中提取数字部分用于映射
    let numId: number | null = null

    // 尝试从复杂 ID 中提取数字
    if (courseId.startsWith("course-")) {
      // 格式: course-major-123-456-0
      // 提取最后一个数字部分或倒数第二个数字部分
      const parts = courseId.split("-")
      if (parts.length >= 3) {
        // 尝试使用倒数第二个数字部分（item.self.value）
        const secondLastPart = parts[parts.length - 2]
        const lastPart = parts[parts.length - 1]

        // 优先使用倒数第二个部分，如果不是数字则使用最后一个部分
        const candidate = parseInt(secondLastPart, 10)
        if (!isNaN(candidate)) {
          numId = candidate
          console.log(`[ResourceApi.getMockDataKey] 从复杂 ID 提取数字: ${candidate}`)
        } else {
          const lastCandidate = parseInt(lastPart, 10)
          if (!isNaN(lastCandidate)) {
            numId = lastCandidate
            console.log(`[ResourceApi.getMockDataKey] 从复杂 ID 提取最后数字: ${lastCandidate}`)
          }
        }
      }
    }

    // 如果还没有提取到数字，尝试直接解析
    if (numId === null) {
      numId = parseInt(courseId, 10)
      if (isNaN(numId)) {
        console.warn(`[ResourceApi.getMockDataKey] 无法从 ${courseId} 提取数字，使用默认值 1`)
        numId = 1
      }
    }

    // 映射到 course-1 到 course-100（循环）
    const mockIndex = ((numId - 1) % 100) + 1
    const result = `course-${mockIndex}`
    console.log(`[ResourceApi.getMockDataKey] 最终映射结果: ${result}`)
    return result
  }

  async getCourseResources(courseId: string): Promise<ApiResponse<CourseResourceData>> {
    const mockKey = this.getMockDataKey(courseId)
    const key = `${this.storageKeyPrefix}${mockKey}`
    console.log(`[ResourceApi] 获取课程资源: courseId=${courseId}, mockKey=${mockKey}, storageKey=${key}`)
    const response = await this.storage.get<CourseResourceData>(key)
    return response
  }

  async updateCourseResources(
    courseId: string,
    resources: CourseResourceData,
  ): Promise<ApiResponse<CourseResourceData>> {
    const mockKey = this.getMockDataKey(courseId)
    const key = `${this.storageKeyPrefix}${mockKey}`
    return await this.storage.set(key, resources)
  }
}
