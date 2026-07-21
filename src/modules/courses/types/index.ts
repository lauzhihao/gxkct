/**
 * Courses模块类型定义统一导出
 */

// 数据模型类型
export type {
  InfoPoint,
  CoursePoint,
  TeachingObjective,
  Chapter,
  Resource,
  TeachingMaterial,
  CourseMatrixCell,
  KsaPoint,
  TaskObjective,
  CourseMetadata,
  CourseMatrixData,
  ChapterTaskObjectives,
} from "./models"

// 组件Props类型
export type { CourseProjectMatrixProps } from "./components"

// Hooks类型
export type {
  UseProjectMatrixResult,
  ProjectMatrixData,
  KsaItem,
  UseTaskObjectivesResult,
  UseKsaManagementResult,
} from "./hooks"
