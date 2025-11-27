"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Pencil, X, Check, Loader2, Plus, BookMarked, GripVertical, Search, Settings, Trash2, Flag } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import type { CoursePoint as ApiCoursePoint } from "@/lib/api/course-points-api"
import { showSuccess, showError } from "@/lib/toast-utils"
import type { ProjectTeachGoalData, Project, ProjectTeachGoal } from "@/lib/api/project-teach-goal-api"
import { SupportLabel } from "@/components/support-label"

interface CourseMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
  majorId?: string | number
  onEditTeachingObjectives?: () => void
}

export function CourseMatrix({ node, onUpdateNode, majorId, onEditTeachingObjectives }: CourseMatrixProps) {
  const [isEditingCourseMatrix, setIsEditingCourseMatrix] = useState(false)
  const [courseMatrixData, setCourseMatrixData] = useState<
    Record<string, Array<{ id: string; name: string; description: string; support: "strong" | "weak" }>>
  >({})
  const [isSavingCourseMatrix, setIsSavingCourseMatrix] = useState(false)
  const [isAddCoursePointDialogOpen, setIsAddCoursePointDialogOpen] = useState(false)
  const [selectedMatrixCell, setSelectedMatrixCell] = useState<{
    objectiveId: string
    pointId: string
    chapterId: string
  } | null>(null)
  const [selectedCoursePoints, setSelectedCoursePoints] = useState<Record<string, "strong" | "weak">>({})
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
  const [editingCoursePointId, setEditingCoursePointId] = useState<number | null>(null)
  const [editingCoursePointData, setEditingCoursePointData] = useState<Partial<ApiCoursePoint>>({})
  const [selectedCoursePointIds, setSelectedCoursePointIds] = useState<Set<number>>(new Set())
  const [isDeletingCoursePoints, setIsDeletingCoursePoints] = useState(false)
  const [deletingCoursePointId, setDeletingCoursePointId] = useState<number | null>(null)
  const [newCoursePoint, setNewCoursePoint] = useState<Partial<ApiCoursePoint> | null>(null)
  const [isSavingNewCoursePoint, setIsSavingNewCoursePoint] = useState(false)
  const [isSavingEditingCoursePoint, setIsSavingEditingCoursePoint] = useState(false)
  const [isAutoSavePaused, setIsAutoSavePaused] = useState(false)
  const [coursePointsSearchInDialog, setCoursePointsSearchInDialog] = useState("")
  const [majorIndicators, setMajorIndicators] = useState<Array<{ requirementId: string; indicatorIndex: number; content: string }>>([])
  const [isLoadingMajorIndicators, setIsLoadingMajorIndicators] = useState(false)
  const [teachingObjectiveIndicatorMap, setTeachingObjectiveIndicatorMap] = useState<Record<string, string[]>>({})
  const [isLoadingTeachingObjectiveIndicators, setIsLoadingTeachingObjectiveIndicators] = useState(false)

  // 防止在StrictMode下重复调用API
  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)
  const prevMajorIdRef = useRef<string | number | undefined>(undefined)

  // 加载项目、教学目标、课程目标和课点数据
  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      // 当node或majorId改变时，重置ref
      if (prevNodeIdRef.current !== node.id || prevMajorIdRef.current !== majorId) {
        hasLoadedRef.current = false
        prevNodeIdRef.current = node.id
        prevMajorIdRef.current = majorId
      }

      // 防止在StrictMode下重复调用
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

          // 并行加载所有API请求
          setIsLoadingProjectTeachGoal(true)
          setIsLoadingCoursePoints(true)
          setIsLoadingMajorIndicators(true)
          setIsLoadingTeachingObjectiveIndicators(true)

          const [courseGoalsResponse, coursePointsResponse, indicatorSupportsResponse, teachingObjectiveIndicatorsResponse, projectTeachGoalResponse] = await Promise.all([
            // 加载课程目标（教学目标编辑页面使用）
            parentMajorId ? api.courseGoals.getCourseGoals(String(courseId), String(parentMajorId)) : Promise.resolve({ data: null, error: null, status: 200 }),
            // 加载课点列表
            majorId ? api.coursePoints.getCoursePoints(String(majorId), String(courseId)) : Promise.resolve({ data: null, error: null, status: 200 }),
            // 加载课程支撑的指标点
            majorId ? api.matrices.getCourseIndicatorSupports(String(courseId), String(majorId)) : Promise.resolve({ data: [], error: null, status: 200 }),
            // 加载教学目标与指标点的关系
            majorId ? api.matrices.getCourseTeachingObjectiveIndicators(String(courseId), String(majorId)) : Promise.resolve({ data: {}, error: null, status: 200 }),
            // 加载项目和教学目标数据
            api.projectTeachGoal.getProjectTeachGoal(String(courseId)),
          ])

          // 处理课程目标数据（教学目标编辑页面使用）
          console.log("[CourseMatrix] 课程目标API响应:", courseGoalsResponse)
          if (courseGoalsResponse.data) {
            console.log("[CourseMatrix] 课程目标数据加载成功:", courseGoalsResponse.data)
            setCourseGoals(courseGoalsResponse.data)

  
          } else {
            console.warn("[CourseMatrix] 课程目标数据为空或加载失败:", courseGoalsResponse.error)
          }

          // 处理课点列表数据
          console.log("[CourseMatrix] 课点列表API响应:", coursePointsResponse)
          if (coursePointsResponse.data) {
            console.log("[CourseMatrix] 课点列表加载成功:", coursePointsResponse.data)
            setCoursePointsList(coursePointsResponse.data)
          } else {
            console.warn("[CourseMatrix] 课点列表为空或加载失败:", coursePointsResponse.error)
          }

          // 处理指标点数据
          console.log("[CourseMatrix] 课程支撑的指标点API响应:", indicatorSupportsResponse)
          if (indicatorSupportsResponse.data && indicatorSupportsResponse.data.length > 0) {
            // 从localStorage中获取专业数据，提取所有指标点
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

              // 过滤出该课程支撑的指标点
              const supportedIndicatorKeys = new Set(indicatorSupportsResponse.data)
              const filteredIndicators = allIndicators.filter((indicator) => {
                const key = `${indicator.requirementId}-${indicator.indicatorIndex}`
                return supportedIndicatorKeys.has(key)
              })
              console.log("[CourseMatrix] 过滤后的指标点:", filteredIndicators)
              setMajorIndicators(filteredIndicators)
            }
          } else {
            console.warn("[CourseMatrix] 课程支撑的指标点为空或加载失败:", indicatorSupportsResponse.error)
          }

          // 处理教学目标与指标点的关系
          console.log("[CourseMatrix] 教学目标与指标点关系API响应:", teachingObjectiveIndicatorsResponse)
          if (teachingObjectiveIndicatorsResponse.data) {
            console.log("[CourseMatrix] 教学目标与指标点关系加载成功:", teachingObjectiveIndicatorsResponse.data)
            setTeachingObjectiveIndicatorMap(teachingObjectiveIndicatorsResponse.data)
          } else {
            console.warn("[CourseMatrix] 教学目标与指标点关系为空或加载失败:", teachingObjectiveIndicatorsResponse.error)
          }

          // 处理项目和教学目标数据
          console.log("[CourseMatrix] 项目和教学目标API响应:", projectTeachGoalResponse)
          if (projectTeachGoalResponse.data) {
            console.log("[CourseMatrix] 项目和教学目标数据加载成功:", projectTeachGoalResponse.data)
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
  }, [node?.id, node?.type, majorId])



  useEffect(() => {
    if (node?.type === "course" && node?.id) {
      const loadMatrix = async () => {
        try {
          // 检查api.matrix是否可用
          if (!api || !api.matrices) {
            console.error("[CourseMatrix] API对象未正确初始化")
            // 尝试从节点metadata加载
            if (node.metadata?.courseMatrixData) {
              setCourseMatrixData(node.metadata.courseMatrixData)
            }
            return
          }

          const response = await api.matrices.getCourseMatrix(node.id)
          if (response.data) {
            setCourseMatrixData(response.data)
          } else if (node.metadata?.courseMatrixData) {
            setCourseMatrixData(node.metadata.courseMatrixData)
          }
        } catch (error) {
          console.error("[CourseMatrix] 加载课程矩阵失败:", error)
          // 尝试从节点metadata加载
          if (node.metadata?.courseMatrixData) {
            setCourseMatrixData(node.metadata.courseMatrixData)
          }
        }
      }
      loadMatrix()
    }
  }, [node?.id, node?.type])

  useEffect(() => {
    if (!isEditingCourseMatrix || isAutoSavePaused) return

    const autoSaveInterval = setInterval(() => {
      handleSaveCourseMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingCourseMatrix, courseMatrixData, isAutoSavePaused])

  const handleSaveCourseMatrix = async (isAutoSave = false) => {
    setIsSavingCourseMatrix(true)

    try {
      // 更新项目名称
      if (projectTeachGoalData && projectTeachGoalData.projects) {
        projectTeachGoalData.projects.forEach((project) => {
          if (editingProjectNames[project.id] !== undefined) {
            project.name = editingProjectNames[project.id]
          }
        })
      }

      if (node?.id && api && api.matrices) {
        await api.matrices.updateCourseMatrix(node.id, courseMatrixData)
      }

      if (onUpdateNode) {
        onUpdateNode(node.id, {
          metadata: {
            ...node.metadata,
            courseMatrixData,
          },
        })
      }

      // 清空编辑状态
      setEditingProjectNames({})
    } catch (error) {
      console.error("[CourseMatrix] 保存课程矩阵失败:", error)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
    setIsSavingCourseMatrix(false)

    if (!isAutoSave) {
      setIsEditingCourseMatrix(false)
    }
  }

  const handleCancelCourseMatrix = () => {
    if (node?.metadata?.courseMatrixData) {
      setCourseMatrixData(node.metadata.courseMatrixData)
    } else {
      setCourseMatrixData({})
    }
    // 清空编辑状态
    setEditingProjectNames({})
    setIsEditingCourseMatrix(false)
  }

  const handleAddCoursePoint = (objectiveId: string, pointId: string, chapterId: string) => {
    // 暂停自动保存
    setIsAutoSavePaused(true)

    // 清除搜索框
    setCoursePointsSearch("")
    setCoursePointsSearchInDialog("")

    // 获取单元格中已存在的课点数据
    const key = `${objectiveId}-${pointId}-${chapterId}`
    const existingCoursePoints = courseMatrixData[key] || []
    const initialSelections: Record<string, "strong" | "weak"> = {}
    existingCoursePoints.forEach((cp) => {
      initialSelections[cp.id] = cp.support
    })

    setSelectedMatrixCell({ objectiveId, pointId, chapterId })
    setSelectedCoursePoints(initialSelections)
    setIsAddCoursePointDialogOpen(true)
  }

  const handleToggleCoursePointSelection = (coursePointId: string, support: "strong" | "weak") => {
    setSelectedCoursePoints((prev) => {
      const newSelections = { ...prev }
      if (newSelections[coursePointId] === support) {
        delete newSelections[coursePointId]
      } else {
        newSelections[coursePointId] = support
      }
      return newSelections
    })
  }

  const handleConfirmCoursePointSelection = () => {
    if (!selectedMatrixCell || Object.keys(selectedCoursePoints).length === 0) {
      setIsAddCoursePointDialogOpen(false)
      setSelectedMatrixCell(null)
      return
    }

    const key = `${selectedMatrixCell.objectiveId}-${selectedMatrixCell.pointId}-${selectedMatrixCell.chapterId}`

    // 从coursePointsList构建课点数据映射
    const coursePointsMap = new Map()
    coursePointsList.forEach((cp: ApiCoursePoint) => {
      const id = String(cp.id)
      coursePointsMap.set(id, { title: cp.title, description: cp.description })
    })

    setCourseMatrixData((prev) => {
      // 清空旧数据，按最新的关系重新设置
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
  }

  const handleRemoveCoursePoint = (objectiveId: string, pointId: string, chapterId: string, coursePointId: string) => {
    const key = `${objectiveId}-${pointId}-${chapterId}`
    setCourseMatrixData((prev) => ({
      ...prev,
      [key]: (prev[key] || []).filter((cp) => cp.id !== coursePointId),
    }))
  }



  // 从coursePointsList构建课点索引映射和标题映射
  const coursePointIndexMap = new Map()
  const coursePointTitleMap = new Map()
  coursePointsList.forEach((cp: ApiCoursePoint, idx: number) => {
    const id = String(cp.id)
    coursePointIndexMap.set(id, idx + 1)
    coursePointTitleMap.set(id, cp.title)
  })

  // 新增课点
  const handleAddNewCoursePoint = () => {
    const tempId = `temp-${Date.now()}`
    const newCoursePointData = {
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
    // 在列表首行插入新课点
    setCoursePointsList([newCoursePointData, ...coursePointsList])
    // 自动进入编辑模式
    setEditingCoursePointId(tempId as any)
  }

  // 保存新增课点
  const handleSaveNewCoursePoint = async () => {
    if (!editingCoursePointData.title?.trim()) {
      return
    }

    setIsSavingNewCoursePoint(true)
    try {
      // 模拟接口调用，1秒延迟
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 更新临时课点为真实数据（保留临时ID，实际应用中会从API获取真实ID）
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

      // 重新排序列表
      setCoursePointsList((prev) => {
        return prev.sort((a, b) => {
          const lengthDiff = a.title.length - b.title.length
          if (lengthDiff !== 0) {
            return lengthDiff
          }
          return a.title.localeCompare(b.title)
        })
      })
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
  }

  // 添加新项目
  const handleAddProject = () => {
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
  }

  // 删除项目
  const handleDeleteProject = (projectId: string | number) => {
    if (projectTeachGoalData) {
      setProjectTeachGoalData({
        ...projectTeachGoalData,
        projects: projectTeachGoalData.projects.filter((p) => p.id !== projectId),
      })
      // 清空该项目的编辑状态
      setEditingProjectNames((prev) => {
        const newState = { ...prev }
        delete newState[String(projectId)]
        return newState
      })
    }
  }

  // 处理拖动开始
  const handleDragStart = (projectId: string | number) => {
    setDraggedProjectId(String(projectId))
  }

  // 处理拖动结束
  const handleDragEnd = () => {
    setDraggedProjectId(null)
    setDragOverIndex(null)
  }

  // 处理拖动悬停
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  // 处理拖动离开
  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  // 处理拖动放下
  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedProjectId || !projectTeachGoalData) return

    const draggedIndex = projectTeachGoalData.projects.findIndex((p) => p.id === draggedProjectId)
    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      setDraggedProjectId(null)
      setDragOverIndex(null)
      return
    }

    // 创建新的项目数组
    const newProjects = [...projectTeachGoalData.projects]
    const [draggedProject] = newProjects.splice(draggedIndex, 1)
    newProjects.splice(targetIndex, 0, draggedProject)

    setProjectTeachGoalData({
      ...projectTeachGoalData,
      projects: newProjects,
    })

    setDraggedProjectId(null)
    setDragOverIndex(null)
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6 ">
          <h3 className="text-lg font-semibold text-foreground">课程矩阵</h3>
          <div className="flex items-center gap-3">
            {!isEditingCourseMatrix && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditTeachingObjectives?.()}
                  className="gap-2 bg-transparent"
                >
                  <Flag className="w-3.5 h-3.5" />
                  教学目标
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // 打开弹窗时清除搜索框、行内编辑状态、删除状态和课点选中状态
                    setCoursePointsSearch("")
                    setEditingCoursePointId(null)
                    setEditingCoursePointData({})
                    setDeletingCoursePointId(null)
                    setIsDeletingCoursePoints(false)
                    setSelectedCoursePointIds(new Set())
                    setIsShowCoursePointsDialog(true)
                  }}
                  disabled={isLoadingCoursePoints || coursePointsList.length === 0}
                  className="gap-2 bg-transparent"
                >
                  {isLoadingCoursePoints ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      加载中
                    </>
                  ) : (
                    <>
                      <Settings className="w-3.5 h-3.5" />
                      课点管理
                    </>
                  )}
                </Button>
              </>
            )}
            {!isEditingCourseMatrix ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingCourseMatrix(true)}
                className="gap-2 bg-transparent"
              >
                <Pencil className="w-3.5 h-3.5" />
                编辑矩阵
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelCourseMatrix}
                  className="gap-2 bg-transparent"
                  disabled={isSavingCourseMatrix}
                >
                  <X className="w-3.5 h-3.5" />
                  退出
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveCourseMatrix(false)}
                  className="gap-2"
                  disabled={isSavingCourseMatrix}
                >
                  {isSavingCourseMatrix ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      保存中
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      保存
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {projectTeachGoalData && projectTeachGoalData.goals && projectTeachGoalData.goals.length > 0 && projectTeachGoalData.projects && projectTeachGoalData.projects.length > 0 ? (
          <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              {(() => {
                // 计算第二层表头的总数
                const secondLevelHeaderCount = projectTeachGoalData.goals.reduce((count, goal) => {
                  const children = (goal.children && goal.children.length > 0) ? goal.children : []
                  return count + children.length
                }, 0)

                // 固定列宽
                const fixedColWidth = 60 // 序号
                const secondLevelColWidth = 500 // 第二层表头固定宽度

                // 计算总宽度：序号(60px) + 项目/章节(auto) + 第二层表头(500px * 数量)
                const totalWidth = 60 + (secondLevelColWidth * secondLevelHeaderCount)

                return (
                  <table className="text-base border-collapse" style={{ width: totalWidth, tableLayout: 'auto' }}>
                    <thead>
                      <tr className="border-b border-border bg-primary/10">
                        <th className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap" style={{ width: '60px' }} rowSpan={2}>
                          序号
                        </th>
                        <th className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap" rowSpan={2} style={{ minWidth: '300px' }}>
                          项目/章节
                        </th>
                        {projectTeachGoalData.goals.map((goal: ProjectTeachGoal, idx: number) => {
                          const children = (goal.children && goal.children.length > 0) ? goal.children : []
                          return children.length > 0 ? (
                            <th
                              key={goal.id || idx}
                              colSpan={children.length}
                              className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/10"
                              style={{ width: `${500 * children.length}px` }}
                            >
                              <div className="break-words">{goal.description || `目标${idx + 1}`}</div>
                            </th>
                          ) : null
                        })}
                      </tr>
                      <tr className="border-b border-border bg-primary/5">
                        {projectTeachGoalData.goals.map((goal: ProjectTeachGoal) => {
                          const children = (goal.children && goal.children.length > 0) ? goal.children : []
                          return children.map((child: ProjectTeachGoal, childIdx: number) => {
                            const cellKey = `${goal.id}-${childIdx}`
                            const childText = child.description || `子目标${childIdx + 1}`

                            return (
                              <th
                                key={cellKey}
                                className="text-center p-3 text-muted-foreground font-medium border-r border-border bg-primary/5"
                                style={{ width: `${secondLevelColWidth}px` }}
                              >
                                <div className="text-sm leading-relaxed break-words">
                                  {childText}
                                </div>
                              </th>
                            )
                          })
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {projectTeachGoalData.projects.map((project: Project, projectIdx: number) => (
                    <tr
                      key={project.id}
                      draggable={isEditingCourseMatrix}
                      onDragStart={() => handleDragStart(project.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => handleDragOver(e, projectIdx)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, projectIdx)}
                      className={cn(
                        "border-b border-border transition-colors",
                        isEditingCourseMatrix ? "cursor-move hover:bg-blue-50/50" : "hover:bg-white/50",
                        dragOverIndex === projectIdx && draggedProjectId ? "bg-blue-100/50" : ""
                      )}
                    >
                      <td className="p-3 text-center border-r border-border bg-secondary/20 font-medium">
                        {projectIdx + 1}
                      </td>
                      <td className="p-3 border-r border-border bg-white/80 whitespace-nowrap" style={{ minWidth: '300px' }}>
                        {isEditingCourseMatrix ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={editingProjectNames[project.id] !== undefined ? editingProjectNames[project.id] : project.name}
                              onChange={(e) => {
                                setEditingProjectNames((prev) => ({
                                  ...prev,
                                  [project.id]: e.target.value,
                                }))
                              }}
                              placeholder="输入项目/章节名称"
                              className="h-9 flex-1"
                            />
                            <button
                              onClick={() => handleDeleteProject(project.id)}
                              className="flex-shrink-0 p-1 text-muted-foreground hover:text-red-600 transition-colors"
                              title="删除项目"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <button
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation()
                                handleDragStart(project.id)
                              }}
                              className="flex-shrink-0 p-1 text-muted-foreground hover:text-primary transition-colors cursor-grab active:cursor-grabbing"
                              title="拖动调整顺序"
                            >
                              <GripVertical className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-base text-foreground">
                            {project.name}
                          </div>
                        )}
                      </td>
                      {projectTeachGoalData.goals.map((goal: ProjectTeachGoal) => {
                        const children = (goal.children && goal.children.length > 0) ? goal.children : []
                        return children.map((child: ProjectTeachGoal, childIdx: number) => {
                          const key = `${goal.id}-${child.id}-${project.id}`
                          const coursePoints = courseMatrixData[key] || []

                          return (
                            <td key={`${goal.id}-${childIdx}`} className="p-3 text-center border-r border-border" style={{ width: '500px' }}>
                              {isEditingCourseMatrix ? (
                                <div className="flex flex-col items-center gap-2">
                                  {coursePoints.length > 0 && (
                                    <div className="flex flex-wrap gap-2 justify-center">
                                      {coursePoints.map((cp) => (
                                        <div key={cp.id} className="relative group/label">
                                          <SupportLabel
                                            title={coursePointTitleMap.get(cp.id) || cp.name || cp.id}
                                            desc={cp.description}
                                            type={cp.support}
                                            showRemoveButton={true}
                                            onRemove={() =>
                                              handleRemoveCoursePoint(String(goal.id), String(child.id), String(project.id), cp.id)
                                            }
                                            size="md"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <button
                                    onClick={() => handleAddCoursePoint(String(goal.id), String(child.id), String(project.id))}
                                    className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group"
                                  >
                                    <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {coursePoints.length > 0 ? (
                                    coursePoints.map((cp) => (
                                      <SupportLabel
                                        key={cp.id}
                                        title={coursePointTitleMap.get(cp.id) || cp.name || cp.id}
                                        desc={cp.description}
                                        type={cp.support}
                                        size="md"
                                      />
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })
                      })}
                    </tr>
                      ))}
                      {isEditingCourseMatrix && (
                        <tr className="border-b border-border hover:bg-white/50 transition-colors">
                          <td className="p-3 text-center border-r border-border bg-secondary/20" style={{ width: '60px' }}></td>
                          <td className="p-3 text-center border-r border-border bg-white/80" style={{ minWidth: '300px' }}>
                            <button
                              onClick={handleAddProject}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 transition-all group"
                            >
                              <Plus className="w-4 h-4 text-primary/60 group-hover:text-primary" />
                            </button>
                          </td>
                          {Array.from({ length: secondLevelHeaderCount }).map((_, idx) => (
                            <td key={`add-row-${idx}`} className="p-3 text-center border-r border-border" style={{ width: '500px' }}></td>
                          ))}
                        </tr>
                      )}
                    </tbody>
                  </table>
                )
              })()}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
            {isLoadingProjectTeachGoal ? (
              <>
                <Loader2 className="w-6 h-6 mx-auto mb-3 animate-spin" />
                <p className="text-sm mb-2">加载数据中...</p>
              </>
            ) : (
              <>
                <p className="text-sm mb-2">暂无课程矩阵数据</p>
                <p className="text-xs">请先在课程信息中添加教学目标和章节信息</p>
              </>
            )}
          </div>
        )}
      </div>



      {/* 课点管理弹窗 */}
      <Dialog
        open={isShowCoursePointsDialog}
        onOpenChange={(open) => {
          // 如果删除或编辑未完成，禁止关闭弹窗
          if (!open && (isDeletingCoursePoints || deletingCoursePointId !== null || isSavingNewCoursePoint || isSavingEditingCoursePoint)) {
            return
          }
          setIsShowCoursePointsDialog(open)
        }}
      >
        <DialogContent className="!max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
          {/* 固定Header */}
          <DialogHeader className="border-b border-border px-6 py-4 flex-shrink-0">
            <DialogTitle>课点管理</DialogTitle>
          </DialogHeader>

          {/* 固定搜索工具栏 */}
          <div className="px-6 py-3 flex-shrink-0 bg-background">
            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="text"
                  placeholder="搜索课点..."
                  value={coursePointsSearch}
                  onChange={(e) => setCoursePointsSearch(e.target.value)}
                  disabled={editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 flex-shrink-0"
                onClick={handleAddNewCoursePoint}
                disabled={isSavingNewCoursePoint || editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
              >
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <div className="flex-shrink-0">
                <FileUpload
                  buttonText="上传"
                  fileType="Excel文件"
                  maxFileSize={10 * 1024 * 1024}
                  maxFileCount={1}
                  accept=".xlsx,.xls"
                  disabled={editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
                  onUpload={async (files) => {
                    // TODO: 将文件上传到OSS，返回文件地址
                    // 目前mock返回文件地址
                    return files.map((file) => `/uploads/${file.name}`)
                  }}
                />
              </div>
            </div>
          </div>

          {/* 可滚动内容区域 - 只有表格body滚动 */}
          <div className="flex-1 overflow-hidden flex flex-col">
            {isLoadingCoursePoints ? (
              <div className="flex items-center justify-center py-8 flex-1">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : coursePointsList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm flex-1 flex items-center justify-center">
                暂无课点数据
              </div>
            ) : (
              <div className="flex flex-col overflow-hidden flex-1">
                {/* 固定表头 */}
                <div className="overflow-x-auto border-b border-border flex-shrink-0">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30">
                        <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-12">
                          <input
                            type="checkbox"
                            checked={selectedCoursePointIds.size === coursePointsList.filter((cp) =>
                              cp.title.toLowerCase().includes(coursePointsSearch.toLowerCase()) ||
                              cp.description.toLowerCase().includes(coursePointsSearch.toLowerCase())
                            ).length && coursePointsList.filter((cp) =>
                              cp.title.toLowerCase().includes(coursePointsSearch.toLowerCase()) ||
                              cp.description.toLowerCase().includes(coursePointsSearch.toLowerCase())
                            ).length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                const filtered = coursePointsList.filter((cp) =>
                                  cp.title.toLowerCase().includes(coursePointsSearch.toLowerCase()) ||
                                  cp.description.toLowerCase().includes(coursePointsSearch.toLowerCase())
                                )
                                setSelectedCoursePointIds(new Set(filtered.map((cp) => cp.id)))
                              } else {
                                setSelectedCoursePointIds(new Set())
                              }
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[150px]">课点名称</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-foreground">课点描述</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-24">操作</th>
                      </tr>
                    </thead>
                  </table>
                </div>

                {/* 可滚动表格body */}
                <div className="overflow-y-auto flex-1">
                  <table className="w-full">
                    <tbody>
                      {coursePointsList
                        .filter((cp) =>
                          cp.title.toLowerCase().includes(coursePointsSearch.toLowerCase()) ||
                          cp.description.toLowerCase().includes(coursePointsSearch.toLowerCase())
                        )
                        .sort((a, b) => {
                          // 按课点名称长度升序排列
                          const lengthDiff = a.title.length - b.title.length
                          if (lengthDiff !== 0) {
                            return lengthDiff
                          }
                          // 如果长度相同，按字母顺序排列
                          return a.title.localeCompare(b.title)
                        })
                        .map((coursePoint) => (
                          <tr key={coursePoint.id} className="border-b border-border hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-3 text-center w-12">
                              <input
                                type="checkbox"
                                checked={selectedCoursePointIds.has(coursePoint.id)}
                                onChange={(e) => {
                                  const newSelected = new Set(selectedCoursePointIds)
                                  if (e.target.checked) {
                                    newSelected.add(coursePoint.id)
                                  } else {
                                    newSelected.delete(coursePoint.id)
                                  }
                                  setSelectedCoursePointIds(newSelected)
                                }}
                                disabled={editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
                                className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm w-[150px]">
                              {editingCoursePointId === coursePoint.id ? (
                                <Input
                                  type="text"
                                  value={editingCoursePointData.title || coursePoint.title}
                                  onChange={(e) =>
                                    setEditingCoursePointData((prev) => ({
                                      ...prev,
                                      title: e.target.value,
                                    }))
                                  }
                                  className="h-8"
                                />
                              ) : (
                                coursePoint.title
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {editingCoursePointId === coursePoint.id ? (
                                <Input
                                  type="text"
                                  value={editingCoursePointData.description || coursePoint.description}
                                  onChange={(e) =>
                                    setEditingCoursePointData((prev) => ({
                                      ...prev,
                                      description: e.target.value,
                                    }))
                                  }
                                  className="h-8"
                                />
                              ) : (
                                coursePoint.description
                              )}
                            </td>
                            <td className="px-4 py-3 text-center w-24">
                              <div className="flex items-center justify-center gap-2">
                                {editingCoursePointId === coursePoint.id ? (
                                  <>
                                    <button
                                      onClick={async () => {
                                        // 如果是新增课点，调用保存函数
                                        if (newCoursePoint && coursePoint.id === newCoursePoint.id) {
                                          await handleSaveNewCoursePoint()
                                        } else {
                                          // 编辑行：调用接口保存
                                          setIsSavingEditingCoursePoint(true)
                                          try {
                                            // 调用API更新课点（API内部会处理1秒延迟）
                                            const response = await api.coursePoints.updateCoursePoint(coursePoint.id, editingCoursePointData)
                                            if (response.error) {
                                              showError(response.error)
                                              return
                                            }
                                            // 接口返回正确后退出编辑模式
                                            setEditingCoursePointId(null)
                                            setEditingCoursePointData({})
                                            showSuccess("课点更新成功")
                                          } catch (error) {
                                            console.error("更新课点失败:", error)
                                            showError("更新课点失败，请重试")
                                          } finally {
                                            setIsSavingEditingCoursePoint(false)
                                          }
                                        }
                                      }}
                                      disabled={isSavingNewCoursePoint || isSavingEditingCoursePoint || !editingCoursePointData.title?.trim()}
                                      className="p-1 text-muted-foreground hover:text-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="提交"
                                    >
                                      {isSavingNewCoursePoint || isSavingEditingCoursePoint ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Check className="w-4 h-4" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => {
                                        // 如果是新增课点，检查是否有空字段，有则移除该行
                                        if (newCoursePoint && coursePoint.id === newCoursePoint.id) {
                                          if (!editingCoursePointData.title?.trim() || !editingCoursePointData.description?.trim()) {
                                            // 有空字段，直接移除该行
                                            setCoursePointsList((prev) => prev.filter((cp) => cp.id !== coursePoint.id))
                                            setNewCoursePoint(null)
                                          }
                                        } else {
                                          // 编辑行：恢复原内容
                                          setEditingCoursePointData({})
                                        }
                                        // 退出编辑模式
                                        setEditingCoursePointId(null)
                                      }}
                                      disabled={isSavingNewCoursePoint || isSavingEditingCoursePoint}
                                      className="p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="取消"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingCoursePointId(coursePoint.id)
                                        setEditingCoursePointData(coursePoint)
                                      }}
                                      disabled={editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
                                      className="p-1 text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="编辑"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={async () => {
                                        setDeletingCoursePointId(coursePoint.id)
                                        try {
                                          // 调用API删除课点（API内部会处理1秒延迟）
                                          const response = await api.coursePoints.deleteCoursePoint(coursePoint.id)
                                          if (response.error) {
                                            showError(response.error)
                                            return
                                          }
                                          setCoursePointsList((prev) => prev.filter((cp) => cp.id !== coursePoint.id))
                                        } catch (error) {
                                          console.error("删除课点失败:", error)
                                          showError("删除课点失败，请重试")
                                        } finally {
                                          setDeletingCoursePointId(null)
                                        }
                                      }}
                                      disabled={editingCoursePointId !== null || isDeletingCoursePoints || deletingCoursePointId !== null}
                                      className="p-1 text-muted-foreground hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      title="删除"
                                    >
                                      {deletingCoursePointId === coursePoint.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="w-4 h-4" />
                                      )}
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 固定Footer */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
            <Button
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (selectedCoursePointIds.size === 0) return
                setIsDeletingCoursePoints(true)
                try {
                  const deleteCount = selectedCoursePointIds.size
                  // 调用API删除课点（API内部会处理1秒延迟）
                  for (const id of selectedCoursePointIds) {
                    const response = await api.coursePoints.deleteCoursePoint(id)
                    if (response.error) {
                      showError(response.error)
                      return
                    }
                  }
                  setCoursePointsList((prev) => prev.filter((cp) => !selectedCoursePointIds.has(cp.id)))
                  setSelectedCoursePointIds(new Set())
                  showSuccess(`成功删除 ${deleteCount} 个课点`)
                } catch (error) {
                  console.error("删除课点失败:", error)
                  showError("删除课点失败，请重试")
                } finally {
                  setIsDeletingCoursePoints(false)
                }
              }}
              disabled={selectedCoursePointIds.size === 0 || isDeletingCoursePoints}
              className="gap-2"
            >
              {isDeletingCoursePoints ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              删除选中 ({selectedCoursePointIds.size})
            </Button>
            <Button variant="outline" onClick={() => {
              setIsShowCoursePointsDialog(false)
              setSelectedCoursePointIds(new Set())
              setNewCoursePoint(null)
              setEditingCoursePointId(null)
              setEditingCoursePointData({})
              setIsSavingEditingCoursePoint(false)
              setDeletingCoursePointId(null)
            }}>
              关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isAddCoursePointDialogOpen}
        onOpenChange={(open) => {
          setIsAddCoursePointDialogOpen(open)
          // 关闭弹窗时恢复自动保存
          if (!open) {
            setIsAutoSavePaused(false)
          }
        }}
      >
        <DialogContent className="!max-w-2xl max-h-[80vh] flex flex-col p-0 gap-0">
          {/* 固定Header */}
          <DialogHeader className="border-b border-border px-6 py-4 flex-shrink-0">
            <DialogTitle>设置课点支撑度</DialogTitle>
          </DialogHeader>

          {/* 固定搜索工具栏 */}
          <div className="px-6 py-3 flex-shrink-0 bg-background border-b border-border">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
              <input
                type="text"
                placeholder="搜索课点..."
                value={coursePointsSearchInDialog}
                onChange={(e) => setCoursePointsSearchInDialog(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* 可滚动内容区域 */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {coursePointsList && coursePointsList.length > 0 ? (
                coursePointsList
                  .filter((cp) =>
                    cp.title.toLowerCase().includes(coursePointsSearchInDialog.toLowerCase()) ||
                    cp.description.toLowerCase().includes(coursePointsSearchInDialog.toLowerCase())
                  )
                  .sort((a, b) => {
                    // 按课点名称长度升序排列
                    const lengthDiff = a.title.length - b.title.length
                    if (lengthDiff !== 0) {
                      return lengthDiff
                    }
                    // 如果长度相同，按字母顺序排列
                    return a.title.localeCompare(b.title)
                  })
                  .map((coursePoint: ApiCoursePoint, idx: number) => {
                    const cpId = String(coursePoint.id)
                    const cpTitle = coursePoint.title || `课点 ${idx + 1}`
                    const isStrongSelected = selectedCoursePoints[cpId] === "strong"
                    const isWeakSelected = selectedCoursePoints[cpId] === "weak"

                    return (
                      <div
                        key={cpId}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{cpTitle}</div>
                            {coursePoint.description && (
                              <div className="text-xs text-muted-foreground truncate">{coursePoint.description}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            size="sm"
                            variant={isStrongSelected ? "default" : "outline"}
                            onClick={() => handleToggleCoursePointSelection(cpId, "strong")}
                            className={cn(
                              "gap-1",
                              isStrongSelected && "bg-orange-500 hover:bg-orange-600 text-white border-orange-500",
                            )}
                          >
                            强支撑
                          </Button>
                          <Button
                            size="sm"
                            variant={isWeakSelected ? "default" : "outline"}
                            onClick={() => handleToggleCoursePointSelection(cpId, "weak")}
                            className={cn(
                              "gap-1",
                              isWeakSelected && "bg-green-500 hover:bg-green-600 text-white border-green-500",
                            )}
                          >
                            弱支撑
                          </Button>
                        </div>
                      </div>
                    )
                  })
              ) : (
                <div className="text-center py-8 text-muted-foreground">暂无课点数据</div>
              )}
            </div>
          </div>

          {/* 固定Footer */}
          <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCoursePointDialogOpen(false)
                setSelectedMatrixCell(null)
                setSelectedCoursePoints({})
                // 恢复自动保存
                setIsAutoSavePaused(false)
              }}
            >
              取消
            </Button>
            <Button
              onClick={() => {
                handleConfirmCoursePointSelection()
                // 恢复自动保存
                setIsAutoSavePaused(false)
              }}
              disabled={Object.keys(selectedCoursePoints).length === 0}
            >
              确认 {Object.keys(selectedCoursePoints).length > 0 && `(${Object.keys(selectedCoursePoints).length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
