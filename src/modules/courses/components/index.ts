/**
 * Courses 模块组件统一导出
 */

// 课程详情面板
export { CourseDetail } from "./course-detail-panel"

// 课程基础展示组件
export { CourseBasicInfo } from "./course/course-basic-info"
export { CoursePoints } from "./course/course-points"
export { CourseChapters } from "./course/course-chapters"
export { CourseTeachingObjectives } from "./course/course-teaching-objectives"

// 矩阵相关组件
export { CourseMajorMatrix } from "./course/matrix/course-major-matrix"
export { CourseMatrix } from "./course/matrix/course-matrix"
export { CourseProjectMatrix } from "./course/matrix/course-project-matrix"
export { CourseThreeLevelMatrix } from "./course/matrix/course-three-level-matrix"

// 资源管理
export { CourseResources } from "./course/resources/course-resources"

// 督导相关
export { CourseSupervision } from "./course/supervision/course-supervision"
export { CourseSupervisionDetail } from "./course/supervision/course-supervision-detail"

// 对话框组件
export { TaskObjectivesDialog } from "./dialogs/task-objectives-dialog"
export { KsaDialog } from "./dialogs/ksa-dialog"
export { CoursePointManagerDialog } from "./dialogs/course-point-manager-dialog"
export { CoursePointSelectionDialog } from "./dialogs/course-point-selection-dialog"
export { CourseResourcePickerDialog } from "./dialogs/course-resource-picker-dialog"

// 共享组件
export { TeachingObjectivesEditor } from "./shared/teaching-objectives-editor"
