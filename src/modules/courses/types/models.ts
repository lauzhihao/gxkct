/**
 * Courses模块数据模型类型定义
 * 从全局types迁移的课程相关数据模型
 */

// 从全局types引入共享类型
import type { InfoPointType, SupportStrength } from "@/types"

// 信息点接口
export interface InfoPoint {
  id: string
  type: InfoPointType
  content: string
}

// 课点接口
export interface CoursePoint {
  id: string
  content: string
  title?: string
  description?: string
  infoPoints?: InfoPoint[]
}

// 教学目标接口
export interface TeachingObjective {
  id: string
  content: string
  name?: string
  points?: string[]
}

// 章节接口
export interface Chapter {
  id: string
  name: string
  theoryHours?: number
  practiceHours?: number
}

// 资源接口
export interface Resource {
  id: string
  name: string
  type: string
  url?: string
  size?: string
  uploadDate?: string
}

// 教材接口
export interface TeachingMaterial {
  id: string
  name: string
  author?: string
  publisher?: string
  isbn?: string
  year?: string
}

// 课程矩阵单元格数据
export interface CourseMatrixCell {
  id: string
  name: string
  description: string
  support: SupportStrength
}

// KSA点接口
export interface KsaPoint {
  id: string
  title: string
  description: string
}

// 任务目标接口
export interface TaskObjective {
  id: string
  content: string
  ksaPoints?: KsaPoint[]
}

// 课程元数据接口
export interface CourseMetadata {
  courseType?: string
  courseNature?: string
  // [MOD] 改为开课学期字段
  openingSemesterId?: number
  openingSemesterDisplay?: string
  teachingObjectives?: TeachingObjective[]
  coursePoints?: CoursePoint[]
  chapters?: Chapter[]
  resources?: Resource[]
  teachingMaterials?: TeachingMaterial[]
  courseMajorMatrixSupportLevels?: Record<string, string>
  projectMatrixData?: any
  chapterTaskObjectives?: Record<string, any[]>
  ksaData?: Record<string, Record<string, "strong" | "weak">>
  courseMatrixData?: Record<string, any[]>
}

// 课程矩阵数据结构
export type CourseMatrixData = Record<string, CourseMatrixCell[]>

// 章节任务目标数据结构
export type ChapterTaskObjectives = Record<string, TaskObjective[]>
