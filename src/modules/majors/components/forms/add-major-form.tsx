/**
 * AddMajorForm 主入口
 * 重构后的组件，使用hooks进行状态管理
 *
 * 重构内容：
 * - 状态管理抽取到 use-major-form-state.ts
 * - 职业信息逻辑抽取到 use-career-info.ts
 * - 毕业要求逻辑抽取到 use-graduation-requirements.ts
 * - 容器组件协调所有hooks
 */

export { AddMajorFormContainer as AddMajorForm } from "./add-major-form/AddMajorFormContainer"
export type { AddMajorFormProps } from "@/modules/majors/types"
