/**
 * Majors模块组件Props类型定义
 */

import type { UseMajorFormStateResult } from "../hooks/use-major-form-state"
import type { UseCareerInfoResult } from "../hooks/use-career-info"
import type { UseGraduationRequirementsResult } from "../hooks/use-graduation-requirements"
import type { WorkCategory } from "./models"

// AddMajorForm主组件Props
export interface AddMajorFormProps {
  departmentId: string
  onCancel: () => void
  onSubmit: (majorData: any) => void
  initialData?: any
  isEditMode?: boolean
}

// AddMajorFormView组件Props
export interface AddMajorFormViewProps {
  isEditMode: boolean
  effectiveDepartmentId: string
  initialData?: any
  formState: UseMajorFormStateResult
  careerInfo: UseCareerInfoResult
  graduationReqs: UseGraduationRequirementsResult
  worksData: WorkCategory[]
  onCancel: () => void
  handleSubmit: () => void
  toast: any
}

// FormHeader组件Props
export interface FormHeaderProps {
  isEditMode: boolean
  isLoading: boolean
  autoSaveStatus: "" | "saving" | "saved" | "failed"
  onCancel: () => void
  onSubmit: () => void
}

// MajorBasicInfoSection组件Props
export interface MajorBasicInfoSectionProps {
  majorCode: string
  majorName: string
  majorLevel: string
  educationalFeatures: string
  setMajorCode: (value: string) => void
  setMajorName: (value: string) => void
  setMajorLevel: (value: string) => void
  setEducationalFeatures: (value: string) => void
}

// CareerInfoSection组件Props
export interface CareerInfoSectionProps {
  careerInfo: UseCareerInfoResult
  worksData: WorkCategory[]
}

// CareerTrainingSection组件Props
export interface CareerTrainingSectionProps {
  demandStatus: string
  selectedProvince: string
  provinceSearch: string
  provincePopoverOpen: boolean
  position: string
  setDemandStatus: (value: string) => void
  setSelectedProvince: (value: string) => void
  setProvinceSearch: (value: string) => void
  setProvincePopoverOpen: (value: boolean) => void
  setPosition: (value: string) => void
}

// GraduationRequirementsSection组件Props
export interface GraduationRequirementsSectionProps {
  graduationReqs: UseGraduationRequirementsResult
  formState: Pick<
    UseMajorFormStateResult,
    | "uploadedFile"
    | "setUploadedFile"
    | "focusedRequirementId"
    | "setFocusedRequirementId"
    | "focusedIndicatorKey"
    | "setFocusedIndicatorKey"
    | "lastRequirementRef"
    | "lastIndicatorRefs"
  >
  isEditMode: boolean
  majorName: string
  majorId?: string
  departmentId: string
  toast: any
}
