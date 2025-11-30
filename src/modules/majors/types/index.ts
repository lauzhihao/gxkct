/**
 * Majors模块类型定义统一导出
 */

// 数据模型类型
export type {
  WorkCategory,
  WorksData,
  CareerInfo,
  IndicatorCourseSupport,
  GraduationRequirement,
  SearchResult,
  MajorMetadata,
} from "./models"

// 组件Props类型
export type {
  AddMajorFormProps,
  AddMajorFormViewProps,
  FormHeaderProps,
  MajorBasicInfoSectionProps,
  CareerInfoSectionProps,
  CareerTrainingSectionProps,
  GraduationRequirementsSectionProps,
} from "./components"

// Hooks类型
export type {
  UseMajorFormStateResult,
  UseCareerInfoResult,
  UseGraduationRequirementsResult,
} from "./hooks"
