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
import { courseDetailApi } from "@/modules/courses/api/courseDetailApi"
import {
  buildCoursePointTitle,
  buildMatrixDisplayKey,
  buildSelectionDialogKey,
  createCoursePointMap,
  extractCoursePointSequence,
  getNextCoursePointSequence,
  sortCoursePointsByTitle,
} from "@/modules/courses/utils/course-matrix-utils"
import type {
  CourseMatrixPointItem,
  CourseMatrixContextValue,
  CourseMatrixRecord,
  SelectedMatrixCell,
  SupportStrength,
  TeachingObjectiveMajorIndicator,
  UseCourseMatrixDataParams,
  CourseMatrixProviderProps,
} from "@/modules/courses/model/course-matrix"

const CourseMatrixContext = createContext<CourseMatrixContextValue | null>(null)

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
  const [isSmartParsingCoursePoints, setIsSmartParsingCoursePoints] = useState(false)
  const [isSmartParseExpanded, setIsSmartParseExpanded] = useState(false)
  const [smartParseInput, setSmartParseInput] = useState("")
  const [smartParseSummary, setSmartParseSummary] = useState<{ totalCount: number; addedCount: number; duplicateCount: number } | null>(null)
  const [coursePointFooterMessage, setCoursePointFooterMessage] = useState<{ text: string; tone: "default" | "error" } | null>(null)
  const [isSavingEditingCoursePoint, setIsSavingEditingCoursePoint] = useState(false)
  const [majorIndicators, setMajorIndicators] = useState<TeachingObjectiveMajorIndicator[]>([])
  const [isLoadingMajorIndicators, setIsLoadingMajorIndicators] = useState(false)
  const [teachingObjectiveIndicatorMap, setTeachingObjectiveIndicatorMap] = useState<Record<string, string[]>>({})
  const [isLoadingTeachingObjectiveIndicators, setIsLoadingTeachingObjectiveIndicators] = useState(false)

  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)
  const prevMajorIdRef = useRef<string | number | undefined>(undefined)
  const prevRefreshTokenRef = useRef<number | undefined>(undefined)
  const hasLoadedCourseMatrixRef = useRef(false)
  const prevCourseIdRef = useRef<string | null>(null)

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

          const courseGoalsRequest = parentMajorId
            ? courseGoalsApi.getCourseMatrixHeaderGoals(String(courseId))
            : Promise.resolve({ data: null, error: null, status: 200 })

          const [courseGoalsResponse, coursePointsResponse, majorMatrixResponse, majorDetailResponse, teachingObjectiveIndicatorsResponse, projectTeachGoalResponse] = await Promise.all([
            courseGoalsRequest,
            (() => {
              const numericMajorId = parsePositiveNumericId(majorId)
              const numericCourseId = parsePositiveNumericId(courseId)
              if (numericMajorId === null || numericCourseId === null) {
                return Promise.resolve({ data: null, error: null, status: 200 })
              }
              return coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
            })(),
            majorId
              ? courseMatrixApi.getMajorMatrix(String(courseId))
              : Promise.resolve({ data: [], error: null, status: 200 }),
            majorId
              ? courseDetailApi.getMajorDetail(String(majorId))
              : Promise.resolve({ data: null, error: null, status: 200 }),
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

          console.log("[CourseMatrix] 专业矩阵API响应:", majorMatrixResponse)
          console.log("[CourseMatrix] 专业详情API响应:", majorDetailResponse)
          if (majorMatrixResponse.error) {
            console.warn("[CourseMatrix] 专业矩阵加载失败:", majorMatrixResponse.error)
            setMajorIndicators([])
          } else if (majorDetailResponse.error) {
            console.warn("[CourseMatrix] 专业详情加载失败:", majorDetailResponse.error)
            setMajorIndicators([])
          } else {
            const majorMatrixItems = Array.isArray(majorMatrixResponse.data) ? majorMatrixResponse.data : []
            const requirementList = Array.isArray(majorDetailResponse.data?.requiresVOS)
              ? majorDetailResponse.data.requiresVOS
              : []

            const supportByIndicatorId = new Map<string, SupportStrength>()
            majorMatrixItems.forEach((item) => {
              const indicatorId = String(item.graduateRequireId)
              const supportLevel: SupportStrength = item.relate === 0 ? "strong" : "weak"
              const existing = supportByIndicatorId.get(indicatorId)
              if (existing === "strong") {
                return
              }
              supportByIndicatorId.set(indicatorId, supportLevel)
            })

            const nextMajorIndicators: TeachingObjectiveMajorIndicator[] = []
            requirementList.forEach((requirement) => {
              const requirementId = String(requirement.id)
              const requirementDescription = String(requirement.description)
              if (!Array.isArray(requirement.children)) {
                console.warn("[CourseMatrix] 专业详情中的指标点列表不是数组:", requirement)
                return
              }

              requirement.children.forEach((indicator) => {
                const indicatorId = String(indicator.id)
                const supportLevel = supportByIndicatorId.get(indicatorId)
                if (!supportLevel) {
                  return
                }

                nextMajorIndicators.push({
                  indicatorId,
                  requirementId,
                  requirementDescription,
                  indicatorDescription: String(indicator.description),
                  supportLevel,
                })
              })
            })

            setMajorIndicators(nextMajorIndicators)
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

          const response = await courseMatrixApi.getFilteredCourseMatrix(courseId)
          const matrixResponse = response.status === 404 ? await courseMatrixApi.getCourseMatrix(courseId) : response
          if (matrixResponse.data && Array.isArray(matrixResponse.data)) {
            const transformedData: CourseMatrixRecord = {}

            matrixResponse.data.forEach((item: CourseMatrixItem) => {
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

  const syncCourseMatrixFromItems = useCallback((items: CourseMatrixItem[]) => {
    const transformedData: CourseMatrixRecord = {}

    items.forEach((item: CourseMatrixItem) => {
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
  }, [])

  const refreshLatestCourseMatrixData = useCallback(async (courseId: string) => {
      const [projectTeachGoalResponse, courseMatrixSeedResponse] = await Promise.all([
        projectTeachGoalApi.getProjectTeachGoal(courseId),
        courseMatrixApi.getFilteredCourseMatrix(courseId),
      ])

      const courseMatrixResponse = courseMatrixSeedResponse.status === 404
        ? await courseMatrixApi.getCourseMatrix(courseId)
        : courseMatrixSeedResponse

    if (projectTeachGoalResponse.data) {
      setProjectTeachGoalData(projectTeachGoalResponse.data)
    } else {
      console.warn("[CourseMatrix] 刷新项目和教学目标数据失败:", projectTeachGoalResponse.error)
    }

    if (courseMatrixResponse.data && Array.isArray(courseMatrixResponse.data)) {
      syncCourseMatrixFromItems(courseMatrixResponse.data)
    } else {
      console.warn("[CourseMatrix] 刷新课程矩阵数据失败:", courseMatrixResponse.error)
    }
  }, [syncCourseMatrixFromItems])

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
              indexNo: projectIndex + 1,
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

        await refreshLatestCourseMatrixData(String(node.id))

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
    [courseGoals, courseMatrixData, editingProjectNames, node.id, projectTeachGoalData, refreshLatestCourseMatrixData]
  )

  const handleCancelCourseMatrix = useCallback(() => {
    setEditingProjectNames({})
    setIsEditingCourseMatrix(false)
  }, [])

  const handleAddCoursePoint = useCallback(
    (projectId: string, graduateRequireId: string) => {
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
    const nextSequence = getNextCoursePointSequence(coursePointsList)
    const newCoursePointData: Partial<ApiCoursePoint> = {
      id: tempId,
      title: buildCoursePointTitle(nextSequence),
      description: "",
      uniqueCode: "",
      majorId: 0,
      courseUnitId: 0,
      relate: 0,
      createTime: "",
      updateTime: "",
      deleted: 0,
    }
    setSmartParseSummary(null)
    setCoursePointFooterMessage(null)
    setNewCoursePoint(newCoursePointData)
    setEditingCoursePointData(newCoursePointData)
    setCoursePointsList((prev) => [newCoursePointData as ApiCoursePoint, ...prev])
    setEditingCoursePointId(tempId)
  }, [coursePointsList])

  // [MOD] 调用真实 savepoints 接口（id: 0 = 新增），成功后刷新课点列表
  const handleSaveNewCoursePoint = useCallback(async () => {
    if (!editingCoursePointData.title?.trim() || !editingCoursePointData.description?.trim()) {
      return
    }

    const numericMajorId = parsePositiveNumericId(majorId)
    const numericCourseId = parsePositiveNumericId(node?.id)
    if (numericMajorId === null || numericCourseId === null) {
      showError("缺少专业或课程信息，无法创建课点")
      return
    }

    const existingCoursePoints = coursePointsList.filter((coursePoint) => coursePoint.id !== newCoursePoint?.id)
    const normalizedDescription = editingCoursePointData.description.trim()
    const hasDuplicateDescription = existingCoursePoints.some(
      (coursePoint) => (coursePoint.description || "").trim() === normalizedDescription
    )

    if (hasDuplicateDescription) {
      setSmartParseSummary(null)
      setCoursePointFooterMessage({ text: "课点描述重复，未新增。", tone: "error" })
      return
    }

    const desiredSequence = extractCoursePointSequence(editingCoursePointData.title.trim())
    const existingSequences = new Set(
      existingCoursePoints
        .map((coursePoint) => extractCoursePointSequence(coursePoint.title))
        .filter((sequence): sequence is number => sequence !== null)
    )
    const nextSequence = getNextCoursePointSequence(existingCoursePoints)
    const finalTitle =
      desiredSequence === null || existingSequences.has(desiredSequence)
        ? buildCoursePointTitle(nextSequence)
        : buildCoursePointTitle(desiredSequence)

    setIsSavingNewCoursePoint(true)
    try {
      const response = await coursePointsApi.saveCoursePoints(numericMajorId, numericCourseId, [
        { id: 0, title: finalTitle, description: normalizedDescription },
      ])

      if (response.error) {
        showError(response.error)
        return
      }

      // 创建成功后重新拉取课点列表，获取后端分配的真实 ID
      const listResponse = await coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
      if (listResponse.data) {
        setCoursePointsList(sortCoursePointsByTitle(listResponse.data))
      }

      const tempId = newCoursePoint?.id
      if (tempId != null) {
        setCoursePointsList((prev) => prev.filter((cp) => cp.id !== tempId))
      }

      setNewCoursePoint(null)
      setEditingCoursePointId(null)
      setEditingCoursePointData({})
      setCoursePointFooterMessage(null)
      showSuccess("课点创建成功")
    } catch (error) {
      console.error("[CoursePoints] 创建课点异常:", error)
      showError("创建课点失败，请重试")
    } finally {
      setIsSavingNewCoursePoint(false)
    }
  }, [coursePointsList, editingCoursePointData, majorId, newCoursePoint?.id, node?.id])

  const handleSmartParseCoursePoints = useCallback(async () => {
    const numericMajorId = parsePositiveNumericId(majorId)
    const numericCourseId = parsePositiveNumericId(node?.id)
    if (numericMajorId === null || numericCourseId === null) {
      showError("缺少专业或课程信息，无法智能解析课点")
      return
    }

    const normalizeCoursePointDescription = (value: string) => value.trim()

    const normalizedItems = smartParseInput
      .split(/[\n;]+/)
      .map((item) => normalizeCoursePointDescription(item))
      .filter((item) => item !== "")

    if (normalizedItems.length === 0) {
      showError("请输入要解析的课点描述")
      return
    }

    setCoursePointFooterMessage(null)

    const existingDescriptions = new Set(
      coursePointsList
        .map((coursePoint) => normalizeCoursePointDescription(coursePoint.description || ""))
        .filter((description) => description !== "")
    )
    const seenDescriptions = new Set<string>()
    const uniqueNewDescriptions: string[] = []

    normalizedItems.forEach((description) => {
      if (seenDescriptions.has(description) || existingDescriptions.has(description)) {
        return
      }

      seenDescriptions.add(description)
      uniqueNewDescriptions.push(description)
    })

    const totalCount = normalizedItems.length
    const addedCount = uniqueNewDescriptions.length
    const duplicateCount = totalCount - addedCount

    setSmartParseSummary({ totalCount, addedCount, duplicateCount })

    if (addedCount === 0) {
      setSmartParseInput("")
      setIsSmartParseExpanded(false)
      return
    }

    const nextSequence = getNextCoursePointSequence(coursePointsList)
    const payload = uniqueNewDescriptions.map((description, index) => ({
      id: 0,
      title: buildCoursePointTitle(nextSequence + index),
      description,
    }))

    setIsSmartParsingCoursePoints(true)
    try {
      const saveResponse = await coursePointsApi.saveCoursePoints(numericMajorId, numericCourseId, payload)
      if (saveResponse.error) {
        showError(saveResponse.error)
        return
      }

      const listResponse = await coursePointsApi.getCoursePoints(numericMajorId, numericCourseId)
      if (!listResponse.data) {
        const errorMessage = listResponse.error !== null ? listResponse.error : "课点列表刷新失败"
        showError(errorMessage)
        return
      }

      setCoursePointsList(sortCoursePointsByTitle(listResponse.data))
      setSelectedCoursePointIds(new Set())
      setEditingCoursePointId(null)
      setEditingCoursePointData({})
      setNewCoursePoint(null)
      setSmartParseInput("")
      setIsSmartParseExpanded(false)
    } catch (error) {
      console.error("[CoursePoints] 智能解析课点异常:", error)
      showError("智能解析课点失败，请重试")
    } finally {
      setIsSmartParsingCoursePoints(false)
    }
  }, [coursePointsList, majorId, node?.id, smartParseInput])

  const resetCoursePointsDialogState = useCallback(() => {
    setCoursePointsSearch("")
    setCoursePointsSearchInDialog("")
    setSmartParseInput("")
    setSmartParseSummary(null)
    setCoursePointFooterMessage(null)
    setIsSmartParseExpanded(false)
    setEditingCoursePointId(null)
    setEditingCoursePointData({})
    setDeletingCoursePointId(null)
    setIsDeletingCoursePoints(false)
    setSelectedCoursePointIds(new Set())
    setIsSavingEditingCoursePoint(false)
    setIsSmartParsingCoursePoints(false)
    setNewCoursePoint((prevNewCoursePoint) => {
      if (prevNewCoursePoint?.id !== undefined) {
        setCoursePointsList((prevList) => prevList.filter((coursePoint) => coursePoint.id !== prevNewCoursePoint.id))
      }

      return null
    })
  }, [])

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

  const handleDragStart = useCallback((event: React.DragEvent<Element>, projectId: string | number) => {
    const normalizedProjectId = String(projectId)
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", normalizedProjectId)
    setDraggedProjectId(normalizedProjectId)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedProjectId(null)
    setDragOverIndex(null)
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent<Element>, index: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<Element>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (event: React.DragEvent<Element>, targetIndex: number) => {
      event.preventDefault()
      const droppedProjectId = event.dataTransfer.getData("text/plain") || draggedProjectId
      if (!droppedProjectId || !projectTeachGoalData) return

      const draggedIndex = projectTeachGoalData.projects.findIndex((p) => String(p.id) === droppedProjectId)
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
          isSmartParsingCoursePoints ||
          isSavingEditingCoursePoint
        )
      ) {
        return
      }

      if (!open) {
        resetCoursePointsDialogState()
      }

      setIsShowCoursePointsDialog(open)
    },
    [
      deletingCoursePointId,
      isDeletingCoursePoints,
      isSmartParsingCoursePoints,
      isSavingEditingCoursePoint,
      isSavingNewCoursePoint,
      resetCoursePointsDialogState,
    ]
  )

  const handleOpenCoursePointsDialog = useCallback(() => {
    resetCoursePointsDialogState()
    setIsShowCoursePointsDialog(true)
  }, [resetCoursePointsDialogState])

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
              ? {
                  ...cp,
                  title: data.title?.trim() ? data.title : cp.title,
                  description: data.description?.trim() ? data.description : cp.description,
                }
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
    resetCoursePointsDialogState,
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
    isSmartParsingCoursePoints,
    isSmartParseExpanded,
    setIsSmartParseExpanded,
    smartParseInput,
    setSmartParseInput,
    smartParseSummary,
    coursePointFooterMessage,
    isSavingEditingCoursePoint,
    setIsSavingEditingCoursePoint,
    handleAddNewCoursePoint,
    handleSaveNewCoursePoint,
    handleSmartParseCoursePoints,
    handleDeleteSelectedCoursePoints,
    handleUpdateCoursePoint,
    handleDeleteSingleCoursePoint,
    courseGoals,
    majorIndicators,
    isLoadingMajorIndicators,
    teachingObjectiveIndicatorMap,
    isLoadingTeachingObjectiveIndicators,
  }
}
