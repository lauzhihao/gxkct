import { StorageAdapter } from "./storage-adapter"
import { HttpAdapter } from "./http-adapter"
import type { ApiResponse } from "./types"

// 课程矩阵中的单个课点项
export interface CourseMatrixItem {
  id: number
  courseUnitId: number
  projectId: number
  graduateRequireId: number
  point: {
    id: number
    title: string
    description: string
  }
  relate: {
    name: string
    code: string
    relate: number
  }
  study: string
  teach: string
  product: string
  week: string
  period?: string
  // 拆分学时数为理论学时和实践学时
  theoryPeriod?: string
  practicePeriod?: string
}

// 课程矩阵章节项目信息
export interface CourseMatrixProject {
  id: number
  uniqueCode?: string
  courseUnitId: number
  name: string
  product?: string
  theoryPeriod: string
  practicePeriod: string
  indexNo?: number | null
}

// 课程矩阵保存请求体（按章节组织）
export interface CourseMatrixSavePayload {
  project: CourseMatrixProject
  data: CourseMatrixItem[]
}

// 课程矩阵API响应
export interface CourseMatrixResponse {
  code: string
  message: string
  data: CourseMatrixItem[]
  success: boolean
}

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

export interface ProjectMatrixSaveItem {
  courseMatrix: {
    id: number
    projectId: number
    point?: {
      id: number
      title: string
      description?: string
    }
    study?: string
    teach?: string
    product?: string
    week?: string
    theoryPeriod?: string
    practicePeriod?: string
    relate?: {
      relate: number
    }
  }
  projectMatrices?: Array<{
    id: number
    taskGoalId: number
    ksa?: {
      id: number
      title: string
      level: number
      description?: string
    }
    relate?: {
      relate: number
    }
  }>
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

  async getCourseMatrix(courseId: string): Promise<ApiResponse<CourseMatrixItem[] | null>> {
    try {
      const endpoint = `/api/matrix/coursematrix?courseId=${courseId}`
      console.log("[getCourseMatrix] 调用接口:", endpoint)

      const response = await this.http.get<CourseMatrixItem[]>(endpoint)

      if (response.error) {
        console.error("[getCourseMatrix] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status ?? 500,
        }
      }

      // response.data 已经是数组了（handleBackendResponse已经提取了后端响应中的data字段）
      const courseMatrixData = Array.isArray(response.data) ? response.data : []
      console.log("[getCourseMatrix] 接口调用成功，获取课程矩阵数据:", courseMatrixData.length, "条")

      return {
        data: courseMatrixData,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[getCourseMatrix] 异常:", error)
      return {
        data: null,
        error: `获取课程矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  async updateCourseMatrix(courseId: string, matrix: CourseMatrixSavePayload[]): Promise<ApiResponse<any>> {
    try {
      const endpoint = `/api/matrix/updatecoursematrix`
      console.log("[updateCourseMatrix] 调用接口:", endpoint, "courseId:", courseId, "章节数:", matrix.length)

      const response = await this.http.post<any>(endpoint, matrix)

      if (response.error) {
        console.error("[updateCourseMatrix] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status ?? 500,
        }
      }

      console.log("[updateCourseMatrix] 接口调用成功")

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[updateCourseMatrix] 异常:", error)
      return {
        data: null,
        error: `保存课程矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  async getProjectMatrix(courseId: string): Promise<ApiResponse<ProjectMatrix>> {
    const response = await this.storage.get<ProjectMatrix>(`projectMatrix-${courseId}`)
    return {
      data: response.data ?? null,
      error: response.error,
      status: response.status,
    }
  }

  async updateProjectMatrix(courseId: string, matrix: ProjectMatrix): Promise<ApiResponse<ProjectMatrix>> {
    const response = await this.storage.set(`projectMatrix-${courseId}`, matrix)
    return {
      data: response.data ?? null,
      error: response.error,
      status: response.status,
    }
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

      return { data, error: null, status: 200 }
    } catch (error) {
      return {
        data: null,
        error: `获取专业矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
        status: 200,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存专业矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
        status: 200,
      }
    } catch (error) {
      return {
        data: null,
        error: `获取指标点课程支撑关系失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
        status: 200,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存指标点课程支撑关系失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
        status: 200,
      }
    } catch (error) {
      return {
        data: null,
        error: `保存课程教学目标指标点关系失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
        status: 200,
      }
    } catch (error) {
      return {
        data: null,
        error: `获取课程教学目标指标点关系失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
          status: 200,
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
        status: 200,
      }
    } catch (error) {
      console.error("[getCourseIndicatorSupports] 异常:", error)
      return {
        data: [],
        error: `获取课程支撑的指标点失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 根据课程id获取它支撑的指标点及强弱关系
  async getCourseIndicatorSupportLevels(
    courseId: string,
    majorId: string
  ): Promise<ApiResponse<Record<string, "strong" | "weak">>> {
    try {
      const storageKey = `majorIndicatorCourseSupports-${majorId}`
      const response = await this.storage.get<Record<string, IndicatorCourseSupport[]>>(storageKey)

      if (!response.data) {
        return {
          data: {},
          error: null,
          status: 200,
        }
      }

      const supportLevels: Record<string, "strong" | "weak"> = {}

      Object.entries(response.data).forEach(([indicatorKey, courses]) => {
        const matchedCourse = courses.find((course) => course.courseId === courseId)
        if (!matchedCourse) return

        // 同一指标点若存在多条记录，优先保留 strong
        if (matchedCourse.supportLevel === "strong" || !supportLevels[indicatorKey]) {
          supportLevels[indicatorKey] = matchedCourse.supportLevel
        }
      })

      return {
        data: supportLevels,
        error: null,
        status: 200,
      }
    } catch (error) {
      return {
        data: {},
        error: `获取课程支撑强弱关系失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
          status: response.status ?? 500,
        }
      }

      console.log("[getProjectMatrixData] 接口调用成功")
      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[getProjectMatrixData] 异常:", error)
      return {
        data: null,
        error: `获取项目矩阵数据失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 保存项目矩阵数据
  async updateProjectMatrixData(data: ProjectMatrixSaveItem[]): Promise<ApiResponse<any>> {
    try {
      const endpoint = `/api/matrix/updateprojectmatrix`
      console.log("[updateProjectMatrixData] 调用接口:", endpoint, "数据条数:", data.length)

      const response = await this.http.post<any>(endpoint, data)

      if (response.error) {
        console.error("[updateProjectMatrixData] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status ?? 500,
        }
      }

      console.log("[updateProjectMatrixData] 接口调用成功")
      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[updateProjectMatrixData] 异常:", error)
      return {
        data: null,
        error: `保存项目矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
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
          status: response.status ?? 500,
        }
      }

      console.log("[getKsaList] 接口调用成功:", response.data)
      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[getKsaList] 异常:", error)
      return {
        data: null,
        error: `获取KSA列表失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 保存KSA列表（新增/更新/删除统一接口）
  // 规则: id=0 为新增, id>0 为更新, id<0 为删除（取原 id 的负值）
  async saveKsaList(params: {
    majorId: number
    courseId: number
    ksas: Array<{
      id: number
      title: string
      description: string
      level: number
    }>
    upload?: boolean
  }): Promise<ApiResponse<any>> {
    try {
      const endpoint = `/api/major/v2.0/saveksa`
      console.log("[saveKsaList] 调用接口:", endpoint, params)

      const response = await this.http.post<any>(endpoint, params)

      if (response.error) {
        console.error("[saveKsaList] 接口调用失败:", response.error)
        return { data: null, error: response.error, status: response.status ?? 500 }
      }

      console.log("[saveKsaList] 保存成功")
      return { data: response.data, error: null, status: 200 }
    } catch (error) {
      console.error("[saveKsaList] 异常:", error)
      return {
        data: null,
        error: `保存KSA列表失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 根据专业ID一次性获取所有课程的矩阵数据
  async getMajorMatrixAll(majorId: string): Promise<ApiResponse<MajorMatrixCourseGroup[]>> {
    try {
      const endpoint = `/api/v5/matrix/majormatrix/${majorId}`
      console.log("[getMajorMatrixAll] 调用接口:", endpoint)

      const response = await this.http.get<MajorMatrixCourseGroup[]>(endpoint)

      if (response.error) {
        console.error("[getMajorMatrixAll] 接口调用失败:", response.error)
        return {
          data: [],
          error: response.error,
          status: response.status ?? 500,
        }
      }

      console.log("[getMajorMatrixAll] 接口调用成功:", response.data?.length, "门课程")
      return {
        data: response.data || [],
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[getMajorMatrixAll] 异常:", error)
      return {
        data: [],
        error: `获取专业完整矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 获取专业矩阵数据
  async getMajorMatrix(courseId: string): Promise<ApiResponse<MajorMatrixItemResponse[]>> {
    try {
      const endpoint = `/api/matrix/majormatrix?courseId=${courseId}`
      console.log("[getMajorMatrix] 调用接口:", endpoint)

      // 泛型用数组类型，因为 handleBackendResponse 已经提取了 data 字段
      const response = await this.http.get<MajorMatrixItemResponse[]>(endpoint)

      if (response.error) {
        console.error("[getMajorMatrix] 接口调用失败:", response.error)
        return {
          data: [],
          error: response.error,
          status: response.status ?? 500,
        }
      }

      console.log("[getMajorMatrix] 接口调用成功:", response.data?.length, "条")
      return {
        data: response.data || [],
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[getMajorMatrix] 异常:", error)
      return {
        data: [],
        error: `获取专业矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }

  // 保存专业矩阵数据
  async updateMajorMatrix(courseId: string, data: MajorMatrixItemResponse[]): Promise<ApiResponse<any>> {
    try {
      const endpoint = `/api/matrix/updatemajormatrix`
      console.log("[updateMajorMatrix] 调用接口:", endpoint, "数据条数:", data.length)

      const response = await this.http.post<any>(endpoint, data)

      if (response.error) {
        console.error("[updateMajorMatrix] 接口调用失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status ?? 500,
        }
      }

      console.log("[updateMajorMatrix] 接口调用成功")
      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[updateMajorMatrix] 异常:", error)
      return {
        data: null,
        error: `保存专业矩阵失败: ${error instanceof Error ? error.message : String(error)}`,
        status: 500,
      }
    }
  }
}

// 专业矩阵项响应接口
export interface MajorMatrixItemResponse {
  id: number
  majorId: number
  courseUnitId: number
  courseUnitName: string
  graduateRequireId: number
  relate: number // 0=强支撑, 1=弱支撑
}

// 专业矩阵API响应
export interface MajorMatrixResponse {
  code: string
  message: string
  data: MajorMatrixItemResponse[]
  success: boolean
}

// 按课程分组的专业矩阵数据（v5 批量接口）
export interface MajorMatrixCourseGroup {
  courseId: number
  courseName: string
  matrixItems: MajorMatrixItemResponse[]
}
