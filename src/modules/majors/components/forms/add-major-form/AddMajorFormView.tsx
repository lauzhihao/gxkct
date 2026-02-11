/**
 * AddMajorForm View组件
 * 重构后的视图组件，组合所有Section子组件
 */

"use client"

import { Card } from "@/shared/components/ui/card"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { FormHeader } from "./FormHeader"
import {
  MajorBasicInfoSection,
  CareerInfoSection,
  CareerTrainingSection,
  GraduationRequirementsSection,
} from "./sections"
import type { UseMajorFormStateResult } from "@/modules/majors/hooks/use-major-form-state"
import type { UseCareerInfoResult } from "@/modules/majors/hooks/use-career-info"
import type { UseGraduationRequirementsResult } from "@/modules/majors/hooks/use-graduation-requirements"
import type { WorkCategory } from "./types"

interface AddMajorFormViewProps {
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
  isLoadingDetail?: boolean
}

export function AddMajorFormView({
  isEditMode,
  effectiveDepartmentId,
  initialData,
  formState,
  careerInfo,
  graduationReqs,
  worksData,
  onCancel,
  handleSubmit,
  toast,
  isLoadingDetail = false,
}: AddMajorFormViewProps) {
  // 加载专业详情时显示加载状态
  if (isLoadingDetail) {
    return (
      <div className="py-20">
        <LoadingState title="正在加载专业详情..." className="py-12" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 表单头部 */}
      <FormHeader
        isEditMode={isEditMode}
        isLoading={formState.isLoading}
        autoSaveStatus={formState.autoSaveStatus}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />

      {/* 表单主体 */}
      <Card className="p-6 space-y-6">
        {/* 专业基础信息 */}
        <MajorBasicInfoSection
          majorCode={formState.majorCode}
          majorName={formState.majorName}
          majorLevel={formState.majorLevel}
          educationalFeatures={formState.educationalFeatures}
          setMajorCode={formState.setMajorCode}
          setMajorName={formState.setMajorName}
          setMajorLevel={formState.setMajorLevel}
          setEducationalFeatures={formState.setEducationalFeatures}
        />

        {/* 职业信息 */}
        <CareerInfoSection careerInfo={careerInfo} worksData={worksData} />

        {/* 职业培养信息 */}
        <CareerTrainingSection
          demandStatus={formState.demandStatus}
          selectedProvince={formState.selectedProvince}
          provinceSearch={formState.provinceSearch}
          provincePopoverOpen={formState.provincePopoverOpen}
          position={formState.position}
          setDemandStatus={formState.setDemandStatus}
          setSelectedProvince={formState.setSelectedProvince}
          setProvinceSearch={formState.setProvinceSearch}
          setProvincePopoverOpen={formState.setProvincePopoverOpen}
          setPosition={formState.setPosition}
        />

        {/* 毕业要求 */}
        <GraduationRequirementsSection
          graduationReqs={graduationReqs}
          formState={{
            uploadedFile: formState.uploadedFile,
            setUploadedFile: formState.setUploadedFile,
            focusedRequirementId: formState.focusedRequirementId,
            setFocusedRequirementId: formState.setFocusedRequirementId,
            focusedIndicatorKey: formState.focusedIndicatorKey,
            setFocusedIndicatorKey: formState.setFocusedIndicatorKey,
            lastRequirementRef: formState.lastRequirementRef,
            lastIndicatorRefs: formState.lastIndicatorRefs,
          }}
          isEditMode={isEditMode}
          majorName={formState.majorName}
          majorId={initialData?.id}
          departmentId={effectiveDepartmentId}
          toast={toast}
        />
      </Card>

      {/* 表单底部按钮 */}
      <FormHeader
        isEditMode={isEditMode}
        isLoading={formState.isLoading}
        autoSaveStatus={formState.autoSaveStatus}
        onCancel={onCancel}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
