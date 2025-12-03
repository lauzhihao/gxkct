import { TreeApi } from "./tree-api"
import { UserApi, type User } from "./user-api"
import { MatrixApi, type CourseMatrix, type ProjectMatrix, type MajorMatrixData, type CourseMatrixItem, type CourseMatrixResponse } from "./matrix-api"
import {
  ResourceApi,
  type ResourceFolder,
  type ResourceObjectSummary,
  type ResourceObjectDetail,
  type ResourceObjectsResponse,
  type ResourcePagination,
  type ResourceBatchActionRequest,
  type ResourceBatchActionResult,
  type InitializeFoldersResponse,
  type ListResourceObjectsParams,
  type CreateFolderPayload,
  type UploadSignatureRequest,
  type UploadSignatureResponse,
  type ConfirmUploadRequest,
} from "./resource-api"
import { ConfigApi, type ThemeConfig } from "./config-api"
import { PreferenceApi, type UserPreference } from "./preference-api"
import { TeachingTaskApi } from "./teaching-task-api"
import { CourseDetailApi, type CombinedCourseDetail, type MajorDetailData } from "./course-detail-api"
import { OccupationApi, type OccupationBookData } from "./occupation-api"
import { CourseGoalsApi, type CourseGoal } from "./course-goals-api"
import { CoursePointsApi, type CoursePoint } from "./course-points-api"
import { ProjectTeachGoalApi, type ProjectTeachGoalData, type Project, type ProjectTeachGoal } from "./project-teach-goal-api"
import { initializeMockData, resetMockData } from "./data-initializer"
import { getApiConfig, buildApiUrl, type ApiConfig } from "./config"
import { StorageAdapter } from "./storage-adapter"
import {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
  getStoredAuthUser,
  setStoredAuthUser,
  clearStoredAuthUser,
  isAuthenticated,
  getCurrentUserId,
  clearAllAuthData,
  type AuthUser,
  type AuthResponse,
} from "./auth-config"

// 创建API实例
const storageAdapter = new StorageAdapter()
export const api = {
  tree: new TreeApi(),
  users: new UserApi(),
  matrices: new MatrixApi(),
  resources: new ResourceApi(),
  config: new ConfigApi(),
  preferences: new PreferenceApi(),
  teachingTasks: new TeachingTaskApi(),
  courseDetail: new CourseDetailApi(),
  occupation: new OccupationApi(),
  courseGoals: new CourseGoalsApi(),
  coursePoints: new CoursePointsApi(storageAdapter),
  projectTeachGoal: new ProjectTeachGoalApi(),
}

// 导出API类
export { TreeApi, UserApi, MatrixApi, ResourceApi, ConfigApi, PreferenceApi, TeachingTaskApi, CourseDetailApi, OccupationApi }

// 导出类型
export type {
  User,
  CourseMatrix,
  ProjectMatrix,
  MajorMatrixData,
  CourseMatrixItem,
  CourseMatrixResponse,
  ResourceFolder,
  ResourceObjectSummary,
  ResourceObjectDetail,
  ResourceObjectsResponse,
  ResourcePagination,
  ResourceBatchActionRequest,
  ResourceBatchActionResult,
  InitializeFoldersResponse,
  ListResourceObjectsParams,
  CreateFolderPayload,
  UploadSignatureRequest,
  UploadSignatureResponse,
  ConfirmUploadRequest,
  ThemeConfig,
  UserPreference,
  CombinedCourseDetail,
  MajorDetailData,
  OccupationBookData,
  CoursePoint,
  ProjectTeachGoalData,
  Project,
  ProjectTeachGoal,
}
export type { ApiResponse, BackendResponse } from "./types"

// 导出初始化函数
export { initializeMockData, resetMockData }

// 导出响应处理函数
export { handleBackendResponse, createSuccessResponse, createErrorResponse } from "./response-handler"

// 导出API配置函数
export { getApiConfig, buildApiUrl }
export type { ApiConfig }

// 导出认证相关函数
export {
  getStoredAuthToken,
  setStoredAuthToken,
  clearStoredAuthToken,
  getStoredAuthUser,
  setStoredAuthUser,
  clearStoredAuthUser,
  isAuthenticated,
  getCurrentUserId,
  clearAllAuthData,
}
export type { AuthUser, AuthResponse }
