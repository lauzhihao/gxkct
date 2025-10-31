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
}
