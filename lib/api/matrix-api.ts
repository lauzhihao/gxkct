import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"

export interface CourseMatrix {
  objectives: any[]
  coursePoints: any[]
  matrix: Record<string, any>
}

export interface ProjectMatrix {
  teachingObjectives: any[]
  chapters: any[]
  coursePoints: any[]
  matrix: Record<string, any>
}

export interface MajorMatrixData {
  courseId: string
  majorId: string
  requiresVOS: any[]
  matrixSupportLevels: Record<string, string>
}

export class MatrixApi {
  private storage = new StorageAdapter()

  async getCourseMatrix(courseId: string): Promise<ApiResponse<CourseMatrix>> {
    return this.storage.get<CourseMatrix>(`courseMatrix-${courseId}`)
  }

  async updateCourseMatrix(courseId: string, matrix: CourseMatrix): Promise<ApiResponse<CourseMatrix>> {
    return this.storage.set(`courseMatrix-${courseId}`, matrix)
  }

  async getProjectMatrix(courseId: string): Promise<ApiResponse<ProjectMatrix>> {
    return this.storage.get<ProjectMatrix>(`projectMatrix-${courseId}`)
  }

  async updateProjectMatrix(courseId: string, matrix: ProjectMatrix): Promise<ApiResponse<ProjectMatrix>> {
    return this.storage.set(`projectMatrix-${courseId}`, matrix)
  }

  // 获取专业矩阵数据（课程与专业的关联矩阵）
  async getCourseMajorMatrix(courseId: string, majorId: string): Promise<ApiResponse<MajorMatrixData>> {
    // Mock阶段：无论入参是什么，都从mock数据中读取
    // 实际应用中，这里会调用真实API，根据courseId和majorId查询数据库
    try {
      const data: MajorMatrixData = {
        courseId,
        majorId,
        requiresVOS: [],
        matrixSupportLevels: {},
      }

      // 从localStorage中获取已保存的支撑度数据
      const savedLevels = await this.storage.get<Record<string, string>>(
        `courseMajorMatrix-${courseId}-${majorId}`
      )
      if (savedLevels.data) {
        data.matrixSupportLevels = savedLevels.data
      }

      return { data, error: null }
    } catch (error) {
      return {
        data: null,
        error: `获取专业矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 保存专业矩阵数据
  async updateCourseMajorMatrix(
    courseId: string,
    majorId: string,
    matrixSupportLevels: Record<string, string>
  ): Promise<ApiResponse<MajorMatrixData>> {
    try {
      await this.storage.set(`courseMajorMatrix-${courseId}-${majorId}`, matrixSupportLevels)
      return {
        data: {
          courseId,
          majorId,
          requiresVOS: [],
          matrixSupportLevels,
        },
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存专业矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }
}
