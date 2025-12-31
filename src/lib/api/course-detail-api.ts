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
  }
}

export class CourseDetailApi {
  private storage = new StorageAdapter()

  /**
   * 获取课程详情数据
   * @param courseId 真实的课程ID（数字字符串，来自metadata.courseId）
   */
  async getCourseDetail(courseId: string): Promise<ApiResponse<CombinedCourseDetail>> {
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
        }
        pointksa: {
          points: any[]
          ksas: any[]
        }
      }>(`/api/major/v2.0/courseunitdetail?courseid=${courseId}`)

      if (courseDetailResponse.error || !courseDetailResponse.data) {
        console.error("[CourseDetailApi] 获取课程详情API失败:", courseDetailResponse.error)
        return {
          data: null,
          error: courseDetailResponse.error || "获取课程详情失败",
          status: courseDetailResponse.status,
        }
      }

      const courseDetailData = courseDetailResponse.data

      if (!courseDetailData?.course) {
        console.error("[CourseDetailApi] 课程详情数据不完整")
        return {
          data: null,
          error: "课程数据不完整",
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
  async saveCourseUnit(data: SaveCourseUnitRequest): Promise<ApiResponse<any>> {
    try {
      console.log(`[CourseDetailApi] 保存课程数据`, data)

      const response = await this.storage.postToApi<any>('/api/major/v2.0/savecourseunit', data)

      if (response.error) {
        console.error("[CourseDetailApi] 保存课程失败:", response.error)
        return {
          data: null,
          error: response.error,
          status: response.status,
        }
      }

      console.log("[CourseDetailApi] 课程保存成功", response.data)

      return {
        data: response.data,
        error: null,
        status: 200,
      }
    } catch (error) {
      console.error("[CourseDetailApi] 保存课程失败:", error)
      return {
        data: null,
        error: String(error),
        status: 500,
      }
    }
  }

  /**
   * 根据专业ID获取专业详情数据（包含毕业要求）
   * Mock阶段：无论入参是什么，都从major-detail.json中读取数据
   */
  async getMajorDetail(majorId: string | number): Promise<ApiResponse<MajorDetailData>> {
    try {
      console.log(`[CourseDetailApi] 获取专业详情，majorId: ${majorId}`)

      // 动态导入 major-detail.json 文件
      const majorDetailModule = await import("@/mock-data/major-detail.json")
      const majorDetailResponse = majorDetailModule.default

      // 提取数据
      const majorData = majorDetailResponse.data

      if (!majorData) {
        console.error("[CourseDetailApi] 专业数据不完整")
        return {
          data: null,
          error: "专业数据不完整",
          status: 404,
        }
      }

      console.log("[CourseDetailApi] 专业详情数据加载成功", majorData)

      return {
        data: majorData,
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
}

