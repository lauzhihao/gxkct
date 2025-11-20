import { TreeApi } from "./tree-api"
import { UserApi, type User } from "./user-api"
import { MatrixApi, type CourseMatrix, type ProjectMatrix, type MajorMatrixData } from "./matrix-api"
import { ResourceApi, type FileData, type CourseResourceData, type ScoringData } from "./resource-api"
import { ConfigApi, type ThemeConfig } from "./config-api"
import { PreferenceApi, type UserPreference } from "./preference-api"
import { TeachingTaskApi } from "./teaching-task-api"
import { CourseDetailApi, type CombinedCourseDetail, type MajorDetailData } from "./course-detail-api"
import { initializeMockData, resetMockData } from "./data-initializer"

// 创建API实例
export const api = {
  tree: new TreeApi(),
  users: new UserApi(),
  matrices: new MatrixApi(),
  resources: new ResourceApi(),
  config: new ConfigApi(),
  preferences: new PreferenceApi(),
  teachingTasks: new TeachingTaskApi(),
  courseDetail: new CourseDetailApi(),
}

// 导出API类
export { TreeApi, UserApi, MatrixApi, ResourceApi, ConfigApi, PreferenceApi, TeachingTaskApi, CourseDetailApi }

// 导出类型
export type { User, CourseMatrix, ProjectMatrix, MajorMatrixData, FileData, CourseResourceData, ScoringData, ThemeConfig, UserPreference, CombinedCourseDetail, MajorDetailData }
export type { ApiResponse, BackendResponse } from "./types"

// 导出初始化函数
export { initializeMockData, resetMockData }

// 导出响应处理函数
export { handleBackendResponse, createSuccessResponse, createErrorResponse } from "./response-handler"
