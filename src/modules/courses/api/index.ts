/**
 * Courses 模块 API 统一导出
 */

// 新的 API Service（推荐使用，带缓存）
export { courseApiService } from "./CourseApiService"

// 旧的 API 对象（向后兼容，保留以避免破坏现有代码）
export { courseDetailApi } from "./courseDetailApi"
export { courseGoalsApi } from "./courseGoalsApi"
export { courseMatrixApi } from "./courseMatrixApi"
export { coursePointsApi } from "./coursePointsApi"
export { courseResourcesApi } from "./courseResourcesApi"
export { courseTeachingTasksApi } from "./courseTeachingTasksApi"
export { projectMatrixApi } from "./projectMatrixApi"
export { projectTeachGoalApi } from "./projectTeachGoalApi"
