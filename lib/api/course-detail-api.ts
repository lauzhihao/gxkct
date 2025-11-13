import type { ApiResponse } from "./types"

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

export class CourseDetailApi {
  /**
   * 获取课程详情数据
   * 无论收到什么ID，都直接读取两个JSON文件中的数据并返回
   */
  async getCourseDetail(courseId: string): Promise<ApiResponse<CombinedCourseDetail>> {
    try {
      console.log(`[CourseDetailApi] 获取课程详情，courseId: ${courseId}`)

      // 动态导入 JSON 文件
      const courseNameModule = await import("@/mock-data/course-name.json")
      const courseDetailModule = await import("@/mock-data/course-detal.json")

      const courseNameResponse = courseNameModule.default
      const courseDetailResponse = courseDetailModule.default

      // 提取数据
      const courseNameData = courseNameResponse.data?.data?.[0]
      const courseDetailData = courseDetailResponse.data

      if (!courseNameData || !courseDetailData) {
        console.error("[CourseDetailApi] 数据不完整")
        return {
          data: null,
          error: "课程数据不完整",
          status: 404,
        }
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
}

