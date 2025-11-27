import { StorageAdapter } from "./storage-adapter"
import { HttpAdapter } from "./http-adapter"
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

export interface IndicatorCourseSupport {
  courseId: string
  courseName: string
  supportLevel: "strong" | "weak"
}

export interface MajorIndicatorCourseSupports {
  majorId: string
  supports: Record<string, IndicatorCourseSupport[]>
}

// 项目矩阵数据接口
export interface ProjectMatrixDataResponse {
  code: string
  message: string
  data: {
    courseId: number
    projects: Array<{
      project: {
        id: number
        uniqueCode: string
        courseUnitId: number
        name: string
        product: string
        theoryPeriod: string
        practicePeriod: string
        indexNo: number
      }
      goals: Array<{
        id: number
        projectId: number
        description: string
        product: string
      }>
    }>
    ksas: Array<{
      id: number
      majorId: number
      courseUnitId: number
      title: string
      description: string
      level: number
    }>
    relates: Array<{
      name: string
      code: string
      relate: number
    }>
    data: any[]
  }
}

// KSA列表数据接口
export interface KsaListResponse {
  code: string
  message: string
  data: Array<{
    id: number
    majorId: number
    courseUnitId: number
    title: string
    description: string
    level: number
  }>
}

export class MatrixApi {
  private storage = new StorageAdapter()
  private http = new HttpAdapter()

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

  // 获取指标点与课程的支撑关系
  async getMajorIndicatorCourseSupports(majorId: string): Promise<ApiResponse<MajorIndicatorCourseSupports>> {
    try {
      const response = await this.storage.get<Record<string, IndicatorCourseSupport[]>>(
        `majorIndicatorCourseSupports-${majorId}`
      )
      return {
        data: {
          majorId,
          supports: response.data || {},
        },
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: `获取指标点课程支撑关系失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 保存指标点与课程的支撑关系
  async updateMajorIndicatorCourseSupports(
    majorId: string,
    supports: Record<string, IndicatorCourseSupport[]>
  ): Promise<ApiResponse<MajorIndicatorCourseSupports>> {
    try {
      await this.storage.set(`majorIndicatorCourseSupports-${majorId}`, supports)
      return {
        data: {
          majorId,
          supports,
        },
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存指标点课程支撑关系失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 保存课程教学目标与指标点的关系
  async updateCourseTeachingObjectiveIndicators(
    courseId: string,
    majorId: string,
    objectiveIndicatorMap: Record<string, string[]>
  ): Promise<ApiResponse<any>> {
    try {
      await this.storage.set(`courseTeachingObjectiveIndicators-${courseId}-${majorId}`, objectiveIndicatorMap)
      return {
        data: {
          courseId,
          majorId,
          objectiveIndicatorMap,
        },
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存课程教学目标指标点关系失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 获取课程教学目标与指标点的关系
  async getCourseTeachingObjectiveIndicators(
    courseId: string,
    majorId: string
  ): Promise<ApiResponse<Record<string, string[]>>> {
    try {
      const response = await this.storage.get<Record<string, string[]>>(
        `courseTeachingObjectiveIndicators-${courseId}-${majorId}`
      )
      return {
        data: response.data || {},
        error: null,
      }
    } catch (error) {
      return {
        data: null,
        error: `获取课程教学目标指标点关系失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 根据课程id获取它支撑的指标点
  async getCourseIndicatorSupports(
    courseId: string,
    majorId: string
  ): Promise<ApiResponse<string[]>> {
    try {
      const storageKey = `majorIndicatorCourseSupports-${majorId}`
      console.log("[getCourseIndicatorSupports] 查询存储key:", storageKey, "courseId:", courseId)
      const response = await this.storage.get<Record<string, IndicatorCourseSupport[]>>(storageKey)

      console.log("[getCourseIndicatorSupports] 从存储获取的完整数据:", response.data)

      if (!response.data) {
        console.log("[getCourseIndicatorSupports] 存储中没有数据")
        return {
          data: [],
          error: null,
        }
      }

      // 查找包含该课程的所有指标点
      const supportedIndicators: string[] = []
      Object.entries(response.data).forEach(([indicatorKey, courses]) => {
        console.log("[getCourseIndicatorSupports] 检查指标点:", indicatorKey, "课程列表:", courses)
        if (courses.some((course) => {
          const isMatch = course.courseId === courseId
          console.log("[getCourseIndicatorSupports] 比较courseId:", course.courseId, "===", courseId, "结果:", isMatch)
          return isMatch
        })) {
          supportedIndicators.push(indicatorKey)
        }
      })

      console.log("[getCourseIndicatorSupports] 找到的支撑指标点:", supportedIndicators)
      return {
        data: supportedIndicators,
        error: null,
      }
    } catch (error) {
      console.error("[getCourseIndicatorSupports] 异常:", error)
      return {
        data: null,
        error: `获取课程支撑的指标点失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 获取项目矩阵数据（包含项目章节列表和KSA数据）
  async getProjectMatrixData(courseId: string): Promise<ApiResponse<ProjectMatrixDataResponse>> {
    try {
      const endpoint = `/api/v4/webpage/triplematrix/projectmatrixdata?courseId=${courseId}`
      console.log("[getProjectMatrixData] 调用接口:", endpoint)

      const response = await this.http.get<ProjectMatrixDataResponse>(endpoint)

      if (response.error) {
        console.error("[getProjectMatrixData] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
        }
      }

      console.log("[getProjectMatrixData] 接口调用成功:", response.data)
      return {
        data: response.data,
        error: null,
      }
    } catch (error) {
      console.error("[getProjectMatrixData] 异常:", error)
      return {
        data: null,
        error: `获取项目矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 获取KSA列表数据
  async getKsaList(majorId: string, courseId: string): Promise<ApiResponse<KsaListResponse>> {
    try {
      const endpoint = `/api/major/v2.0/ksalist?majorid=${majorId}&courseid=${courseId}`
      console.log("[getKsaList] 调用接口:", endpoint)

      const response = await this.http.get<KsaListResponse>(endpoint)

      if (response.error) {
        console.error("[getKsaList] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
        }
      }

      console.log("[getKsaList] 接口调用成功:", response.data)
      return {
        data: response.data,
        error: null,
      }
    } catch (error) {
      console.error("[getKsaList] 异常:", error)
      return {
        data: null,
        error: `获取KSA列表失败: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  // 新增KSA
  async addKsa(data: {
    majorId: number
    courseUnitId: number
    title: string
    description: string
    level: number
  }): Promise<ApiResponse<any>> {
    console.log("[addKsa] 新增KSA:", data)
    return {
      data: { id: Date.now(), ...data },
      error: null,
    }
  }

  // 更新KSA
  async updateKsa(ksaId: number, data: {
    title?: string
    description?: string
    level?: number
  }): Promise<ApiResponse<any>> {
    console.log("[updateKsa] 更新KSA:", ksaId, data)
    return {
      data: { id: ksaId, ...data },
      error: null,
    }
  }

  // 删除KSA
  async deleteKsa(ksaId: number): Promise<ApiResponse<boolean>> {
    console.log("[deleteKsa] 删除KSA:", ksaId)
    return {
      data: true,
      error: null,
    }
  }
}
