import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import type { CourseMatrixItem } from "@/lib/api/matrix-api"
import type { ProjectTeachGoalData, Project, ProjectTeachGoal } from "@/lib/api/project-teach-goal-api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"
import { coursePointsApi } from "@/modules/courses/api/coursePointsApi"
import { projectTeachGoalApi } from "@/modules/courses/api/projectTeachGoalApi"
import { courseMatrixApi } from "@/modules/courses/api/courseMatrixApi"
import {
  buildMatrixDisplayKey,
  buildSelectionDialogKey,
  createCoursePointMap,
  sortCoursePointsByTitle,
} from "@/modules/courses/utils/course-matrix-utils"
import type {
  CourseMatrixContextValue,
  CourseMatrixRecord,
  SelectedMatrixCell,
  SupportStrength,
  UseCourseMatrixDataParams,
  CourseMatrixProviderProps,
} from "@/modules/courses/model/course-matrix"

const CourseMatrixContext = createContext<CourseMatrixContextValue | null>(null)

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

export const useCourseMatrixData = ({ node, onUpdateNode, majorId }: UseCourseMatrixDataParams): CourseMatrixContextValue => {
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
  const [isSavingEditingCoursePoint, setIsSavingEditingCoursePoint] = useState(false)
  const [isAutoSavePaused, setIsAutoSavePaused] = useState(false)
  const [majorIndicators, setMajorIndicators] = useState<Array<{ requirementId: string; indicatorIndex: number; content: string }>>([])
  const [isLoadingMajorIndicators, setIsLoadingMajorIndicators] = useState(false)
  const [teachingObjectiveIndicatorMap, setTeachingObjectiveIndicatorMap] = useState<Record<string, string[]>>({})
  const [isLoadingTeachingObjectiveIndicators, setIsLoadingTeachingObjectiveIndicators] = useState(false)

  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)
  const prevMajorIdRef = useRef<string | number | undefined>(undefined)
  const hasLoadedCourseMatrixRef = useRef(false)
  const prevCourseIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
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
          const courseId = (node.metadata as any)?.courseId
          const parentMajorId = (node.metadata as any)?.parentMajorId

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
            majorId
              ? coursePointsApi.getCoursePoints(String(majorId), String(courseId))
              : Promise.resolve({ data: null, error: null, status: 200 }),
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
              const parsed = JSON.parse(majorData)
              const allIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }> = []

              if (parsed.metadata?.graduationRequirements) {
                parsed.metadata.graduationRequirements.forEach((req: any) => {
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
  }, [majorId, node?.id, node?.type, node.metadata])

  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      const courseId = (node.metadata as any)?.courseId

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

              transformedData[key].push({
                id: String(item.id),
                name: item.point.title,
                description: item.point.description,
                support: item.relate.relate === 0 ? "strong" : "weak",
              })
            })

            setCourseMatrixData(transformedData)
          }
        } catch (error) {
          console.error("[CourseMatrix] 加载课程矩阵失败:", error)
        }
      }

      loadMatrix()
    }
  }, [node?.id, node?.type, node.metadata])

  const handleSaveCourseMatrix = useCallback(
    async (isAutoSave = false) => {
      setIsSavingCourseMatrix(true)

      try {
        if (projectTeachGoalData && projectTeachGoalData.projects) {
          projectTeachGoalData.projects.forEach((project) => {
            if (editingProjectNames[project.id] !== undefined) {
              project.name = editingProjectNames[project.id]
            }
          })
        }

        const courseId = (node.metadata as any)?.courseId
        if (courseId) {
          await courseMatrixApi.updateCourseMatrix(courseId, [])
        }

        if (onUpdateNode) {
          onUpdateNode(node.id, {
            metadata: {
              ...node.metadata,
            },
          })
        }

        setEditingProjectNames({})
        showSuccess("课程矩阵保存成功")
      } catch (error) {
        console.error("[CourseMatrix] 保存课程矩阵失败:", error)
        showError("课程矩阵保存失败")
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
      setIsSavingCourseMatrix(false)

      if (!isAutoSave) {
        setIsEditingCourseMatrix(false)
      }
    },
    [editingProjectNames, node.id, node.metadata, onUpdateNode, projectTeachGoalData]
  )

  useEffect(() => {
    if (!isEditingCourseMatrix || isAutoSavePaused) return

    const autoSaveInterval = setInterval(() => {
      handleSaveCourseMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [handleSaveCourseMatrix, isAutoSavePaused, isEditingCourseMatrix])

  const handleCancelCourseMatrix = useCallback(() => {
    setCourseMatrixData({})
    setEditingProjectNames({})
    setIsEditingCourseMatrix(false)
  }, [])

  const handleAddCoursePoint = useCallback(
    (objectiveId: string, pointId: string, chapterId: string) => {
      setIsAutoSavePaused(true)
      setCoursePointsSearch("")
      setCoursePointsSearchInDialog("")

      const key = buildSelectionDialogKey(objectiveId, pointId, chapterId)
      const existingCoursePoints = courseMatrixData[key] || []
      const initialSelections: Record<string, SupportStrength> = {}
      existingCoursePoints.forEach((cp) => {
        initialSelections[cp.id] = cp.support
      })

      setSelectedMatrixCell({ objectiveId, pointId, chapterId })
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

    const key = buildSelectionDialogKey(selectedMatrixCell.objectiveId, selectedMatrixCell.pointId, selectedMatrixCell.chapterId)
    const coursePointsMap = createCoursePointMap(coursePointsList)

    setCourseMatrixData((prev) => {
      const newPoints = Object.entries(selectedCoursePoints).map(([id, support]) => {
        const pointData = coursePointsMap.get(id) || { title: id, description: "" }
        return {
          id,
          name: pointData.title,
          description: pointData.description,
          support,
        }
      })

      return {
        ...prev,
        [key]: newPoints,
      }
    })

    setIsAddCoursePointDialogOpen(false)
    setSelectedMatrixCell(null)
    setSelectedCoursePoints({})
  }, [coursePointsList, selectedCoursePoints, selectedMatrixCell])

  const handleRemoveCoursePoint = useCallback((objectiveId: string, pointId: string, chapterId: string, coursePointId: string) => {
    const key = buildSelectionDialogKey(objectiveId, pointId, chapterId)
    setCourseMatrixData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((cp) => cp.id !== coursePointId),
    }))
  }, [])

  const handleAddNewCoursePoint = useCallback(() => {
    const tempId = `temp-${Date.now()}`
    const newCoursePointData: Partial<ApiCoursePoint> = {
      id: tempId as any,
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
    setEditingCoursePointId(tempId as any)
  }, [])

  const handleSaveNewCoursePoint = useCallback(async () => {
    if (!editingCoursePointData.title?.trim()) {
      return
    }

    setIsSavingNewCoursePoint(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const newData: ApiCoursePoint = {
        id: newCoursePoint?.id as any,
        title: editingCoursePointData.title,
        description: editingCoursePointData.description || "",
        uniqueCode: "",
        majorId: majorId ? Number(majorId) : 0,
        courseUnitId: node?.id ? Number(node.id) : 0,
        relate: 0,
        createTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        deleted: 0,
      }

      setCoursePointsList((prev) => sortCoursePointsByTitle([...prev.filter((cp) => cp.id !== newData.id), newData]))
      setNewCoursePoint(null)
      setEditingCoursePointId(null)
      setEditingCoursePointData({})
      showSuccess("课点创建成功")
    } catch (error) {
      console.error("创建课点失败:", error)
      showError("创建课点失败，请重试")
    } finally {
      setIsSavingNewCoursePoint(false)
    }
  }, [editingCoursePointData, majorId, newCoursePoint?.id, node?.id])

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

  const handleDragOver = useCallback((event: DragEvent, index: number) => {
    event.preventDefault()
    setDragOverIndex(index)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback(
    (event: DragEvent, targetIndex: number) => {
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
        (isDeletingCoursePoints || deletingCoursePointId !== null || isSavingNewCoursePoint || isSavingEditingCoursePoint)
      ) {
        return
      }
      setIsShowCoursePointsDialog(open)
    },
    [deletingCoursePointId, isDeletingCoursePoints, isSavingEditingCoursePoint, isSavingNewCoursePoint]
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

  const handleDeleteSelectedCoursePoints = useCallback(async () => {
    if (selectedCoursePointIds.size === 0) return
    setIsDeletingCoursePoints(true)
    try {
      const deleteCount = selectedCoursePointIds.size
      for (const id of selectedCoursePointIds) {
        const response = await coursePointsApi.deleteCoursePoint(id)
        if (response.error) {
          showError(response.error)
          return
        }
        setCoursePointsList((prev) => prev.filter((cp) => cp.id !== id))
      }
      setSelectedCoursePointIds(new Set())
      showSuccess(`成功删除 ${deleteCount} 个课点`)
    } catch (error) {
      console.error("删除课点失败:", error)
      showError("删除课点失败，请重试")
    } finally {
      setIsDeletingCoursePoints(false)
    }
  }, [selectedCoursePointIds])

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
    isSavingEditingCoursePoint,
    setIsSavingEditingCoursePoint,
    handleAddNewCoursePoint,
    handleSaveNewCoursePoint,
    handleDeleteSelectedCoursePoints,
    courseGoals,
    majorIndicators,
    isLoadingMajorIndicators,
    teachingObjectiveIndicatorMap,
    isLoadingTeachingObjectiveIndicators,
    isAutoSavePaused,
    setIsAutoSavePaused,
  }
}
