/**
 * Majors 模块 API 统一导出
 */

// 新的 API Service（推荐使用，带缓存）
export { majorApiService, type CreateMajorRequest } from "./MajorApiService"

// 旧的 API 对象（向后兼容，保留以避免破坏现有代码）
export { majorCoursesApi } from "./majorCoursesApi"
export { majorPreferencesApi } from "./majorPreferencesApi"
export { majorUsersApi } from "./majorUsersApi"
