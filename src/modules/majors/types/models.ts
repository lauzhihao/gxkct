/**
 * Majors模块数据模型类型定义
 * 从add-major-form/types.ts迁移的专业相关数据模型
 */

// 职业分类接口
export interface WorkCategory {
  value: string
  label: string
  children: WorkCategory[]
}

// 职业数据接口
export interface WorksData {
  code: string
  message: string
  data: WorkCategory[]
}

// 职业信息接口
export interface CareerInfo {
  id: string
  level: string
  direction: {
    category1: string
    category2: string
    category3: string
    category4: string
  }
  tasks: string
}

// 指标点课程支撑接口
export interface IndicatorCourseSupport {
  courseId: string
  courseName: string
  supportLevel: "strong" | "weak"
}

// 毕业要求接口
export interface GraduationRequirement {
  id: string
  content: string
  indicators: string[]
  indicatorCourseSupports?: Record<number, IndicatorCourseSupport[]>
}

// 职业方向搜索结果接口
export interface SearchResult {
  category1: WorkCategory
  category2: WorkCategory
  category3: WorkCategory
  category4: WorkCategory
  matchedText: string
  matchLevel: number
}

// 专业元数据接口 (从全局types引用)
export type { MajorMetadata } from "@/types"
