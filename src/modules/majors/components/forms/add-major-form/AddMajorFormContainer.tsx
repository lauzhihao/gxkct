/**
 * AddMajorForm容器组件
 * 负责协调所有hooks和业务逻辑,将UI渲染委托给子组件
 */

"use client"

import { useEffect, useMemo } from "react"
import type { AddMajorFormProps } from "./types"
import { useMajorFormState } from "@/modules/majors/hooks/use-major-form-state"
import { useCareerInfo } from "@/modules/majors/hooks/use-career-info"
import { useGraduationRequirements } from "@/modules/majors/hooks/use-graduation-requirements"
import { useToast } from "@/shared/hooks/use-toast"
import { api } from "@/lib/api"
import worksJsonData from "@/mock-data/works.json"
import type { WorksData } from "./types"

// 导入原始组件的UI部分 - 这里暂时保留原始渲染逻辑
// 后续可以继续拆分为更小的展示组件
import { AddMajorFormView } from "./AddMajorFormView"

export function AddMajorFormContainer({
  departmentId,
  onCancel,
  onSubmit,
  initialData,
  isEditMode = false,
}: AddMajorFormProps) {
  const { toast } = useToast()
  const worksData = (worksJsonData as WorksData).data || []

  // 如果是编辑模式且initialData中有parentId，则使用它；否则使用传入的departmentId
  const effectiveDepartmentId =
    isEditMode && initialData?.parentId ? initialData.parentId.replace("dept_", "") : departmentId

  // 使用表单状态管理hook
  const formState = useMajorFormState(initialData)

  // 使用职业信息管理hook
  const careerInfo = useCareerInfo(initialData, worksData)

  // 使用毕业要求管理hook
  const graduationReqs = useGraduationRequirements(
    initialData,
    isEditMode,
    formState.lastRequirementRef,
    formState.lastIndicatorRefs
  )

  // 自动保存指标点与课程的支撑关系
  useEffect(() => {
    // 使用 initialData.id 作为 majorId
    const majorId = initialData?.id
    if (!isEditMode || !majorId || graduationReqs.isCourseSelectorOpenRef) return

    const autoSaveInterval = setInterval(() => {
      const snapshot = graduationReqs.indicatorCoursesSnapshotRef.current

      Promise.resolve().then(async () => {
        try {
          formState.setAutoSaveStatus("saving")
          await api.matrices.updateMajorIndicatorCourseSupports(majorId, snapshot)
          formState.setAutoSaveStatus("saved")
          setTimeout(() => formState.setAutoSaveStatus(""), 3000)
        } catch (error) {
          console.error("自动保存指标点课程支撑关系失败:", error)
          formState.setAutoSaveStatus("failed")
          setTimeout(() => formState.setAutoSaveStatus(""), 3000)
        }
      })
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditMode, initialData?.id, graduationReqs.isCourseSelectorOpenRef])

  // 表单提交逻辑
  const handleSubmit = () => {
    formState.setIsLoading(true)

    if (
      !formState.majorCode.trim() ||
      !formState.majorName.trim() ||
      !formState.educationalFeatures.trim()
    ) {
      toast({
        variant: "destructive",
        title: "表单验证失败",
        description: "请完整填写表单内容",
        duration: 5000,
      })
      formState.setIsLoading(false)
      return
    }

    // 将 careerInfoList 转换为 professionsVOS 格式
    const professionsVOS = careerInfo.careerInfoList.map((careerInfoItem, index) => {
      const profession = []

      if (careerInfoItem.direction.category1) {
        const cat1 = worksData.find((item) => item.label === careerInfoItem.direction.category1)
        if (cat1) {
          profession.push({
            id: parseInt(cat1.value) || index * 1000 + 1,
            level: 0,
            code: cat1.value,
            name: cat1.label,
          })

          if (careerInfoItem.direction.category2) {
            const cat2 = cat1.children?.find((item) => item.label === careerInfoItem.direction.category2)
            if (cat2) {
              profession.push({
                id: parseInt(cat2.value.replace(/-/g, "")) || index * 1000 + 2,
                level: 1,
                code: cat2.value,
                name: cat2.label,
              })

              if (careerInfoItem.direction.category3) {
                const cat3 = cat2.children?.find((item) => item.label === careerInfoItem.direction.category3)
                if (cat3) {
                  profession.push({
                    id: parseInt(cat3.value.replace(/-/g, "")) || index * 1000 + 3,
                    level: 2,
                    code: cat3.value,
                    name: cat3.label,
                  })

                  if (careerInfoItem.direction.category4) {
                    const cat4 = cat3.children?.find((item) => item.label === careerInfoItem.direction.category4)
                    if (cat4) {
                      profession.push({
                        id: parseInt(cat4.value.replace(/-/g, "")) || index * 1000 + 4,
                        level: 3,
                        code: cat4.value,
                        name: cat4.label,
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }

      return {
        id: parseInt(careerInfoItem.id) || index + 1,
        profession: profession,
        task: careerInfoItem.tasks,
      }
    })

    // 将 graduationRequirements 转换为 requiresVOS 格式
    const requiresVOS = graduationReqs.graduationRequirements.map((requirement, index) => ({
      id: parseInt(requirement.id) || index + 1,
      description: requirement.content,
      children: requirement.indicators.map((indicator, indIndex) => ({
        id: parseInt(requirement.id) * 1000 + indIndex + 1,
        description: indicator,
        children: null,
      })),
    }))

    const majorData = {
      name: formState.majorName,
      type: "major" as const,
      metadata: {
        code: formState.majorCode,
        majorClass: formState.majorCode,
        majorLevel: formState.majorLevel,
        feature: formState.educationalFeatures,
        demandStatus: formState.demandStatus,
        selectedProvince: formState.selectedProvince,
        position: formState.position,
        professionsVOS: professionsVOS,
        requiresVOS: requiresVOS,
      },
      children: initialData?.children || [],
    }

    toast({
      variant: "success",
      title: "保存成功",
      description: isEditMode ? "专业信息已成功更新" : "专业信息已成功保存",
      duration: 3000,
    })
    onSubmit(majorData)
    formState.setIsLoading(false)
  }

  return (
    <AddMajorFormView
      isEditMode={isEditMode}
      effectiveDepartmentId={effectiveDepartmentId}
      initialData={initialData}
      formState={formState}
      careerInfo={careerInfo}
      graduationReqs={graduationReqs}
      worksData={worksData}
      onCancel={onCancel}
      handleSubmit={handleSubmit}
      toast={toast}
    />
  )
}
