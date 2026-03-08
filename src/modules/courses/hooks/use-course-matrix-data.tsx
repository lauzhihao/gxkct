import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import type { CourseMatrixItem } from "@/lib/api/matrix-api"
import type { ProjectTeachGoalData, Project } from "@/lib/api/project-teach-goal-api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"
import { coursePointsApi } from "@/modules/courses/api/coursePointsApi"
import { projectTeachGoalApi } from "@/modules/courses/api/projectTeachGoalApi"
import { courseMatrixApi } from "@/modules/courses/api/courseMatrixApi"
import {
  buildMatrixDisplayKey,
  buildSelectionDialogKey,
  createCoursePointMap,
} from "@/modules/courses/utils/course-matrix-utils"
import type {
  CourseMatrixPointItem,
  CourseMatrixContextValue,
  CourseMatrixRecord,
  SelectedMatrixCell,
  SupportStrength,
  UseCourseMatrixDataParams,
  CourseMatrixProviderProps,
} from "@/modules/courses/model/course-matrix"

const CourseMatrixContext = createContext<CourseMatrixContextValue | null>(null)

type CachedGraduationRequirement = {
  id: string
  indicators?: string[]
}

type CachedMajorData = {
  graduationRequirements?: CachedGraduationRequirement[]
  requiresVOS?: CachedGraduationRequirement[]
}

const dedupeCourseMatrixPoints = (points: CourseMatrixPointItem[]): CourseMatrixPointItem[] => {
  const pointMap = new Map<string, CourseMatrixPointItem>()

  points.forEach((point) => {
    const existing = pointMap.get(point.id)
    if (!existing) {
      pointMap.set(point.id, point)
      return
    }

    const existingHasMatrixItemId = existing.matrixItemId > 0
    const pointHasMatrixItemId = point.matrixItemId > 0

    if (!existingHasMatrixItemId && pointHasMatrixItemId) {
      pointMap.set(point.id, point)
    }
  })

  return Array.from(pointMap.values())
}

const parsePositiveNumericId = (value: string | number | undefined): number | null => {
  if (typeof value === "number") {
    if (!Number.isInteger(value) || value <= 0) {
      return null
    }
    return value
  }

  if (typeof value !== "string") {
    return null
  }

  const trimmedValue = value.trim()
  if (trimmedValue === "") {
    return null
  }

  const matchedDigits = trimmedValue.match(/\d+/)
  if (!matchedDigits || matchedDigits[0] === undefined) {
    return null
  }

  const parsedValue = Number.parseInt(matchedDigits[0], 10)
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    return null
  }

  return parsedValue
}

export const CourseMatrixProvider = ({ value, children }: CourseMatrixProviderProps) => (
  <CourseMatrixContext.Provider value={value}>{children}</CourseMatrixContext.Provider>
)

export const useCourseMatrixContext = () => {
  const context = useContext(CourseMatrixContext)
  if (!context) {
    throw new Error("useCourseMatrixContext 必须在 CourseMatrixProvider 中使用")
  }
  return context
}

export const useCourseMatrixData = ({ node, majorId, refreshToken }: UseCourseMatrixDataParams): CourseMatrixContextValue => {
  const [isEditingCourseMatrix, setIsEditingCourseMatrix] = useState(false)
  const [courseMatrixData, setCourseMatrixData] = useState<CourseMatrixRecord>({})
  const [isSavingCourseMatrix, setIsSavingCourseMatrix] = useState(false)
  const [isAddCoursePointDialogOpen, setIsAddCoursePointDialogOpen] = useState(false)
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<SelectedMatrixCell | null>(null)
  const [selectedCoursePoints, setSelectedCoursePoints] = useState<Record<string, SupportStrength>>({})
  const [courseGoals, setCourseGoals] = useState<CourseGoal[]>([])
  const [projectTeachGoalData, setProjectTeachGoalData] = useState<ProjectTeachGoalData | null>(null)
  const [isLoadingProjectTeachGoal, setIsLoadingProjectTeachGoal] = useState(false)
  const [editingProjectNames, setEditingProjectNames] = useState<Record<string, string>>({})
  const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isShowCoursePointsDialog, setIsShowCoursePointsDialog] = useState(false)
  const [coursePointsList, setCoursePointsList] = useState<ApiCoursePoint[]>([])
  const [isLoadingCoursePoints, setIsLoadingCoursePoints] = useState(false)
  const [coursePointsSearch, setCoursePointsSearch] = useState("")
  const [coursePointsSearchInDialog, setCoursePointsSearchInDialog] = useState("")
  const [editingCoursePointId, setEditingCoursePointId] = useState<number | null>(null)
  const [editingCoursePointData, setEditingCoursePointData] = useState<Partial<ApiCoursePoint>>({})
  const [selectedCoursePointIds, setSelectedCoursePointIds] = useState<Set<number>>(new Set())
  const [isDeletingCoursePoints, setIsDeletingCoursePoints] = useState(false)
  const [deletingCoursePointId, setDeletingCoursePointId] = useState<number | null>(null)
  const [newCoursePoint, setNewCoursePoint] = useState<Partial<ApiCoursePoint> | null>(null)
  const [isSavingNewCoursePoint, setIsSavingNewCoursePoint] = useState(false)
  const [isImportingCoursePoints, setIsImportingCoursePoints] = useState(false)
  const [isSavingEditingCoursePoint, setIsSavingEditingCoursePoint] = useState(false)
  const [isAutoSavePaused, setIsAutoSavePaused] = useState(false)
  const [majorIndicators, setMajorIndicators] = useState<Array<{ requirementId: string; indicatorIndex: number; content: string }>>([])
  const [isLoadingMajorIndicators, setIsLoadingMajorIndicators] = useState(false)
  const [teachingObjectiveIndicatorMap, setTeachingObjectiveIndicatorMap] = useState<Record<string, string[]>>({})
  const [isLoadingTeachingObjectiveIndicators, setIsLoadingTeachingObjectiveIndicators] = useState(false)

  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)
  const prevMajorIdRef = useRef<string | number | undefined>(undefined)
  const prevRefreshTokenRef = useRef<number | undefined>(undefined)
  const hasLoadedCourseMatrixRef = useRef(false)
  const prevCourseIdRef = useRef<string | null>(null)

  const downloadBlobFile = useCallback((blob: Blob, filename: string) => {
    const objectUrl = window.URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.style.display = "none"
    anchor.href = objectUrl
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.URL.revokeObjectURL(objectUrl)
  }, [])

  const resolveCurrentLangCode = useCallback((): string => {
    if (typeof window === "undefined") {
      return "80101"
    }

    const storedLang = window.sessionStorage.getItem("lang")
    if (typeof storedLang !== "string") {
      return "80101"
    }
    if (storedLang.trim() === "") {
      return "80101"
    }

    return storedLang
  }, [])

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      if (prevRefreshTokenRef.current !== refreshToken) {
        hasLoadedRef.current = false
        hasLoadedCourseMatrixRef.current = false
        prevRefreshTokenRef.current = refreshToken
      }

      if (prevNodeIdRef.current !== node.id || prevMajorIdRef.current !== majorId) {
        hasLoadedRef.current = false
        prevNodeIdRef.current = node.id
        prevMajorIdRef.current = majorId
      }

      if (hasLoadedRef.current) {
        return
      }
      hasLoadedRef.current = true

      const loadAllData = async () => {
        try {
          // 直接使用 node.id 作为 courseId
          const courseId = node.id
          // 使用传入的 majorId
          const parentMajorId = majorId

          if (!courseId) {
            console.warn("[CourseMatrix] 缺少courseId")
            return
          }

          setIsLoadingProjectTeachGoal(true)
          setIsLoadingCoursePoints(true)
          setIsLoadingMajorIndicators(true)
          setIsLoadingTeachingObjectiveIndicators(true)

          const [courseGoalsResponse, coursePointsResponse, indicatorSupportsResponse, teachingObjectiveIndicatorsResponse, projectTeachGoalResponse] = await Promise.all([
            parentMajorId
              ? courseGoalsApi.getCourseGoals(String(courseId), String(parentMajorId))
              : Promise.resolve({ data: null, error: null, status: 200 }),
            (() => {
              const numericMajorId = parsePositiveNumericId(majorId)
              const numericCourseId = parsePositiveNumericId(courseId)
              if (numericMajorId === null || numericCourseId === null) {
                return Promise.resolve({ data: null, error: null, status: 200 })
              }
              return coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
            })(),
            majorId
              ? courseMatrixApi.getCourseIndicatorSupports(String(courseId), String(majorId))
              : Promise.resolve({ data: [], error: null, status: 200 }),
            majorId
              ? courseMatrixApi.getCourseTeachingObjectiveIndicators(String(courseId), String(majorId))
              : Promise.resolve({ data: {}, error: null, status: 200 }),
            projectTeachGoalApi.getProjectTeachGoal(String(courseId)),
          ])

          console.log("[CourseMatrix] 课程目标API响应:", courseGoalsResponse)
          if (courseGoalsResponse.data) {
            setCourseGoals(courseGoalsResponse.data)
          } else {
            console.warn("[CourseMatrix] 课程目标数据为空或加载失败:", courseGoalsResponse.error)
          }

          console.log("[CourseMatrix] 课点列表API响应:", coursePointsResponse)
          if (coursePointsResponse.data) {
            setCoursePointsList(coursePointsResponse.data)
          } else {
            console.warn("[CourseMatrix] 课点列表为空或加载失败:", coursePointsResponse.error)
          }

          console.log("[CourseMatrix] 课程支撑的指标点API响应:", indicatorSupportsResponse)
          if (indicatorSupportsResponse.error) {
            console.warn("[CourseMatrix] 课程支撑的指标点加载失败:", indicatorSupportsResponse.error)
          } else if (indicatorSupportsResponse.data && indicatorSupportsResponse.data.length > 0) {
            const majorData = localStorage.getItem(`major-${majorId}`)
            if (majorData) {
              const parsed = JSON.parse(majorData) as CachedMajorData
              const allIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }> = []

              // 从缓存的专业数据中获取毕业要求（兼容新旧格式）
              const graduationRequirements = parsed.graduationRequirements || parsed.requiresVOS || []
              if (graduationRequirements.length > 0) {
                graduationRequirements.forEach((req) => {
                  req.indicators?.forEach((indicator: string, index: number) => {
                    allIndicators.push({
                      requirementId: req.id,
                      indicatorIndex: index,
                      content: indicator,
                    })
                  })
                })
              }

              const supportedIndicatorKeys = new Set(indicatorSupportsResponse.data)
              const filteredIndicators = allIndicators.filter((indicator) => {
                const key = `${indicator.requirementId}-${indicator.indicatorIndex}`
                return supportedIndicatorKeys.has(key)
              })
              setMajorIndicators(filteredIndicators)
            }
          } else {
            console.log("[CourseMatrix] 课程支撑的指标点为空")
          }

          console.log("[CourseMatrix] 教学目标与指标点关系API响应:", teachingObjectiveIndicatorsResponse)
          if (teachingObjectiveIndicatorsResponse.data) {
            setTeachingObjectiveIndicatorMap(teachingObjectiveIndicatorsResponse.data)
          } else {
            console.warn("[CourseMatrix] 教学目标与指标点关系为空或加载失败:", teachingObjectiveIndicatorsResponse.error)
          }

          console.log("[CourseMatrix] 项目和教学目标API响应:", projectTeachGoalResponse)
          if (projectTeachGoalResponse.data) {
            setProjectTeachGoalData(projectTeachGoalResponse.data)
          } else {
            console.warn("[CourseMatrix] 项目和教学目标数据为空或加载失败:", projectTeachGoalResponse.error)
          }
        } catch (error) {
          console.error("[CourseMatrix] 加载数据失败:", error)
        } finally {
          setIsLoadingProjectTeachGoal(false)
          setIsLoadingCoursePoints(false)
          setIsLoadingMajorIndicators(false)
          setIsLoadingTeachingObjectiveIndicators(false)
        }
      }

      loadAllData()
    }
  }, [majorId, node?.id, node?.type, refreshToken])

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      // 直接使用 node.id 作为 courseId
      const courseId = node.id

      if (prevCourseIdRef.current !== courseId) {
        hasLoadedCourseMatrixRef.current = false
        prevCourseIdRef.current = courseId
      }

      if (hasLoadedCourseMatrixRef.current) {
        return
      }
      hasLoadedCourseMatrixRef.current = true

      const loadMatrix = async () => {
        try {
          if (!courseId) {
            console.warn("[CourseMatrix] 缺少courseId")
            return
          }

          const response = await courseMatrixApi.getCourseMatrix(courseId)
          if (response.data && Array.isArray(response.data)) {
            const transformedData: CourseMatrixRecord = {}

            response.data.forEach((item: CourseMatrixItem) => {
              const key = buildMatrixDisplayKey(item.projectId, item.graduateRequireId)

              if (!transformedData[key]) {
                transformedData[key] = []
              }

              const nextPoint: CourseMatrixPointItem = {
                id: String(item.point.id),
                matrixItemId: item.id,
                name: item.point.title,
                description: item.point.description,
                support: item.relate.relate === 0 ? "strong" : "weak",
              }

              transformedData[key] = dedupeCourseMatrixPoints([...transformedData[key], nextPoint])
            })

            setCourseMatrixData(transformedData)
          }
        } catch (error) {
          console.error("[CourseMatrix] 加载课程矩阵失败:", error)
        }
      }

      loadMatrix()
    }
  }, [node?.id, node?.type, refreshToken])

  const handleSaveCourseMatrix = useCallback(
    async (isAutoSave = false) => {
      setIsSavingCourseMatrix(true)

      try {
        if (!projectTeachGoalData?.projects || courseGoals.length === 0 || !node.id) {
          showError("课程矩阵数据不完整，无法保存")
          return
        }

        const courseIdNum = Number(node.id)
        if (!Number.isFinite(courseIdNum) || courseIdNum <= 0) {
          showError("课程ID无效，无法保存")
          return
        }

        const resolveSupportPayload = (support: SupportStrength) => {
          if (support === "strong") {
            return { name: "强支撑", code: "primary", relate: 0 }
          }
          return { name: "弱支撑", code: "success", relate: 1 }
        }

        const normalizeNumericId = (value: string | number): number => {
          if (typeof value === "number") {
            return Number.isFinite(value) && value > 0 ? value : 0
          }
          const parsed = Number.parseInt(value, 10)
          return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
        }

        const payload = projectTeachGoalData.projects.map((project, projectIndex) => {
          const projectIdNum = normalizeNumericId(project.id)
          const projectName = editingProjectNames[project.id] ?? project.name ?? `项目${projectIndex + 1}`

          const chapterItems = courseGoals.flatMap((goal) => {
            const children = goal.children && goal.children.length > 0 ? goal.children : []

            return children.flatMap((child) => {
              const graduateRequireId = normalizeNumericId(child.id)
              if (graduateRequireId <= 0) {
                return []
              }

              const cellKey = buildMatrixDisplayKey(String(project.id), String(child.id))
              const points = courseMatrixData[cellKey] || []

              return points.map((point: CourseMatrixPointItem) => {
                const pointIdNum = normalizeNumericId(point.id)

                return {
                  id: point.matrixItemId > 0 ? point.matrixItemId : 0,
                  courseUnitId: courseIdNum,
                  projectId: projectIdNum,
                  graduateRequireId,
                  point: {
                    id: pointIdNum,
                    title: point.name,
                    description: point.description || "",
                  },
                  relate: resolveSupportPayload(point.support),
                  study: "",
                  teach: "",
                  product: "",
                  week: "0",
                  period: "0",
                }
              })
            })
          })

          return {
            project: {
              id: projectIdNum,
              uniqueCode: project.uniqueCode || "",
              courseUnitId: courseIdNum,
              name: projectName,
              product: project.product || "",
              theoryPeriod: project.theoryPeriod || "0",
              practicePeriod: project.practicePeriod || "0",
              indexNo: project.indexNo ?? null,
            },
            data: chapterItems,
          }
        })

        // [MOD] 检查 API 返回值，后端错误时中断并保留编辑模式
        const response = await courseMatrixApi.updateCourseMatrix(node.id, payload)

        if (response.error) {
          console.error("[CourseMatrix] 保存课程矩阵失败:", response.error)
          showError("课程矩阵保存失败")
          return
        }

        setEditingProjectNames({})
        if (!isAutoSave) {
          showSuccess("课程矩阵保存成功")
          setIsEditingCourseMatrix(false)
        }
      } catch (error) {
        console.error("[CourseMatrix] 保存课程矩阵异常:", error)
        showError("课程矩阵保存失败")
      } finally {
        setIsSavingCourseMatrix(false)
      }
    },
    [courseGoals, courseMatrixData, editingProjectNames, node.id, projectTeachGoalData]
  )

  useEffect(() => {
    if (!isEditingCourseMatrix || isAutoSavePaused) return

    const autoSaveInterval = setInterval(() => {
      handleSaveCourseMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [handleSaveCourseMatrix, isAutoSavePaused, isEditingCourseMatrix])

  const handleCancelCourseMatrix = useCallback(() => {
    setEditingProjectNames({})
    setIsEditingCourseMatrix(false)
  }, [])

  const handleAddCoursePoint = useCallback(
    (projectId: string, graduateRequireId: string) => {
      setIsAutoSavePaused(true)
      setCoursePointsSearch("")
      setCoursePointsSearchInDialog("")

      const key = buildSelectionDialogKey(projectId, graduateRequireId)
      const existingCoursePoints = courseMatrixData[key] || []
      const initialSelections: Record<string, SupportStrength> = {}
      existingCoursePoints.forEach((cp) => {
        initialSelections[cp.id] = cp.support
      })

      setSelectedMatrixCell({ projectId, graduateRequireId })
      setSelectedCoursePoints(initialSelections)
      setIsAddCoursePointDialogOpen(true)
    },
    [courseMatrixData]
  )

  const handleToggleCoursePointSelection = useCallback((coursePointId: string, support: SupportStrength) => {
    setSelectedCoursePoints((prev) => {
      const newSelections = { ...prev }
      if (newSelections[coursePointId] === support) {
        delete newSelections[coursePointId]
      } else {
        newSelections[coursePointId] = support
      }
      return newSelections
    })
  }, [])

  const handleConfirmCoursePointSelection = useCallback(() => {
    if (!selectedMatrixCell || Object.keys(selectedCoursePoints).length === 0) {
      setIsAddCoursePointDialogOpen(false)
      setSelectedMatrixCell(null)
      return
    }

    const key = buildSelectionDialogKey(selectedMatrixCell.projectId, selectedMatrixCell.graduateRequireId)
    const coursePointsMap = createCoursePointMap(coursePointsList)

    setCourseMatrixData((prev) => {
      const existingPoints = prev[key] || []
      const existingPointMap = new Map(existingPoints.map((point) => [point.id, point]))

      const newPoints = dedupeCourseMatrixPoints(
        Object.entries(selectedCoursePoints).map(([id, support]) => {
          const pointData = coursePointsMap.get(id) || { title: id, description: "" }
          const existingPoint = existingPointMap.get(id)

          return {
            id,
            matrixItemId: existingPoint?.matrixItemId || 0,
            name: pointData.title,
            description: pointData.description,
            support,
          }
        })
      )

      return {
        ...prev,
        [key]: newPoints,
      }
    })

    setIsAddCoursePointDialogOpen(false)
    setSelectedMatrixCell(null)
    setSelectedCoursePoints({})
  }, [coursePointsList, selectedCoursePoints, selectedMatrixCell])

  const handleRemoveCoursePoint = useCallback((projectId: string, graduateRequireId: string, coursePointId: string) => {
    const key = buildSelectionDialogKey(projectId, graduateRequireId)
    setCourseMatrixData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((cp) => cp.id !== coursePointId),
    }))
  }, [])

  const handleAddNewCoursePoint = useCallback(() => {
    const tempId = -Date.now()
    const newCoursePointData: Partial<ApiCoursePoint> = {
      id: tempId,
      title: "",
      description: "",
      uniqueCode: "",
      majorId: 0,
      courseUnitId: 0,
      relate: 0,
      createTime: "",
      updateTime: "",
      deleted: 0,
    }
    setNewCoursePoint(newCoursePointData)
    setEditingCoursePointData(newCoursePointData)
    setCoursePointsList((prev) => [newCoursePointData as ApiCoursePoint, ...prev])
    setEditingCoursePointId(tempId)
  }, [])

  // [MOD] 调用真实 savepoints 接口（id: 0 = 新增），成功后刷新课点列表
  const handleSaveNewCoursePoint = useCallback(async () => {
    if (!editingCoursePointData.title?.trim()) {
      return
    }

    const numericMajorId = parsePositiveNumericId(majorId)
    const numericCourseId = parsePositiveNumericId(node?.id)
    if (numericMajorId === null || numericCourseId === null) {
      showError("缺少专业或课程信息，无法创建课点")
      return
    }

    setIsSavingNewCoursePoint(true)
    try {
      const response = await coursePointsApi.saveCoursePoints(numericMajorId, numericCourseId, [
        { id: 0, title: editingCoursePointData.title, description: editingCoursePointData.description || "" },
      ])

      if (response.error) {
        showError(response.error)
        return
      }

      // 创建成功后重新拉取课点列表，获取后端分配的真实 ID
      const listResponse = await coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
      if (listResponse.data) {
        setCoursePointsList(listResponse.data)
      }

      const tempId = newCoursePoint?.id
      if (tempId != null) {
        setCoursePointsList((prev) => prev.filter((cp) => cp.id !== tempId))
      }

      setNewCoursePoint(null)
      setEditingCoursePointId(null)
      setEditingCoursePointData({})
      showSuccess("课点创建成功")
    } catch (error) {
      console.error("[CoursePoints] 创建课点异常:", error)
      showError("创建课点失败，请重试")
    } finally {
      setIsSavingNewCoursePoint(false)
    }
  }, [editingCoursePointData, majorId, newCoursePoint?.id, node?.id])

  const handleDownloadCoursePointTemplate = useCallback(async () => {
    const response = await coursePointsApi.downloadPointTemplate(resolveCurrentLangCode())
    if (response.error || !response.data) {
      const errorMessage = response.error !== null ? response.error : "下载课点模板失败"
      throw new Error(errorMessage)
    }

    downloadBlobFile(response.data.blob, response.data.filename)
  }, [downloadBlobFile, resolveCurrentLangCode])

  const handleImportCoursePoints = useCallback(
    async (files: File[]) => {
      const file = files[0]
      if (!file) {
        throw new Error("未选择课点导入文件")
      }

      const numericMajorId = parsePositiveNumericId(majorId)
      const numericCourseId = parsePositiveNumericId(node?.id)

      if (numericMajorId === null || numericCourseId === null) {
        throw new Error("缺少专业或课程信息，无法导入课点")
      }

      setIsImportingCoursePoints(true)
      try {
        const resolveResponse = await coursePointsApi.resolveCoursePoints(numericMajorId, numericCourseId, file)
        if (resolveResponse.error || !resolveResponse.data) {
          const errorMessage = resolveResponse.error !== null ? resolveResponse.error : "课点导入解析失败"
          throw new Error(errorMessage)
        }

        if (resolveResponse.data.length === 0) {
          throw new Error("导入结果为空，未解析到课点数据")
        }

        const saveResponse = await coursePointsApi.saveCoursePoints(
          numericMajorId,
          numericCourseId,
          resolveResponse.data,
          true
        )
        if (saveResponse.error) {
          throw new Error(saveResponse.error)
        }

        const listResponse = await coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
        if (!listResponse.data) {
          const errorMessage = listResponse.error !== null ? listResponse.error : "课点列表刷新失败"
          throw new Error(errorMessage)
        }

        setCoursePointsList(listResponse.data)
        setSelectedCoursePointIds(new Set())
        setEditingCoursePointId(null)
        setEditingCoursePointData({})
        setNewCoursePoint(null)
        showSuccess("课点导入成功")

        return [file.name]
      } catch (error) {
        console.error("[CoursePoints] 导入课点异常:", error)
        throw error
      } finally {
        setIsImportingCoursePoints(false)
      }
    },
    [majorId, node?.id]
  )

  const handleAddProject = useCallback(() => {
    if (projectTeachGoalData) {
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: "新项目/章节",
      }
      setProjectTeachGoalData({
        ...projectTeachGoalData,
        projects: [...projectTeachGoalData.projects, newProject],
      })
    }
  }, [projectTeachGoalData])

  const handleDeleteProject = useCallback(
    (projectId: string | number) => {
      if (projectTeachGoalData) {
        setProjectTeachGoalData({
          ...projectTeachGoalData,
          projects: projectTeachGoalData.projects.filter((p) => p.id !== projectId),
        })
        setEditingProjectNames((prev) => {
          const newState = { ...prev }
          delete newState[String(projectId)]
          return newState
        })
      }
    },
    [projectTeachGoalData]
  )

  const handleDragStart = useCallback((projectId: string | number) => {
    setDraggedProjectId(String(projectId))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedProjectId(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<Element>, index: number) => {
    event.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<Element>, targetIndex: number) => {
      event.preventDefault()
      if (!draggedProjectId || !projectTeachGoalData) return

      const draggedIndex = projectTeachGoalData.projects.findIndex((p) => p.id === draggedProjectId)
      if (draggedIndex === -1 || draggedIndex === targetIndex) {
        setDraggedProjectId(null)
        setDragOverIndex(null)
        return
      }

      const newProjects = [...projectTeachGoalData.projects]
      const [draggedProject] = newProjects.splice(draggedIndex, 1)
      newProjects.splice(targetIndex, 0, draggedProject)

      setProjectTeachGoalData({
        ...projectTeachGoalData,
        projects: newProjects,
      })

      setDraggedProjectId(null)
      setDragOverIndex(null)
    },
    [draggedProjectId, projectTeachGoalData]
  )

  const handleCoursePointsDialogOpenChange = useCallback(
    (open: boolean) => {
      if (
        !open &&
        (
          isDeletingCoursePoints ||
          deletingCoursePointId !== null ||
          isSavingNewCoursePoint ||
          isImportingCoursePoints ||
          isSavingEditingCoursePoint
        )
      ) {
        return
      }
      setIsShowCoursePointsDialog(open)
    },
    [deletingCoursePointId, isDeletingCoursePoints, isImportingCoursePoints, isSavingEditingCoursePoint, isSavingNewCoursePoint]
  )

  const handleOpenCoursePointsDialog = useCallback(() => {
    setCoursePointsSearch("")
    setEditingCoursePointId(null)
    setEditingCoursePointData({})
    setDeletingCoursePointId(null)
    setIsDeletingCoursePoints(false)
    setSelectedCoursePointIds(new Set())
    setIsShowCoursePointsDialog(true)
  }, [])

  // [MOD] 批量删除：一次 savepoints 调用，所有 ID 取反
  const handleDeleteSelectedCoursePoints = useCallback(async () => {
    if (selectedCoursePointIds.size === 0) return

    const numericMajorId = parsePositiveNumericId(majorId)
    const numericCourseId = parsePositiveNumericId(node?.id)
    if (numericMajorId === null || numericCourseId === null) {
      showError("缺少专业或课程信息，无法删除课点")
      return
    }

    setIsDeletingCoursePoints(true)
    try {
      const deleteCount = selectedCoursePointIds.size
      const deletePoints = Array.from(selectedCoursePointIds).map((id) => ({
        id: -Math.abs(id),
        title: "",
        description: "",
      }))

      const response = await coursePointsApi.saveCoursePoints(numericMajorId, numericCourseId, deletePoints)
      if (response.error) {
        showError(response.error)
        return
      }

      setCoursePointsList((prev) => prev.filter((cp) => !selectedCoursePointIds.has(cp.id)))
      setSelectedCoursePointIds(new Set())
      showSuccess(`成功删除 ${deleteCount} 个课点`)
    } catch (error) {
      console.error("[CoursePoints] 批量删除课点异常:", error)
      showError("删除课点失败，请重试")
    } finally {
      setIsDeletingCoursePoints(false)
    }
  }, [selectedCoursePointIds, majorId, node?.id])

  // [MOD] 更新单个课点，供 dialog 调用
  const handleUpdateCoursePoint = useCallback(
    async (coursePointId: number, data: Partial<ApiCoursePoint>) => {
      const numericMajorId = parsePositiveNumericId(majorId)
      const numericCourseId = parsePositiveNumericId(node?.id)
      if (numericMajorId === null || numericCourseId === null) {
        showError("缺少专业或课程信息，无法更新课点")
        return
      }

      setIsSavingEditingCoursePoint(true)
      try {
        const response = await coursePointsApi.updateCoursePoint(numericMajorId, numericCourseId, coursePointId, data)
        if (response.error) {
          showError(response.error)
          return
        }

        // 更新本地列表中的对应项
        setCoursePointsList((prev) =>
          prev.map((cp) =>
            cp.id === coursePointId
              ? { ...cp, title: data.title || cp.title, description: data.description || cp.description }
              : cp
          )
        )
        setEditingCoursePointId(null)
        setEditingCoursePointData({})
        showSuccess("课点更新成功")
      } catch (error) {
        console.error("[CoursePoints] 更新课点异常:", error)
        showError("更新课点失败，请重试")
      } finally {
        setIsSavingEditingCoursePoint(false)
      }
    },
    [majorId, node?.id]
  )

  // [MOD] 删除单个课点，供 dialog 调用
  const handleDeleteSingleCoursePoint = useCallback(
    async (coursePointId: number) => {
      const numericMajorId = parsePositiveNumericId(majorId)
      const numericCourseId = parsePositiveNumericId(node?.id)
      if (numericMajorId === null || numericCourseId === null) {
        showError("缺少专业或课程信息，无法删除课点")
        return
      }

      setDeletingCoursePointId(coursePointId)
      try {
        const response = await coursePointsApi.deleteCoursePoint(numericMajorId, numericCourseId, coursePointId)
        if (response.error) {
          showError(response.error)
          return
        }

        setCoursePointsList((prev) => prev.filter((cp) => cp.id !== coursePointId))
        showSuccess("课点删除成功")
      } catch (error) {
        console.error("[CoursePoints] 删除课点异常:", error)
        showError("删除课点失败，请重试")
      } finally {
        setDeletingCoursePointId(null)
      }
    },
    [majorId, node?.id]
  )

  const coursePointTitleMap = useMemo(() => {
    const map = new Map<string, string>()
    coursePointsList.forEach((cp) => {
      map.set(String(cp.id), cp.title)
    })
    return map
  }, [coursePointsList])

  return {
    node,
    majorId,
    isEditingCourseMatrix,
    startEditingCourseMatrix: () => setIsEditingCourseMatrix(true),
    handleSaveCourseMatrix,
    handleCancelCourseMatrix,
    courseMatrixData,
    coursePointTitleMap,
    isSavingCourseMatrix,
    isAddCoursePointDialogOpen,
    setIsAddCoursePointDialogOpen,
    selectedMatrixCell,
    setSelectedMatrixCell,
    selectedCoursePoints,
    setSelectedCoursePoints,
    handleAddCoursePoint,
    handleToggleCoursePointSelection,
    handleConfirmCoursePointSelection,
    handleRemoveCoursePoint,
    projectTeachGoalData,
    isLoadingProjectTeachGoal,
    handleAddProject,
    handleDeleteProject,
    editingProjectNames,
    setEditingProjectNames,
    draggedProjectId,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    isShowCoursePointsDialog,
    setIsShowCoursePointsDialog,
    handleCoursePointsDialogOpenChange,
    handleOpenCoursePointsDialog,
    coursePointsList,
    setCoursePointsList,
    isLoadingCoursePoints,
    coursePointsSearch,
    setCoursePointsSearch,
    coursePointsSearchInDialog,
    setCoursePointsSearchInDialog,
    editingCoursePointId,
    setEditingCoursePointId,
    editingCoursePointData,
    setEditingCoursePointData,
    selectedCoursePointIds,
    setSelectedCoursePointIds,
    isDeletingCoursePoints,
    setIsDeletingCoursePoints,
    deletingCoursePointId,
    setDeletingCoursePointId,
    newCoursePoint,
    setNewCoursePoint,
    isSavingNewCoursePoint,
    isImportingCoursePoints,
    isSavingEditingCoursePoint,
    setIsSavingEditingCoursePoint,
    handleAddNewCoursePoint,
    handleSaveNewCoursePoint,
    handleDownloadCoursePointTemplate,
    handleImportCoursePoints,
    handleDeleteSelectedCoursePoints,
    handleUpdateCoursePoint,
    handleDeleteSingleCoursePoint,
    courseGoals,
    majorIndicators,
    isLoadingMajorIndicators,
    teachingObjectiveIndicatorMap,
    isLoadingTeachingObjectiveIndicators,
    isAutoSavePaused,
    setIsAutoSavePaused,
  }
}
