/**
 * AddMajorForm容器组件
 * 负责协调所有hooks和业务逻辑,将UI渲染委托给子组件
 */

"use client"

import { useEffect, useRef, useState } from "react"
import type { AddMajorFormProps, WorkCategory, WorksData } from "./types"
import { useMajorFormState } from "@/modules/majors/hooks/use-major-form-state"
import { useCareerInfo } from "@/modules/majors/hooks/use-career-info"
import { useGraduationRequirements } from "@/modules/majors/hooks/use-graduation-requirements"
import { useToast } from "@/shared/hooks/use-toast"
import { api } from "@/lib/api"
import { TreeApi } from "@/lib/api/tree-api"
import { majorApiService, type CreateMajorRequest } from "@/modules/majors/api"
import type { IndicatorCourseSupport } from "@/modules/majors/types"
import worksJsonData from "@/mock-data/works.json"

// 创建 TreeApi 实例
const treeApiInstance = new TreeApi()

// 导入原始组件的UI部分 - 这里暂时保留原始渲染逻辑
// 后续可以继续拆分为更小的展示组件
import { AddMajorFormView } from "./AddMajorFormView"

interface MajorDetailProfessionItem {
  name?: string
}

interface MajorDetailProfessionVO {
  id?: number
  profession?: MajorDetailProfessionItem[]
  task?: string
}

interface MajorDetailRequireChild {
  id: number
  description?: string
}

interface MajorDetailRequireVO {
  id: number
  description?: string
  children?: MajorDetailRequireChild[]
}

interface MajorDetailResponse {
  majorClass?: string
  code?: string
  majorLevel?: string
  feature?: string
  demandType?: string
  demandArea?: string
  position?: string
  professionsVOS?: MajorDetailProfessionVO[]
  requiresVOS?: MajorDetailRequireVO[]
}

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

  // 加载状态
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const hasLoadedDetailRef = useRef(false)
  const {
    setMajorCode,
    setMajorLevel,
    setEducationalFeatures,
    setDemandStatus,
    setSelectedProvince,
    setPosition,
  } = formState
  const { setCareerInfoList } = careerInfo
  const { setGraduationRequirements, setIndicatorCourseSupports } = graduationReqs

  // 编辑模式下加载专业详情
  useEffect(() => {
    const majorId = initialData?.id || initialData?.nodeId
    if (!isEditMode || !majorId || hasLoadedDetailRef.current) return

    hasLoadedDetailRef.current = true

    // 从真实 API 加载完整矩阵数据，构建 indicatorCourseSupports
    const loadIndicatorCourseSupportsFromApi = async (majorId: string, requiresVOS: MajorDetailRequireVO[]) => {
      try {
        const cleanMajorId = majorId.replace("major_", "")

        // 1. 一次性获取该专业下所有课程的矩阵数据
        const response = await api.matrices.getMajorMatrixAll(cleanMajorId)
        const groups = response.data || []
        if (groups.length === 0) return

        // 2. 从 requiresVOS 构建 graduateRequireId -> supportKey 映射
        const idToKeyMap: Record<number, string> = {}
        requiresVOS.forEach((req) => {
          req.children?.forEach((child, idx: number) => {
            idToKeyMap[child.id] = `${String(req.id)}-${idx}`
          })
        })

        // 3. 构建 indicatorCourseSupports
        const supports: Record<string, IndicatorCourseSupport[]> = {}
        for (const group of groups) {
          for (const item of group.matrixItems) {
            const supportKey = idToKeyMap[item.graduateRequireId]
            if (!supportKey) continue
            if (!supports[supportKey]) {
              supports[supportKey] = []
            }
            supports[supportKey].push({
              courseId: String(group.courseId),
              courseName: group.courseName,
              supportLevel: item.relate === 0 ? "strong" : "weak",
            })
          }
        }

        setIndicatorCourseSupports(supports)
      } catch (error) {
        console.error("加载指标点课程支撑关系失败:", error)
      }
    }

    const loadMajorDetail = async () => {
      setIsLoadingDetail(true)
      try {
        const response = await treeApiInstance.getMajorDetail(majorId)
        if (response.data) {
          const detailData = response.data as MajorDetailResponse

          // 更新基础表单状态
          if (detailData.majorClass || detailData.code) {
            setMajorCode(detailData.majorClass || detailData.code || "")
          }
          if (detailData.majorLevel) {
            setMajorLevel(detailData.majorLevel)
          }
          if (detailData.feature) {
            setEducationalFeatures(detailData.feature)
          }
          if (detailData.demandType) {
            setDemandStatus(detailData.demandType)
          }
          if (detailData.demandArea) {
            setSelectedProvince(detailData.demandArea)
          }
          if (detailData.position) {
            setPosition(detailData.position)
          }

          // 更新职业信息
          if (detailData.professionsVOS && detailData.professionsVOS.length > 0) {
            const careerInfoList = detailData.professionsVOS.map((professionVO, index: number) => ({
              id: String(professionVO.id || index + 1),
              level: "中级",
              direction: {
                category1: professionVO.profession?.[0]?.name || "",
                category2: professionVO.profession?.[1]?.name || "",
                category3: professionVO.profession?.[2]?.name || "",
                category4: professionVO.profession?.[3]?.name || "",
              },
              tasks: professionVO.task || "",
            }))
            setCareerInfoList(careerInfoList)
          }

          // 更新毕业要求
          if (detailData.requiresVOS && detailData.requiresVOS.length > 0) {
            const graduationRequirements = detailData.requiresVOS.map((requireVO) => ({
              id: String(requireVO.id),
              content: requireVO.description || "",
              indicators: requireVO.children?.map((child) => child.description || "") || [""],
            }))
            setGraduationRequirements(graduationRequirements)
          }

          // 异步加载课程列表和矩阵数据，构建 indicatorCourseSupports
          loadIndicatorCourseSupportsFromApi(majorId, detailData.requiresVOS || [])
        }
      } catch (error) {
        console.error("加载专业详情失败:", error)
      } finally {
        setIsLoadingDetail(false)
      }
    }

    loadMajorDetail()
  }, [
    isEditMode,
    initialData?.id,
    initialData?.nodeId,
    setCareerInfoList,
    setDemandStatus,
    setEducationalFeatures,
    setGraduationRequirements,
    setIndicatorCourseSupports,
    setMajorCode,
    setMajorLevel,
    setPosition,
    setSelectedProvince,
  ])

  // 保存 handleSubmit 函数引用，供自动保存使用
  const handleSubmitRef = useRef<((isAutoSave?: boolean) => Promise<void>) | null>(null)

  // 编辑模式下自动保存（每10秒调用一次保存）
  useEffect(() => {
    if (!isEditMode || !initialData?.id) return

    const autoSaveInterval = setInterval(() => {
      // 调用保存函数（静默模式，不退出编辑）
      if (handleSubmitRef.current) {
        handleSubmitRef.current(true)
      }
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditMode, initialData?.id])

  // 表单提交逻辑
  // isAutoSave: 是否为自动保存，自动保存时不退出编辑模式
  const handleSubmit = async (isAutoSave = false) => {
    // 自动保存时使用静默加载状态
    if (!isAutoSave) {
      formState.setIsLoading(true)
    } else {
      formState.setAutoSaveStatus("saving")
    }

    if (
      !formState.majorCode.trim() ||
      !formState.majorName.trim() ||
      !formState.educationalFeatures.trim()
    ) {
      // 自动保存时静默失败，不显示 toast
      if (!isAutoSave) {
        toast({
          variant: "destructive",
          title: "表单验证失败",
          description: "请完整填写表单内容",
          duration: 5000,
        })
        formState.setIsLoading(false)
      } else {
        formState.setAutoSaveStatus("failed")
        setTimeout(() => formState.setAutoSaveStatus(""), 3000)
      }
      return
    }

    // 将 careerInfoList 转换为 professionsVOS 格式
    const professionsVOS = careerInfo.careerInfoList.map((careerInfoItem, index) => {
      const profession = []

      if (careerInfoItem.direction.category1) {
        const cat1 = worksData.find((item: WorkCategory) => item.label === careerInfoItem.direction.category1)
        if (cat1) {
          profession.push({
            id: parseInt(cat1.value) || index * 1000 + 1,
            level: 0,
            code: cat1.value,
            name: cat1.label,
          })

          if (careerInfoItem.direction.category2) {
            const cat2 = cat1.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category2)
            if (cat2) {
              profession.push({
                id: parseInt(cat2.value.replace(/-/g, "")) || index * 1000 + 2,
                level: 1,
                code: cat2.value,
                name: cat2.label,
              })

              if (careerInfoItem.direction.category3) {
                const cat3 = cat2.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category3)
                if (cat3) {
                  profession.push({
                    id: parseInt(cat3.value.replace(/-/g, "")) || index * 1000 + 3,
                    level: 2,
                    code: cat3.value,
                    name: cat3.label,
                  })

                  if (careerInfoItem.direction.category4) {
                    const cat4 = cat3.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category4)
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
        children: [] as CreateMajorRequest["requiresVOS"][number]["children"][number]["children"],
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

    // 编辑模式下调用更新专业接口
    if (isEditMode && initialData?.id) {
      try {
        // 构造 API 请求参数
        const majorId = initialData.id.replace("major_", "")
        const apiRequestData = {
          id: parseInt(majorId) || 0,
          departmentId: parseInt(effectiveDepartmentId) || 0,
          name: formState.majorName,
          keyword: formState.majorCode,
          majorLevel: formState.majorLevel,
          majorClass: formState.majorCode,
          feature: formState.educationalFeatures,
          careerLevel: "",
          demandType: formState.demandStatus,
          demandArea: formState.selectedProvince,
          position: formState.position,
          requiresVOS: requiresVOS,
          upload: false,
          professionsVOS: professionsVOS.map((p) => ({
            id: p.id,
            majorId: parseInt(majorId) || 0,
            task: p.task,
            lang: 0,
          })),
        }

        const response = await majorApiService.createMajor(apiRequestData)

        if (response.status === 200 || response.data) {
          if (isAutoSave) {
            // 自动保存成功：更新状态，不退出编辑模式
            formState.setAutoSaveStatus("saved")
            setTimeout(() => formState.setAutoSaveStatus(""), 3000)
          } else {
            // 手动保存成功：显示 toast，退出编辑模式
            toast({
              variant: "success",
              title: "保存成功",
              description: "专业信息已成功更新",
              duration: 3000,
            })
            onSubmit(majorData)
          }
        } else {
          if (isAutoSave) {
            formState.setAutoSaveStatus("failed")
            setTimeout(() => formState.setAutoSaveStatus(""), 3000)
          } else {
            toast({
              variant: "destructive",
              title: "保存失败",
              description: response.error || "更新专业信息失败，请重试",
              duration: 5000,
            })
          }
        }
      } catch (error) {
        console.error("更新专业失败:", error)
        if (isAutoSave) {
          formState.setAutoSaveStatus("failed")
          setTimeout(() => formState.setAutoSaveStatus(""), 3000)
        } else {
          toast({
            variant: "destructive",
            title: "保存失败",
            description: "更新专业信息失败，请重试",
            duration: 5000,
          })
        }
      } finally {
        if (!isAutoSave) {
          formState.setIsLoading(false)
        }
      }
      return
    }

    // 新建模式直接调用回调（新建模式不支持自动保存）
    toast({
      variant: "success",
      title: "保存成功",
      description: "专业信息已成功保存",
      duration: 3000,
    })
    onSubmit(majorData)
    formState.setIsLoading(false)
  }

  // 更新 handleSubmit 引用，供自动保存使用
  handleSubmitRef.current = handleSubmit

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
      isLoadingDetail={isLoadingDetail}
    />
  )
}
