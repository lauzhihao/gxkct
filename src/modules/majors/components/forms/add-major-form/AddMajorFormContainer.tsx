/**
 * AddMajorForm容器组件
 * 负责协调所有hooks和业务逻辑,将UI渲染委托给子组件
 */

"use client"

import { useEffect, useRef, useState } from "react"
import type { AddMajorFormProps, WorkCategory, WorksData } from "./types"
import { useMajorFormState, type UseMajorFormStateResult } from "@/modules/majors/hooks/use-major-form-state"
import { useCareerInfo } from "@/modules/majors/hooks/use-career-info"
import { useGraduationRequirements } from "@/modules/majors/hooks/use-graduation-requirements"
import { useToast } from "@/shared/hooks/use-toast"
import { extractNumericId } from "@/shared/utils/utils"
import { api } from "@/lib/api"
import { TreeApi } from "@/lib/api/tree-api"
import { majorApiService, type CreateMajorRequest } from "@/modules/majors/api"
import type { IndicatorCourseSupport } from "@/modules/majors/types"
import type {
  MajorBasicInfoErrors,
  MajorBasicInfoField,
} from "@/modules/majors/types/components"
import worksJsonData from "@/mock-data/works.json"

// 创建 TreeApi 实例
const treeApiInstance = new TreeApi()

// 导入原始组件的UI部分 - 这里暂时保留原始渲染逻辑
// 后续可以继续拆分为更小的展示组件
import { AddMajorFormView } from "./AddMajorFormView"

interface MajorDetailProfessionItem {
  name?: string
  code?: string
}

interface MajorDetailProfessionVO {
  id?: number
  profession?: MajorDetailProfessionItem[]
  task?: string
}

interface ProfessionPayloadSnapshot {
  id: number
  code: string
  task: string
  lang: number
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

type MajorBasicInfoValues = Pick<UseMajorFormStateResult, MajorBasicInfoField>

const MAJOR_BASIC_INFO_FIELD_ORDER = [
  "majorCode",
  "majorName",
  "majorLevel",
  "educationalFeatures",
] as const satisfies readonly MajorBasicInfoField[]

const VALID_MAJOR_LEVELS: ReadonlySet<string> = new Set(["0", "1", "2"])

const getMajorBasicInfoFieldError = (
  field: MajorBasicInfoField,
  value: string
): string | undefined => {
  switch (field) {
    case "majorCode":
      return value.trim() === "" ? "请输入专业类别" : undefined
    case "majorName":
      return value.trim() === "" ? "请输入专业名称" : undefined
    case "majorLevel":
      if (value.trim() === "") {
        return "请选择专业层次"
      }
      return VALID_MAJOR_LEVELS.has(value) ? undefined : "专业层次数据无效，请重新选择"
    case "educationalFeatures":
      return value.trim() === "" ? "请输入专业特色" : undefined
  }
}

const validateMajorBasicInfo = (values: MajorBasicInfoValues): MajorBasicInfoErrors => {
  const errors: MajorBasicInfoErrors = {}

  for (const field of MAJOR_BASIC_INFO_FIELD_ORDER) {
    const error = getMajorBasicInfoFieldError(field, values[field])
    if (error !== undefined) {
      errors[field] = error
    }
  }

  return errors
}

const getFirstInvalidBasicInfoField = (
  errors: MajorBasicInfoErrors
): MajorBasicInfoField | null => {
  for (const field of MAJOR_BASIC_INFO_FIELD_ORDER) {
    if (errors[field] !== undefined) {
      return field
    }
  }

  return null
}

export function AddMajorFormContainer({
  departmentId,
  onCancel,
  onSubmit,
  initialData,
  isEditMode = false,
}: AddMajorFormProps) {
  const { toast } = useToast()
  const worksData = (worksJsonData as WorksData).data ?? []

  const toInteger = (value: string): number | null => {
    const parsed = Number.parseInt(value, 10)
    if (Number.isNaN(parsed)) {
      return null
    }
    return parsed
  }

  const toPositiveInteger = (value: string): number | null => {
    const parsed = toInteger(value)
    if (parsed === null || parsed <= 0) {
      return null
    }
    return parsed
  }

  const parsePersistedEntityId = (value: string): number => {
    if (!/^\d+$/.test(value)) {
      return 0
    }
    const parsed = Number.parseInt(value, 10)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return 0
    }
    return parsed
  }

  const normalizeDepartmentId = (value: string | undefined): string => {
    if (typeof value !== "string") {
      return ""
    }
    const parsed = extractNumericId(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return ""
    }
    return String(parsed)
  }

  // 编辑模式下优先使用节点 parentId；若不可解析则回退到外层传入 departmentId
  const normalizedParentDepartmentId = isEditMode ? normalizeDepartmentId(initialData?.parentId) : ""
  const normalizedPropDepartmentId = normalizeDepartmentId(departmentId)
  const effectiveDepartmentId = normalizedParentDepartmentId !== "" ? normalizedParentDepartmentId : normalizedPropDepartmentId

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
  const [hasUploadedRequirements, setHasUploadedRequirements] = useState(false)
  const [initialProfessionSnapshots, setInitialProfessionSnapshots] = useState<ProfessionPayloadSnapshot[]>([])
  const [basicInfoErrors, setBasicInfoErrors] = useState<MajorBasicInfoErrors>({})
  const [basicInfoValidationAttempt, setBasicInfoValidationAttempt] = useState(0)
  const [basicInfoFocusField, setBasicInfoFocusField] = useState<MajorBasicInfoField | null>(null)
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
  const { setGraduationRequirements, setIndicatorCourseSupports, clearDeletedNodeIds } = graduationReqs

  const handleBasicInfoFieldValidationChange = (
    field: MajorBasicInfoField,
    value: string
  ) => {
    if (basicInfoValidationAttempt === 0) {
      return
    }

    const error = getMajorBasicInfoFieldError(field, value)
    setBasicInfoErrors((currentErrors) => {
      if (error === undefined) {
        if (currentErrors[field] === undefined) {
          return currentErrors
        }

        const nextErrors = { ...currentErrors }
        delete nextErrors[field]
        return nextErrors
      }

      if (currentErrors[field] === error) {
        return currentErrors
      }

      return {
        ...currentErrors,
        [field]: error,
      }
    })
  }

  const downloadBlobFile = (blob: Blob, filename: string) => {
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.style.display = "none"
    anchor.href = objectUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(objectUrl)
  }

  const resolveCurrentLangCode = (): string => {
    if (typeof window === "undefined") {
      return "80101"
    }

    const storedLang = window.sessionStorage.getItem("lang")
    if (typeof storedLang !== "string" || storedLang.trim() === "") {
      return "80101"
    }

    return storedLang
  }

  const normalizeRequirementRows = (requiresVOS: MajorDetailRequireVO[], source: "detail" | "upload" = "detail") => {
    return requiresVOS.map((requireVO, index) => ({
      id: requireVO.id > 0 ? String(requireVO.id) : `${source}-req-${index}-${Date.now()}`,
      content: requireVO.description ?? "",
      indicators: requireVO.children?.map((child) => child.description ?? "") ?? [""],
      indicatorIds: requireVO.children?.map((child) => child.id) ?? [0],
    }))
  }

  const resolveOccupationCodeFromDirection = (careerInfoItem: { direction: {
    category1: string
    category2: string
    category3: string
    category4: string
  } }): string | null => {
    const { category1, category2, category3, category4 } = careerInfoItem.direction

    if (!category1 || !category2 || !category3 || !category4) {
      return null
    }

    const cat1 = worksData.find((item) => item.label === category1)
    const cat2 = cat1?.children?.find((item) => item.label === category2)
    const cat3 = cat2?.children?.find((item) => item.label === category3)
    const cat4 = cat3?.children?.find((item) => item.label === category4)

    if (typeof cat4?.value !== "string" || cat4.value.trim() === "") {
      return null
    }

    return cat4.value
  }

  const handleDownloadGraduationTemplate = async () => {
    const response = await api.tree.downloadRequireTemplate(resolveCurrentLangCode())
    if (response.error || !response.data) {
      throw new Error(response.error || "下载毕业要求模板失败")
    }

    downloadBlobFile(response.data.blob, response.data.filename)
  }

  const handleUploadGraduationRequirements = async (files: File[]) => {
    const file = files[0]
    if (!file) {
      throw new Error("未选择毕业要求 Excel 文件")
    }

    const rawMajorId = initialData?.id ?? initialData?.nodeId
    if (typeof rawMajorId !== "string") {
      throw new Error("当前为新建专业，需保存后才能上传毕业要求表")
    }

    const normalizedMajorId = extractNumericId(rawMajorId)
    if (!Number.isInteger(normalizedMajorId) || normalizedMajorId <= 0) {
      throw new Error("专业ID无效，无法上传毕业要求表")
    }

    const response = await api.tree.resolveRequires(String(normalizedMajorId), file)
    if (response.error || !response.data) {
      throw new Error(response.error || "上传毕业要求表失败")
    }

    setGraduationRequirements(normalizeRequirementRows(response.data, "upload"))
    setIndicatorCourseSupports({})
    clearDeletedNodeIds()
    formState.setUploadedFile(file)
    setHasUploadedRequirements(true)

    return [file.name]
  }

  // 编辑模式下加载专业详情
  useEffect(() => {
    const majorId = initialData?.id ?? initialData?.nodeId
    if (!isEditMode || !majorId || hasLoadedDetailRef.current) return

    hasLoadedDetailRef.current = true

    // 从真实 API 加载完整矩阵数据，构建 indicatorCourseSupports
    const loadIndicatorCourseSupportsFromApi = async (majorId: string, requiresVOS: MajorDetailRequireVO[]) => {
      try {
        const cleanMajorId = majorId.replace("major_", "")

        // 1. 一次性获取该专业下所有课程的矩阵数据
        const response = await api.matrices.getMajorMatrixAll(cleanMajorId)
        const groups = response.data ?? []
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
            setMajorCode(detailData.majorClass ?? detailData.code ?? "")
          }
          if (typeof detailData.majorLevel === "string") {
            setMajorLevel(detailData.majorLevel)
          } else {
            setMajorLevel("")
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
            const professionSnapshots = detailData.professionsVOS
              .map((professionVO) => {
                const professionCode = professionVO.profession?.[professionVO.profession.length - 1]?.code
                if (
                  typeof professionVO.id !== "number" ||
                  professionVO.id <= 0 ||
                  typeof professionCode !== "string" ||
                  professionCode.trim() === ""
                ) {
                  return null
                }

                return {
                  id: professionVO.id,
                  code: professionCode,
                  task: professionVO.task ?? "",
                  lang: 0,
                }
              })
              .filter((item): item is ProfessionPayloadSnapshot => item !== null)

            setInitialProfessionSnapshots(professionSnapshots)

            const careerInfoList = detailData.professionsVOS.map((professionVO, index: number) => ({
              id: String(professionVO.id ?? index + 1),
              level: "中级",
              direction: {
                category1: professionVO.profession?.[0]?.name ?? "",
                category2: professionVO.profession?.[1]?.name ?? "",
                category3: professionVO.profession?.[2]?.name ?? "",
                category4: professionVO.profession?.[3]?.name ?? "",
              },
              tasks: professionVO.task ?? "",
            }))
            setCareerInfoList(careerInfoList)
          } else {
            setInitialProfessionSnapshots([])
          }

          // 更新毕业要求
          if (detailData.requiresVOS && detailData.requiresVOS.length > 0) {
            setGraduationRequirements(normalizeRequirementRows(detailData.requiresVOS))
            clearDeletedNodeIds()
          }

          // 异步加载课程列表和矩阵数据，构建 indicatorCourseSupports
          loadIndicatorCourseSupportsFromApi(majorId, detailData.requiresVOS ?? [])
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
    clearDeletedNodeIds,
    setGraduationRequirements,
    setIndicatorCourseSupports,
    setMajorCode,
    setMajorLevel,
    setPosition,
    setSelectedProvince,
  ])

  // 表单提交逻辑
  // isAutoSave: 是否为自动保存，自动保存时不退出编辑模式
  const handleSubmit = async (isAutoSave = false) => {
    // 自动保存时使用静默加载状态
    if (!isAutoSave) {
      formState.setIsLoading(true)
    } else {
      formState.setAutoSaveStatus("saving")
    }

    const nextBasicInfoErrors = validateMajorBasicInfo(formState)
    const firstInvalidBasicInfoField = getFirstInvalidBasicInfoField(nextBasicInfoErrors)

    if (firstInvalidBasicInfoField !== null) {
      setBasicInfoErrors(nextBasicInfoErrors)
      setBasicInfoFocusField(firstInvalidBasicInfoField)
      setBasicInfoValidationAttempt((currentAttempt) => currentAttempt + 1)

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

    setBasicInfoErrors({})
    setBasicInfoFocusField(null)

    // 将 careerInfoList 转换为 professionsVOS 格式
    const professionsVOS = careerInfo.careerInfoList.map((careerInfoItem, index) => {
      const profession = []

      if (careerInfoItem.direction.category1) {
        const cat1 = worksData.find((item: WorkCategory) => item.label === careerInfoItem.direction.category1)
        if (cat1) {
          profession.push({
            id: toInteger(cat1.value) ?? index * 1000 + 1,
            level: 0,
            code: cat1.value,
            name: cat1.label,
          })

          if (careerInfoItem.direction.category2) {
            const cat2 = cat1.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category2)
            if (cat2) {
              profession.push({
                id: toInteger(cat2.value.replace(/-/g, "")) ?? index * 1000 + 2,
                level: 1,
                code: cat2.value,
                name: cat2.label,
              })

              if (careerInfoItem.direction.category3) {
                const cat3 = cat2.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category3)
                if (cat3) {
                  profession.push({
                    id: toInteger(cat3.value.replace(/-/g, "")) ?? index * 1000 + 3,
                    level: 2,
                    code: cat3.value,
                    name: cat3.label,
                  })

                  if (careerInfoItem.direction.category4) {
                    const cat4 = cat3.children?.find((item: WorkCategory) => item.label === careerInfoItem.direction.category4)
                    if (cat4) {
                      profession.push({
                        id: toInteger(cat4.value.replace(/-/g, "")) ?? index * 1000 + 4,
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
        id: toInteger(careerInfoItem.id) ?? index + 1,
        profession: profession,
        task: careerInfoItem.tasks,
      }
    })

    // 将 graduationRequirements 转换为 requiresVOS 格式
    const deletedIndicatorMap = new Map<number, number[]>()
    graduationReqs.deletedIndicators.forEach((item) => {
      const current = deletedIndicatorMap.get(item.requirementId)
      if (current) {
        current.push(item.indicatorId)
        return
      }
      deletedIndicatorMap.set(item.requirementId, [item.indicatorId])
    })

    const requiresVOS = graduationReqs.graduationRequirements.map((requirement) => {
      const requirementNumericId = parsePersistedEntityId(requirement.id)
      const deletedChildIds = requirementNumericId > 0 ? deletedIndicatorMap.get(requirementNumericId) ?? [] : []
      return {
        id: requirementNumericId,
        description: requirement.content,
        children: [
          ...requirement.indicators.map((indicator, indIndex) => ({
            id: requirement.indicatorIds[indIndex] > 0 ? requirement.indicatorIds[indIndex] : 0,
            description: indicator,
            children: [] as CreateMajorRequest["requiresVOS"][number]["children"][number]["children"],
          })),
          ...deletedChildIds.map((indicatorId) => ({
            id: -indicatorId,
            description: "",
            children: [] as CreateMajorRequest["requiresVOS"][number]["children"][number]["children"],
          })),
        ],
      }
    })

    const deletedRequiresVOS = graduationReqs.deletedRequirementIds.map((deletedId) => ({
      id: -deletedId,
      description: "",
      children: [] as CreateMajorRequest["requiresVOS"][number]["children"],
    }))

    let mergedRequiresVOS = [...requiresVOS, ...deletedRequiresVOS]
    if (
      mergedRequiresVOS.length === 1
      && mergedRequiresVOS[0]?.id === 0
      && mergedRequiresVOS[0]?.description === ""
      && mergedRequiresVOS[0]?.children.length === 1
      && mergedRequiresVOS[0]?.children[0]?.id === 0
      && mergedRequiresVOS[0]?.children[0]?.description === ""
    ) {
      mergedRequiresVOS = []
    }

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
        requiresVOS: mergedRequiresVOS,
      },
      children: initialData?.children ?? [],
    }

    // 编辑模式下调用更新专业接口
    if (isEditMode && initialData?.id) {
      try {
        // 构造 API 请求参数
        const majorId = initialData.id.replace("major_", "")
        const parsedMajorId = toPositiveInteger(majorId)
        const parsedDepartmentId = toPositiveInteger(effectiveDepartmentId)

        if (parsedMajorId === null) {
          throw new Error("专业ID无效，无法保存专业信息")
        }

        if (parsedDepartmentId === null) {
          throw new Error("院系ID无效，已阻止保存以避免写入 departmentId=0")
        }

        const initialProfessionSnapshotMap = new Map(
          initialProfessionSnapshots.map((snapshot) => [snapshot.id, snapshot] as const)
        )

        const currentProfessionsVOS = careerInfo.careerInfoList
          .map((careerInfoItem) => {
            const parsedCareerInfoId = toInteger(careerInfoItem.id)
            const persistedSnapshot =
              parsedCareerInfoId === null ? undefined : initialProfessionSnapshotMap.get(parsedCareerInfoId)
            const resolvedCode = resolveOccupationCodeFromDirection(careerInfoItem) ?? persistedSnapshot?.code

            if (!resolvedCode) {
              return null
            }

            return {
              id: persistedSnapshot ? persistedSnapshot.id : 0,
              code: resolvedCode,
              task: careerInfoItem.tasks,
              lang: persistedSnapshot?.lang ?? 0,
            }
          })
          .filter((item): item is CreateMajorRequest["professionsVOS"][number] => item !== null)

        const retainedProfessionIds = new Set(
          currentProfessionsVOS
            .filter((profession) => profession.id > 0)
            .map((profession) => profession.id)
        )

        const deletedProfessionsVOS = initialProfessionSnapshots
          .filter((snapshot) => !retainedProfessionIds.has(snapshot.id))
          .map((snapshot) => ({
            id: -snapshot.id,
            code: snapshot.code,
            task: snapshot.task,
            lang: snapshot.lang,
          }))

        const mergedProfessionsVOS = [...currentProfessionsVOS, ...deletedProfessionsVOS]

        const apiRequestData = {
          id: parsedMajorId,
          departmentId: parsedDepartmentId,
          name: formState.majorName,
          keyword: formState.majorCode,
          majorLevel: formState.majorLevel,
          majorClass: formState.majorCode,
          feature: formState.educationalFeatures,
          careerLevel: "",
          demandType: formState.demandStatus,
          demandArea: formState.selectedProvince,
          position: formState.position,
          requiresVOS: mergedRequiresVOS,
          upload: hasUploadedRequirements,
          professionsVOS: mergedProfessionsVOS,
        }

        const response = await majorApiService.createMajor(apiRequestData)

        if (response.status === 200 || response.data) {
          clearDeletedNodeIds()
          setHasUploadedRequirements(false)
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
              description: response.error ?? "更新专业信息失败，请重试",
              duration: 5000,
            })
          }
        }
      } catch (error) {
        console.error("更新专业失败:", error)
        const errorMessage = error instanceof Error ? error.message : "更新专业信息失败，请重试"
        if (isAutoSave) {
          formState.setAutoSaveStatus("failed")
          setTimeout(() => formState.setAutoSaveStatus(""), 3000)
        } else {
          toast({
            variant: "destructive",
            title: "保存失败",
            description: errorMessage,
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

  return (
    <AddMajorFormView
      isEditMode={isEditMode}
      effectiveDepartmentId={effectiveDepartmentId}
      initialData={initialData}
      formState={formState}
      basicInfoErrors={basicInfoErrors}
      basicInfoValidationAttempt={basicInfoValidationAttempt}
      basicInfoFocusField={basicInfoFocusField}
      onBasicInfoFieldValidationChange={handleBasicInfoFieldValidationChange}
      careerInfo={careerInfo}
      graduationReqs={graduationReqs}
      worksData={worksData}
      onCancel={onCancel}
      handleSubmit={handleSubmit}
      toast={toast}
      isLoadingDetail={isLoadingDetail}
      onUploadGraduationRequirements={handleUploadGraduationRequirements}
      onDownloadGraduationTemplate={handleDownloadGraduationTemplate}
      isGraduationUploadDisabled={!isEditMode || !initialData?.id}
    />
  )
}
