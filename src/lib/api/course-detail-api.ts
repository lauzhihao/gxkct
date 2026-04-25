import type { ApiResponse } from "./types"
import { StorageAdapter } from "./storage-adapter"

// 课程基本信息（来自 course-name.json）
export interface CourseNameData {
  id: number
  name: string
  major: string
  department: {
    id: number
    collegeId: number
    name: string
    type: null | string
  }
  college: {
    id: number
    name: string
    image: string
    collegeType: null | string
  }
}

// 课程详情信息（来自 course-detal.json）
export interface CourseDetailData {
  course: {
    id: number
    majorId: number
    classId: number
    typeId: number
    name: string
    position: null | string
    introduction: null | string
    criterion: null | string
    theoryPeriod: number
    practicePeriod: number
    courseMatrixVOS: any[]
    createTime: string
    // 新增字段
    teachingClass?: string
    teachingLocation?: string
    teachingTime?: string
    studentCount?: number
    credits?: number
    mainTextbook?: string
    referenceResources?: string
    attendancePolicy?: string
    assignmentPolicy?: string
    conductRequirements?: string
    practiceRequirements?: string
    teamworkRequirements?: string
    bonusRequirements?: string
    otherSuggestions?: string
    assessmentMethod?: string
    assessmentForm?: string
    scoreType?: string
    scoreTable?: any
    assessmentDescription?: string
    // 开课学期字段
    openingSemesterId?: number
    openingSemesterDisplay?: string
  }
  pointksa: {
    points: any[]
    ksas: any[]
  }
}

// 组合后的课程详情数据
export interface CombinedCourseDetail {
  courseNameData: CourseNameData
  courseDetailData: CourseDetailData
}

// 专业详情数据（包含毕业要求）
export interface MajorDetailData {
  id: number
  name: string
  majorLevel: string
  majorClass: string
  feature: string
  careerLevel: string
  demandType: string
  demandArea: string
  position: string
  requiresVOS: Array<{
    id: number
    description: string
    children: Array<{
      id: number
      description: string
      children: null
    }>
  }>
}

// 保存课程请求数据结构
export interface SaveCourseUnitRequest {
  manage?: {
    id: number
    collegeId: number
    permissionId: number
    relativeId: number
  }
  current?: {
    id: number
    userId: number
    permissionId: number
    relativeId: number
    department: {
      id: number
      collegeId: number
      name: string
      type: null | string
    }
    college: {
      id: number
      name: string
      image: string
      collegeType: null | string
    }
    multiple: boolean
  }
  course: {
    id: number
    majorId: number
    classId: number
    typeId: number
    name: string
    introduction: string | null
    criterion: string | null
    theoryPeriod: number
    practicePeriod: number
    courseMatrixVOS: any[]
    position: string | null
    // 扩展字段
    teachingClass?: string
    teachingLocation?: string
    teachingTime?: string
    studentCount?: number
    credits?: number
    mainTextbook?: string
    referenceResources?: string
    attendancePolicy?: string
    assignmentPolicy?: string
    conductRequirements?: string
    practiceRequirements?: string
    teamworkRequirements?: string
    bonusRequirements?: string
    otherSuggestions?: string
    assessmentMethod?: string
    assessmentForm?: string
    scoreType?: string
    scoreTable?: any
    assessmentDescription?: string
    // 开课学期字段
    openingSemesterId?: number | null
    openingSemesterDisplay?: string | null
  }
}

export interface UpdateCourseSettingsRequest {
  courseId: number
  name?: string
  teacherIds?: number[]
}

export class CourseDetailApi {
  private storage = new StorageAdapter()

  /**
   * 获取课程详情数据
   * @param courseId 真实的课程ID（数字字符串，来自metadata.courseId）
   */
  async getCourseDetail(courseId: string, semesterId?: number | null): Promise<ApiResponse<CombinedCourseDetail>> {
    try {
      console.log(`[CourseDetailApi] 获取课程详情，courseId: ${courseId}`)

      // 将courseId转换为数字
      const numCourseId = parseInt(courseId, 10)
      if (isNaN(numCourseId)) {
        console.error(`[CourseDetailApi] 无效的课程ID: ${courseId}`)
        return {
          data: null,
          error: "无效的课程ID",
          status: 400,
        }
      }

      const queryParams = new URLSearchParams()
      queryParams.set("courseid", courseId)
      if (typeof semesterId === "number" && Number.isFinite(semesterId)) {
        queryParams.set("semesterId", String(semesterId))
      }

      // 调用真实API获取课程详情
      const courseDetailResponse = await this.storage.getFromApi<{
        course: {
          id: number
          majorId: number
          classId: number
          typeId: number
          name: string
          position: null | string
          introduction: null | string
          criterion: null | string
          theoryPeriod: number
          practicePeriod: number
          courseMatrixVOS: any[]
          createTime: string
          // 新增字段
          teachingClass?: string
          teachingLocation?: string
          teachingTime?: string
          studentCount?: number
          credits?: number
          mainTextbook?: string
          referenceResources?: string
          attendancePolicy?: string
          assignmentPolicy?: string
          conductRequirements?: string
          practiceRequirements?: string
          teamworkRequirements?: string
          bonusRequirements?: string
          otherSuggestions?: string
          assessmentMethod?: string
          assessmentForm?: string
          scoreType?: string
          scoreTable?: any
          assessmentDescription?: string
        }
        pointksa: {
          points: any[]
          ksas: any[]
        }
      }>(`/api/major/v2.0/courseunitdetail?${queryParams.toString()}`)

      if (courseDetailResponse.error || !courseDetailResponse.data) {
        console.error("[CourseDetailApi] 获取课程详情API失败:", courseDetailResponse.error)
        return {
          data: null,
          error: courseDetailResponse.error || "获取课程详情失败",
          status: courseDetailResponse.status,
        }
      }

      const courseDetailData = courseDetailResponse.data

      if (!courseDetailData?.course || typeof courseDetailData.course !== "object") {
        console.error("[CourseDetailApi] 课程详情数据不完整")
        return {
          data: null,
          error: "该学期无课程数据",
          status: 404,
        }
      }

      const rawCourse = courseDetailData.course as Record<string, unknown>
      if (Object.keys(rawCourse).length === 0 || typeof rawCourse.id !== "number" || typeof rawCourse.name !== "string") {
        console.error("[CourseDetailApi] 课程详情为空或缺少关键字段")
        return {
          data: null,
          error: "该学期无课程数据",
          status: 404,
        }
      }

      // 从API返回的course对象构建courseNameData
      const courseNameData: CourseNameData = {
        id: courseDetailData.course.id,
        name: courseDetailData.course.name,
        major: "", // 从API中无法获取，使用空字符串
        department: {
          id: 0,
          collegeId: 0,
          name: "",
          type: null,
        },
        college: {
          id: 0,
          name: "",
          image: "",
          collegeType: null,
        },
      }

      const combinedData: CombinedCourseDetail = {
        courseNameData,
        courseDetailData,
      }

      console.log("[CourseDetailApi] 课程详情数据加载成功", combinedData)

      return {
        data: combinedData,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 获取课程详情失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 保存课程数据
   * @param data 课程保存请求数据
   */
  /**
   * [MOD] 保存课程（新增/编辑统一接口，使用 v5 API）
   * @param data 课程数据（SaveCourseUnitRequest 格式）
   * 规则：course.id = 0 表示新增，course.id > 0 表示编辑
   */
  async saveCourseUnit(data: SaveCourseUnitRequest): Promise<ApiResponse<any>> {
    try {
      const operationType = data.course?.id ? "编辑" : "新增"
      console.log(`[CourseDetailApi] ${operationType}课程数据`, data)

      const response = await this.storage.postToApi<any>('/api/v5/matrix/courses', data)

      if (response.error) {
        console.error(`[CourseDetailApi] ${operationType}课程失败:`, response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      console.log(`[CourseDetailApi] 课程${operationType}成功`, response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 课程保存失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * @deprecated 请使用 saveCourseUnit，已迁移到 v5 API
   */
  async createCourse(data: SaveCourseUnitRequest): Promise<ApiResponse<any>> {
    return this.saveCourseUnit(data)
  }

  /**
   * 更新课程卡片设置
   * @param data 课程设置数据
   */
  async updateCourseSettings(data: UpdateCourseSettingsRequest): Promise<ApiResponse<unknown>> {
    try {
      if (!Number.isFinite(data.courseId) || data.courseId <= 0) {
        throw new Error("课程ID无效")
      }
      if (data.name !== undefined && data.name.trim().length === 0) {
        throw new Error("课程名称不能为空")
      }
      if (data.teacherIds !== undefined && (!Array.isArray(data.teacherIds) || data.teacherIds.length === 0)) {
        throw new Error("任课老师不能为空")
      }
      if (data.name === undefined && data.teacherIds === undefined) {
        throw new Error("没有需要保存的课程设置")
      }

      const payload: {
        courseId: number
        name?: string
        teacherIds?: number[]
      } = {
        courseId: data.courseId,
      }

      if (data.name !== undefined) {
        payload.name = data.name.trim()
      }
      if (data.teacherIds !== undefined) {
        payload.teacherIds = data.teacherIds
      }

      const response = await this.storage.putToApi<unknown>("/api/v5/tree/course", payload)

      if (response.error) {
        console.error("[CourseDetailApi] 更新课程设置失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 更新课程设置失败:", error)
      return {
        data: null,
        error: error instanceof Error ? error.message : String(error),
        status: 500,
      }
    }
  }

  /**
   * 根据专业ID获取专业详情数据（包含毕业要求）
   */
  async getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    try {
      console.log(`[CourseDetailApi] 获取专业详情，majorId: ${majorId}`)

      const response = await this.storage.getFromApi<MajorDetailData>(
        `/api/major/v2.0/detail?majorid=${majorId}`
      )

      if (response.error || !response.data) {
        console.error("[CourseDetailApi] 获取专业详情失败:", response.error)
        return {
          data: null,
          error: response.error || "获取专业详情失败",
          status: response.status,
        }
      }

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 获取专业详情失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 删除课程
   * @param semesterId 学期ID
   * @param courseUnitId 课程单元ID
   */
  async deleteCourse(semesterId: number | string | null | undefined, courseUnitId: number | string | null | undefined): Promise<ApiResponse<any>> {
    try {
      // 参数验证
      if (!semesterId) {
        throw new Error("学期ID不能为空")
      }
      if (!courseUnitId) {
        throw new Error("课程单元ID不能为空")
      }

      console.log(`[CourseDetailApi] 删除课程，semesterId: ${semesterId}, courseUnitId: ${courseUnitId}`)

      const response = await this.storage.deleteFromApi<any>(
        `/api/v5/matrix/semesters/${semesterId}/courses/${courseUnitId}`
      )

      if (response.error) {
        console.error("[CourseDetailApi] 删除课程失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      console.log("[CourseDetailApi] 课程删除成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 删除课程失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }
}
