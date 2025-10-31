import { TreeApi } from "./tree-api"
import { UserApi, type User } from "./user-api"
import { MatrixApi, type CourseMatrix, type ProjectMatrix } from "./matrix-api"
import { ResourceApi, type FileData, type CourseResourceData } from "./resource-api"
import { ConfigApi, type ThemeConfig } from "./config-api"
import { PreferenceApi, type UserPreference } from "./preference-api"
import { initializeMockData, resetMockData } from "./data-initializer"

// 创建API实例
export const api = {
  tree: new TreeApi(),
  users: new UserApi(),
  matrices: new MatrixApi(),
  resources: new ResourceApi(),
  config: new ConfigApi(),
  preferences: new PreferenceApi(),
}

// 导出API类
export { TreeApi, UserApi, MatrixApi, ResourceApi, ConfigApi, PreferenceApi }

// 导出类型
export type { User, CourseMatrix, ProjectMatrix, FileData, CourseResourceData, ThemeConfig, UserPreference }

// 导出初始化函数
export { initializeMockData, resetMockData }
