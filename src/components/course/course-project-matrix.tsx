"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/shared/components/ui/tooltip"
import { Grid3x3, Edit, Check, X, Loader2, Plus, Trash2, BookMarked, Settings, Flag } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import { api } from "@/lib/api"
import { SupportLabel } from "@/shared/components/support-label"

interface CourseProjectMatrixProps {
  node: TreeNode
  onUpdate: (updates: Partial<TreeNode["metadata"]>) => void
}

export function CourseProjectMatrix({ node, onUpdate }: CourseProjectMatrixProps) {
  const [isEditingProjectMatrix, setIsEditingProjectMatrix] = useState(false)
  const [isSavingProjectMatrix, setIsSavingProjectMatrix] = useState(false)
  const [projectMatrixData, setProjectMatrixData] = useState<any>(null)
  const [chapterTaskObjectives, setChapterTaskObjectives] = useState<Record<string, any[]>>({})
  const [ksaData, setKsaData] = useState<Record<string, Record<string, "strong" | "weak">>>({})
  const [isLoadingProjectMatrix, setIsLoadingProjectMatrix] = useState(false)
  const [ksaListData, setKsaListData] = useState<any[]>([])
  const [isLoadingKsaList, setIsLoadingKsaList] = useState(true)

  // 防止在StrictMode下重复调用API
  const hasLoadedRef = useRef(false)
  const prevNodeIdRef = useRef<string | null>(null)

  const [taskObjectivesDialogOpen, setTaskObjectivesDialogOpen] = useState(false)
  const [selectedChapterForTasks, setSelectedChapterForTasks] = useState<string | null>(null)
  const [newTaskObjective, setNewTaskObjective] = useState("")
  const [newTaskStandard, setNewTaskStandard] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [focusedCell, setFocusedCell] = useState<string | null>(null)

  const [ksaDialogOpen, setKsaDialogOpen] = useState(false)
  const [selectedKsaCell, setSelectedKsaCell] = useState<{
    chapterId: string
    coursePointId: string
    taskId: string
  } | null>(null)
  const [selectedKsaSupport, setSelectedKsaSupport] = useState<Record<string, "strong" | "weak">>({})

  // KSA editing states
  const [ksaSearchK, setKsaSearchK] = useState("")
  const [ksaSearchS, setKsaSearchS] = useState("")
  const [ksaSearchA, setKsaSearchA] = useState("")

  // KSA管理相关状态
  const [newRowKsaType, setNewRowKsaType] = useState<string | null>(null) // 跟踪哪个分类有新增行
  const [newRowDescription, setNewRowDescription] = useState("") // 新增行的描述
  const [editingKsaId, setEditingKsaId] = useState<number | null>(null) // 当前编辑的KSA ID
  const [editingDescription, setEditingDescription] = useState("") // 编辑中的描述

  useEffect(() => {
    // 从metadata加载本地数据
    const metadata = node.metadata as any
    if (metadata?.projectMatrixData) {
      setProjectMatrixData(metadata.projectMatrixData)
    }
    if (metadata?.chapterTaskObjectives) {
      setChapterTaskObjectives(metadata.chapterTaskObjectives)
    }
    if (metadata?.ksaData) {
      setKsaData(metadata.ksaData)
    }

    // 当node改变时，重置ref
    if (prevNodeIdRef.current !== node.id) {
      hasLoadedRef.current = false
      prevNodeIdRef.current = node.id
    }

    // 防止在StrictMode下重复调用
    if (hasLoadedRef.current) {
      return
    }
    hasLoadedRef.current = true

    // 调用API获取项目矩阵数据和KSA列表
    const loadProjectMatrixData = async () => {
      try {
        setIsLoadingProjectMatrix(true)

        // 从node.metadata中获取courseId和majorId
        const courseIdValue = (node.metadata as any)?.courseId
        const majorIdValue = (node.metadata as any)?.parentMajorId

        if (!courseIdValue) {
          console.warn("[CourseProjectMatrix] 缺少courseId")
          return
        }

        // 获取项目矩阵数据（包含项目章节列表）
        const projectMatrixResponse = await api.matrices.getProjectMatrixData(String(courseIdValue))
        if (projectMatrixResponse.error) {
          console.error("[CourseProjectMatrix] 获取项目矩阵数据失败:", projectMatrixResponse.error)
        } else if (projectMatrixResponse.data) {
          console.log("[CourseProjectMatrix] 项目矩阵数据加载成功:", projectMatrixResponse.data)
          // 保存API返回的项目矩阵数据
          setProjectMatrixData(projectMatrixResponse.data)
        }

        // 获取KSA列表数据
        if (majorIdValue && courseIdValue) {
          try {
            const ksaListResponse = await api.matrices.getKsaList(String(majorIdValue), String(courseIdValue))
            console.log("[CourseProjectMatrix] KSA列表响应:", ksaListResponse)
            if (ksaListResponse.error) {
              console.error("[CourseProjectMatrix] 获取KSA列表失败:", ksaListResponse.error)
              // 如果API调用失败，尝试使用模拟数据
              console.log("[CourseProjectMatrix] 使用模拟数据")
              const mockKsaData = [
                { id: 1, title: "K", description: "知识点1", level: 1 },
                { id: 2, title: "K", description: "知识点2", level: 2 },
                { id: 3, title: "S", description: "技能点1", level: 1 },
                { id: 4, title: "S", description: "技能点2", level: 2 },
                { id: 5, title: "A", description: "态度点1", level: 1 },
                { id: 6, title: "A", description: "态度点2", level: 2 },
              ]
              setKsaListData(mockKsaData)
            } else if (ksaListResponse.data) {
              console.log("[CourseProjectMatrix] KSA列表加载成功:", ksaListResponse.data)
              // ksaListResponse.data 已经是处理后的KSA数组，不需要再取.data字段
              const ksaArray = Array.isArray(ksaListResponse.data) ? ksaListResponse.data : []
              console.log("[CourseProjectMatrix] 提取的KSA数组:", ksaArray)
              setKsaListData(ksaArray)
            }
          } catch (error) {
            console.error("[CourseProjectMatrix] 获取KSA列表异常:", error)
          } finally {
            // KSA列表加载完成（无论成功或失败）
            setIsLoadingKsaList(false)
          }
        } else {
          // 如果缺少majorId或courseId，直接标记为加载完成
          setIsLoadingKsaList(false)
        }
      } catch (error) {
        console.error("[CourseProjectMatrix] 加载数据异常:", error)
      } finally {
        setIsLoadingProjectMatrix(false)
      }
    }

    loadProjectMatrixData()
  }, [node.id])

  const handleSaveProjectMatrix = async (isAutoSave = false) => {
    setIsSavingProjectMatrix(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    onUpdate({
      projectMatrixData,
      chapterTaskObjectives,
      ksaData,
    })

    setIsSavingProjectMatrix(false)
    if (!isAutoSave) {
      setIsEditingProjectMatrix(false)
    }
  }

  const handleCancelProjectMatrix = () => {
    const metadata = node.metadata as any
    if (metadata?.projectMatrixData) {
      setProjectMatrixData(metadata.projectMatrixData)
    }
    if (metadata?.chapterTaskObjectives) {
      setChapterTaskObjectives(metadata.chapterTaskObjectives)
    }
    if (metadata?.ksaData) {
      setKsaData(metadata.ksaData)
    }
    setIsEditingProjectMatrix(false)
  }

  const handleOpenTaskObjectivesDialog = (chapterId: string) => {
    setSelectedChapterForTasks(chapterId)
    setTaskObjectivesDialogOpen(true)
  }

  const handleAddTaskObjective = () => {
    if (!selectedChapterForTasks || !newTaskObjective.trim()) return

    const newTask = {
      id: `task-${Date.now()}`,
      objective: newTaskObjective.trim(),
      standard: newTaskStandard.trim(),
    }

    const updatedTaskObjectives = {
      ...chapterTaskObjectives,
      [selectedChapterForTasks]: [...(chapterTaskObjectives[selectedChapterForTasks] || []), newTask],
    }

    setChapterTaskObjectives(updatedTaskObjectives)

    // Auto-save to metadata
    onUpdate({
      chapterTaskObjectives: updatedTaskObjectives,
    })

    setNewTaskObjective("")
    setNewTaskStandard("")
  }

  const handleEditTaskObjective = (taskId: string) => {
    if (!selectedChapterForTasks) return
    const task = chapterTaskObjectives[selectedChapterForTasks]?.find((t) => t.id === taskId)
    if (task) {
      setEditingTaskId(taskId)
      setNewTaskObjective(task.objective)
      setNewTaskStandard(task.standard)
    }
  }

  const handleUpdateTaskObjective = () => {
    if (!selectedChapterForTasks || !editingTaskId || !newTaskObjective.trim()) return

    const updatedTaskObjectives = {
      ...chapterTaskObjectives,
      [selectedChapterForTasks]: chapterTaskObjectives[selectedChapterForTasks].map((task) =>
        task.id === editingTaskId
          ? { ...task, objective: newTaskObjective.trim(), standard: newTaskStandard.trim() }
          : task,
      ),
    }

    setChapterTaskObjectives(updatedTaskObjectives)

    // Auto-save to metadata
    onUpdate({
      chapterTaskObjectives: updatedTaskObjectives,
    })

    setEditingTaskId(null)
    setNewTaskObjective("")
    setNewTaskStandard("")
  }

  const handleDeleteTaskObjective = (taskId: string) => {
    if (!selectedChapterForTasks) return

    const updatedTaskObjectives = {
      ...chapterTaskObjectives,
      [selectedChapterForTasks]: chapterTaskObjectives[selectedChapterForTasks].filter((task) => task.id !== taskId),
    }

    setChapterTaskObjectives(updatedTaskObjectives)

    // Auto-save to metadata
    onUpdate({
      chapterTaskObjectives: updatedTaskObjectives,
    })
  }

  const handleOpenKsaDialog = (chapterId: string, coursePointId: string, taskId: string) => {
    console.log("[handleOpenKsaDialog] 打开KSA对话框", { chapterId, coursePointId, taskId })
    console.log("[handleOpenKsaDialog] ksaListData:", ksaListData)
    console.log("[handleOpenKsaDialog] ksaListData长度:", ksaListData?.length)

    setSelectedKsaCell({ chapterId, coursePointId, taskId })

    // Load existing KSA support data
    const ksaKey = `${chapterId}-${coursePointId}-${taskId}`
    const existingKsa = ksaData[ksaKey] || {}
    setSelectedKsaSupport(existingKsa)

    // Reset search states
    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")

    setKsaDialogOpen(true)
  }







  const handleToggleKsaSupport = (infoPointId: string) => {
    setSelectedKsaSupport((prev) => {
      const newSupport = { ...prev }
      const currentSupport = newSupport[infoPointId]

      if (!currentSupport) {
        newSupport[infoPointId] = "strong"
      } else if (currentSupport === "strong") {
        newSupport[infoPointId] = "weak"
      } else {
        delete newSupport[infoPointId]
      }

      return newSupport
    })
  }

  const handleSaveKsa = () => {
    if (!selectedKsaCell) return

    // 如果是全局KSA管理模式，只关闭弹窗
    if (selectedKsaCell.chapterId === "global") {
      setKsaDialogOpen(false)
      setSelectedKsaCell(null)
      setSelectedKsaSupport({})
      setKsaSearchK("")
      setKsaSearchS("")
      setKsaSearchA("")
      return
    }

    const ksaKey = `${selectedKsaCell.chapterId}-${selectedKsaCell.coursePointId}-${selectedKsaCell.taskId}`

    // Save the selected KSA support data
    setKsaData((prev) => ({
      ...prev,
      [ksaKey]: selectedKsaSupport,
    }))

    setKsaDialogOpen(false)
    setSelectedKsaCell(null)
    setSelectedKsaSupport({})
    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Grid3x3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">项目矩阵</h3>
            <p className="text-xs text-muted-foreground mt-0.5">管理每个章节/项目的教学任务目标和实施细节</p>
          </div>
        </div>
        {isEditingProjectMatrix ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancelProjectMatrix}
              disabled={isSavingProjectMatrix}
              className="gap-2 bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveProjectMatrix(false)}
              disabled={isSavingProjectMatrix}
              className="gap-2"
            >
              {isSavingProjectMatrix ? (
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
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // 打开全局KSA管理弹窗，设置一个虚拟的selectedKsaCell以显示所有KSA数据
                setSelectedKsaCell({ chapterId: "global", coursePointId: "global", taskId: "global" })
                setSelectedKsaSupport({})
                setKsaSearchK("")
                setKsaSearchS("")
                setKsaSearchA("")
                setKsaDialogOpen(true)
              }}
              disabled={isLoadingKsaList}
              className="gap-2"
            >
              {isLoadingKsaList ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中
                </>
              ) : (
                <>
                  <Settings className="w-4 h-4" />
                  KSA
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => setIsEditingProjectMatrix(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              编辑矩阵
            </Button>
          </div>
        )}
      </div>

      {isLoadingProjectMatrix ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">加载中</span>
        </div>
      ) : projectMatrixData?.projects && projectMatrixData.projects.length > 0 ? (
        <Accordion type="multiple" className="space-y-3">
          {projectMatrixData.projects.map((projectItem: any, projectIdx: number) => {
            const project = projectItem.project
            const goals = projectItem.goals || []
            const projectId = project.id || `project-${projectIdx}`
            const projectName = project.name || `项目${projectIdx + 1}`

            return (
              <AccordionItem key={projectId} value={projectId} className="border border-border rounded-lg">
                <div className="relative">
                  <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/30 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                        {projectIdx + 1}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-base font-semibold text-foreground">{projectName}</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10 flex gap-2">
                    {!isEditingProjectMatrix && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTaskObjectivesDialog(projectId)
                        }}
                        className="gap-2"
                      >
                        <Flag className="w-4 h-4" />
                        任务目标
                      </Button>
                    )}
                  </div>
                </div>
                <AccordionContent className="px-5 pb-5">
                  <div className="border-t border-dashed border-border mb-4" />

                  {/* 项目矩阵表格 */}
                  {goals.length > 0 ? (
                    <div className="border border-border overflow-hidden w-[98%] mx-[1%]">
                      <div className="overflow-x-auto">
                        <table className="w-auto text-xs border-collapse border border-border" style={{ tableLayout: 'fixed' }}>
                            <thead>
                              {/* 第一行表头 */}
                              <tr className="bg-secondary/50 border-b border-border">
                                <th rowSpan={2} className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[100px] align-middle">
                                  课点
                                </th>
                                {goals.map((goal: any, goalIdx: number) => (
                                  <th key={goal.id || goalIdx} rowSpan={2} className="text-left p-2 text-muted-foreground font-medium border-r border-border align-middle">
                                    <div className="text-xs whitespace-normal break-words">{goal.description}</div>
                                  </th>
                                ))}
                                <th rowSpan={2} className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[120px] align-middle">
                                  学法
                                </th>
                                <th rowSpan={2} className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[220px] align-middle">
                                  教法
                                </th>
                                <th rowSpan={2} className="text-center p-2 text-muted-foreground font-medium border-r border-border w-[280px] align-middle">
                                  课点学习产出及测量
                                </th>
                                <th colSpan={2} className="text-center p-2 text-muted-foreground font-medium border-r border-border align-middle">
                                  教学安排
                                </th>
                              </tr>
                              {/* 第二行表头 - 仅教学安排的子列 */}
                              <tr className="bg-secondary/50 border-b border-border">
                                <th className="text-center p-1 text-muted-foreground font-medium border-r border-border w-[70px] align-middle whitespace-nowrap text-xs">
                                  开课周数
                                </th>
                                <th className="text-center p-1 text-muted-foreground font-medium w-[60px] align-middle whitespace-nowrap text-xs">
                                  学时数
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {projectMatrixData?.data
                                ?.filter((item: any) => item.courseMatrix?.projectId === projectId)
                                .map((item: any, rowIdx: number) => (
                                  <tr key={item.courseMatrix?.id || rowIdx} className="border-b border-border hover:bg-secondary/20">
                                    <td className="p-2 text-center border-r border-border">
                                      <SupportLabel
                                        title={item.courseMatrix?.point?.title}
                                        desc={item.courseMatrix?.point?.description}
                                        type={item.courseMatrix?.relate?.relate === 0 ? "strong" : "weak"}
                                        size="md"
                                        tipsPosition="right"
                                      />
                                    </td>
                                    {goals.map((goal: any, goalIdx: number) => {
                                      // 查找该教学目标对应的所有projectMatrix
                                      const goalProjectMatrices = item.projectMatrices?.filter(
                                        (pm: any) => pm.taskGoalId === goal.id
                                      ) || []

                                      return (
                                        <td key={goal.id || goalIdx} className="p-2 text-center border-r border-border text-foreground">
                                          {isEditingProjectMatrix ? (
                                            <div className={`flex items-center justify-center gap-2 flex-wrap ${goalProjectMatrices.length === 0 ? 'min-h-[32px]' : ''}`}>
                                              {goalProjectMatrices.map((pm: any, pmIdx: number) => (
                                                <SupportLabel
                                                  key={pm.id || pmIdx}
                                                  title={`${pm.ksa?.title}${pm.ksa?.level}`}
                                                  desc={pm.ksa?.description}
                                                  type={pm.relate?.relate === 0 ? "strong" : "weak"}
                                                  size="md"
                                                />
                                              ))}
                                              <button
                                                onClick={() => handleOpenKsaDialog(projectId, item.courseMatrix?.point?.id, goal.id)}
                                                className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group flex-shrink-0"
                                                title="添加KSA支撑关系"
                                              >
                                                <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                                              </button>
                                            </div>
                                          ) : (
                                            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[32px]">
                                              {goalProjectMatrices.length > 0 ? (
                                                goalProjectMatrices.map((pm: any, pmIdx: number) => (
                                                  <SupportLabel
                                                    key={pm.id || pmIdx}
                                                    title={`${pm.ksa?.title}${pm.ksa?.level}`}
                                                    desc={pm.ksa?.description}
                                                    type={pm.relate?.relate === 0 ? "strong" : "weak"}
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
                                    })}
                                    <td className="p-2 text-center border-r border-border text-foreground w-[120px] overflow-hidden">
                                      {isEditingProjectMatrix ? (
                                        focusedCell === `study-${item.courseMatrix?.id}` ? (
                                          <textarea
                                            autoFocus
                                            value={item.courseMatrix?.study || ''}
                                            onChange={() => {}}
                                            onBlur={() => setFocusedCell(null)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                            placeholder="输入学法"
                                            rows={4}
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.courseMatrix?.study || ''}
                                            onChange={() => {}}
                                            onFocus={() => setFocusedCell(`study-${item.courseMatrix?.id}`)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            placeholder="输入学法"
                                          />
                                        )
                                      ) : (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-xs line-clamp-1 cursor-help">{item.courseMatrix?.study || '-'}</span>
                                            </TooltipTrigger>
                                            {item.courseMatrix?.study && (
                                              <TooltipContent side="top" align="center">
                                                {item.courseMatrix.study}
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </td>
                                    <td className="p-2 text-center border-r border-border text-foreground w-[220px] overflow-hidden">
                                      {isEditingProjectMatrix ? (
                                        focusedCell === `teach-${item.courseMatrix?.id}` ? (
                                          <textarea
                                            autoFocus
                                            value={item.courseMatrix?.teach || ''}
                                            onChange={() => {}}
                                            onBlur={() => setFocusedCell(null)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                            placeholder="输入教法"
                                            rows={4}
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.courseMatrix?.teach || ''}
                                            onChange={() => {}}
                                            onFocus={() => setFocusedCell(`teach-${item.courseMatrix?.id}`)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            placeholder="输入教法"
                                          />
                                        )
                                      ) : (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-xs line-clamp-1 cursor-help">{item.courseMatrix?.teach || '-'}</span>
                                            </TooltipTrigger>
                                            {item.courseMatrix?.teach && (
                                              <TooltipContent side="top" align="center">
                                                {item.courseMatrix.teach}
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </td>
                                    <td className="p-2 text-center border-r border-border text-foreground w-[280px] overflow-hidden">
                                      {isEditingProjectMatrix ? (
                                        focusedCell === `product-${item.courseMatrix?.id}` ? (
                                          <textarea
                                            autoFocus
                                            value={item.courseMatrix?.product || ''}
                                            onChange={() => {}}
                                            onBlur={() => setFocusedCell(null)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                                            placeholder="输入学习产出"
                                            rows={6}
                                          />
                                        ) : (
                                          <input
                                            type="text"
                                            value={item.courseMatrix?.product || ''}
                                            onChange={() => {}}
                                            onFocus={() => setFocusedCell(`product-${item.courseMatrix?.id}`)}
                                            className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                            placeholder="输入学习产出"
                                          />
                                        )
                                      ) : (
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="text-xs line-clamp-1 cursor-help">{item.courseMatrix?.product || '-'}</span>
                                            </TooltipTrigger>
                                            {item.courseMatrix?.product && (
                                              <TooltipContent side="top" align="center">
                                                {item.courseMatrix.product}
                                              </TooltipContent>
                                            )}
                                          </Tooltip>
                                        </TooltipProvider>
                                      )}
                                    </td>
                                    {/* 教学安排 - 开课周数 */}
                                    <td className="p-1 text-center border-r border-border text-foreground w-[70px]">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={item.courseMatrix?.week || ''}
                                          onChange={() => {}}
                                          className="w-full px-0.5 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="周数"
                                        />
                                      ) : (
                                        <span className="text-xs">{item.courseMatrix?.week || '-'}</span>
                                      )}
                                    </td>
                                    {/* 教学安排 - 学时数 */}
                                    <td className="p-1 text-center text-foreground w-[60px]">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={item.courseMatrix?.period || ''}
                                          onChange={() => {}}
                                          className="w-full px-0.5 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="学时"
                                        />
                                      ) : (
                                        <span className="text-xs">{item.courseMatrix?.period || '-'}</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              {/* 最后一行 - 教学目标的学习产出及测量评价标准 */}
                              <tr className="bg-secondary/30 border-b border-border font-medium">
                                <td colSpan={goals.length + 5} className="p-3 text-left text-foreground">
                                  教学目标的学习产出及测量评价标准
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">暂无教学目标</div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无项目数据</p>
            <p className="text-xs">项目矩阵数据加载中或暂无项目信息</p>
          </div>
        )}

      <Dialog open={taskObjectivesDialogOpen} onOpenChange={setTaskObjectivesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>教学任务目标管理</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">任务目标</label>
                  <input
                    type="text"
                    value={newTaskObjective}
                    onChange={(e) => setNewTaskObjective(e.target.value)}
                    placeholder="输入任务目标"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">测量评价标准</label>
                  <input
                    type="text"
                    value={newTaskStandard}
                    onChange={(e) => setNewTaskStandard(e.target.value)}
                    placeholder="输入测量评价标准"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <Button
                size="sm"
                onClick={editingTaskId ? handleUpdateTaskObjective : handleAddTaskObjective}
                disabled={!newTaskObjective.trim()}
                className="w-full gap-2"
              >
                {editingTaskId ? (
                  <>
                    <Edit className="w-4 h-4" />
                    更新任务目标
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    添加任务目标
                  </>
                )}
              </Button>
            </div>

            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">已添加的任务目标</h4>
              {selectedChapterForTasks && chapterTaskObjectives[selectedChapterForTasks]?.length > 0 ? (
                <div className="space-y-2">
                  {chapterTaskObjectives[selectedChapterForTasks].map((task, idx) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                        {idx + 1}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-sm text-foreground font-medium">{task.objective}</div>
                        <div className="text-xs text-muted-foreground">{task.standard}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTaskObjective(task.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteTaskObjective(task.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">暂无任务目标</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setTaskObjectivesDialogOpen(false)
                setEditingTaskId(null)
                setNewTaskObjective("")
                setNewTaskStandard("")
              }}
            >
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ksaDialogOpen} onOpenChange={setKsaDialogOpen}>
        <DialogContent className="h-[85vh] flex flex-col" style={{ width: '75vw', maxWidth: '75vw' }}>
          <DialogHeader>
            <DialogTitle>
              {selectedKsaCell?.chapterId === "global" ? "KSA库管理" : "设置KSA支撑关系"}
            </DialogTitle>
            <DialogDescription>
              {selectedKsaCell?.chapterId === "global" ? "查看和管理课程的KSA数据" : "选择KSA项目并设置支撑强度"}
            </DialogDescription>
          </DialogHeader>
          {selectedKsaCell &&
            (() => {
              // Group KSA list data by type (handle both uppercase and lowercase)
              const knowledgePoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "K") || []
              const skillPoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "S") || []
              const attitudePoints = ksaListData?.filter((ksa: any) => ksa.title?.toUpperCase() === "A") || []

              // Check if we have any KSA data
              if (!ksaListData || ksaListData.length === 0) {
                return (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">暂无KSA数据</p>
                  </div>
                )
              }

              // Filter by search and sort by level
              const filteredKnowledgePoints = knowledgePoints
                .filter(
                  (p: any) =>
                    !ksaSearchK ||
                    p.id?.toString().includes(ksaSearchK) ||
                    p.description?.toLowerCase().includes(ksaSearchK.toLowerCase()),
                )
                .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))
              const filteredSkillPoints = skillPoints
                .filter(
                  (p: any) =>
                    !ksaSearchS ||
                    p.id?.toString().includes(ksaSearchS) ||
                    p.description?.toLowerCase().includes(ksaSearchS.toLowerCase()),
                )
                .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))
              const filteredAttitudePoints = attitudePoints
                .filter(
                  (p: any) =>
                    !ksaSearchA ||
                    p.id?.toString().includes(ksaSearchA) ||
                    p.description?.toLowerCase().includes(ksaSearchA.toLowerCase()),
                )
                .sort((a: any, b: any) => (a.level || 0) - (b.level || 0))

              const renderInfoPointList = (
                title: string,
                points: any[],
                filteredPoints: any[],
                searchValue: string,
                onSearchChange: (value: string) => void,
                colorClass: string,
                bgClass: string,
                borderClass: string,
                ksaType: string,
              ) => (
                <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
                  {/* Card Header */}
                  <div className={`px-4 py-3 ${bgClass} ${borderClass}`}>
                    <h4 className={`text-sm font-semibold ${colorClass}`}>
                      {title} ({points.length})
                    </h4>
                  </div>

                  {/* Search - Fixed */}
                  <div className="px-3 py-2 flex-shrink-0 bg-background flex items-center gap-2">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={`搜索${title.split("（")[0]}...`}
                      disabled={editingKsaId !== null}
                      className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                      onClick={() => setNewRowKsaType(ksaType)}
                      disabled={editingKsaId !== null}
                      className="flex-shrink-0 p-1.5 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="新增"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>

                  {/* List - Scrollable */}
                  <div className="flex-1 overflow-y-auto min-h-0 bg-background">
                    <div className="p-3 space-y-2">
                      {/* New Row */}
                      {newRowKsaType === ksaType && (
                        <div className="p-2 rounded-lg border border-blue-300 bg-blue-50">
                          <div className="flex items-start gap-2">
                            <textarea
                              value={newRowDescription}
                              onChange={(e) => setNewRowDescription(e.target.value)}
                              placeholder="输入描述"
                              className="flex-1 px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                              rows={2}
                              disabled={editingKsaId !== null}
                            />
                            <div className="flex flex-col gap-1 flex-shrink-0">
                              <button
                                onClick={async () => {
                                  if (!newRowDescription) {
                                    alert("请填写描述")
                                    return
                                  }
                                  // 计算该分类的最大level
                                  const maxLevel = filteredPoints.reduce((max: number, point: any) => {
                                    return Math.max(max, point.level || 1)
                                  }, 0)

                                  // 调用API新增KSA
                                  const result = await api.matrices.addKsa({
                                    majorId: parseInt((node.metadata as any)?.parentMajorId || "0"),
                                    courseUnitId: parseInt((node.metadata as any)?.courseId || "0"),
                                    title: "KSA",
                                    description: newRowDescription,
                                    level: maxLevel + 1,
                                  })
                                  if (!result.error && result.data) {
                                    setKsaListData([...ksaListData, result.data])
                                    setNewRowKsaType(null)
                                    setNewRowDescription("")
                                  } else {
                                    alert("新增失败: " + result.error)
                                  }
                                }}
                                disabled={editingKsaId !== null}
                                className="p-1 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="保存"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setNewRowKsaType(null)
                                  setNewRowDescription("")
                                }}
                                disabled={editingKsaId !== null}
                                className="p-1 rounded hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="取消"
                              >
                                <X className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* KSA points */}
                      {filteredPoints.length > 0 ? (
                        filteredPoints.map((point: any) => {
                          const support = selectedKsaSupport[point.id]
                          const isEditing = editingKsaId === point.id

                          return (
                            <div
                              key={point.id}
                              className={cn(
                                "p-2 rounded-lg border transition-all",
                                isEditing && "border-blue-300 bg-blue-50",
                                !isEditing && support ? `${borderClass} ${bgClass}` : !isEditing && "border-border bg-background",
                              )}
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  {isEditing ? (
                                    <textarea
                                      value={editingDescription}
                                      onChange={(e) => setEditingDescription(e.target.value)}
                                      className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                      rows={2}
                                    />
                                  ) : (
                                    <>
                                      <div className={`text-xs font-medium mb-1 ${colorClass}`}>
                                        {point.title}{point.level}
                                      </div>
                                      <div className="text-sm text-foreground leading-relaxed break-words">
                                        {point.description}
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="flex flex-col gap-1 flex-shrink-0">
                                  {selectedKsaCell?.chapterId === "global" ? (
                                    isEditing ? (
                                      <div className="flex flex-col gap-1">
                                        <button
                                          onClick={async () => {
                                            if (!editingDescription) {
                                              alert("请填写描述")
                                              return
                                            }
                                            const result = await api.matrices.updateKsa(point.id, {
                                              description: editingDescription,
                                            })
                                            if (!result.error) {
                                              setKsaListData(
                                                ksaListData.map((k: any) =>
                                                  k.id === point.id ? { ...k, description: editingDescription } : k,
                                                ),
                                              )
                                              setEditingKsaId(null)
                                              setEditingDescription("")
                                            } else {
                                              alert("更新失败: " + result.error)
                                            }
                                          }}
                                          className="p-1 rounded hover:bg-green-200 transition-colors"
                                          title="保存"
                                        >
                                          <Check className="w-4 h-4 text-green-600" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingKsaId(null)
                                            setEditingDescription("")
                                          }}
                                          className="p-1 rounded hover:bg-gray-200 transition-colors"
                                          title="取消"
                                        >
                                          <X className="w-4 h-4 text-gray-600" />
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => {
                                            setEditingKsaId(point.id)
                                            setEditingDescription(point.description)
                                          }}
                                          disabled={editingKsaId !== null || newRowKsaType !== null}
                                          className="p-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="编辑"
                                        >
                                          <Edit className="w-4 h-4 text-blue-600" />
                                        </button>
                                        <button
                                          onClick={async () => {
                                            if (confirm("确定删除此KSA吗？")) {
                                              const result = await api.matrices.deleteKsa(point.id)
                                              if (!result.error) {
                                                setKsaListData(ksaListData.filter((k: any) => k.id !== point.id))
                                              } else {
                                                alert("删除失败: " + result.error)
                                              }
                                            }
                                          }}
                                          disabled={editingKsaId !== null || newRowKsaType !== null}
                                          className="p-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                          title="删除"
                                        >
                                          <Trash2 className="w-4 h-4 text-red-600" />
                                        </button>
                                      </>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => handleToggleKsaSupport(point.id)}
                                      disabled={editingKsaId !== null || newRowKsaType !== null}
                                      className={cn(
                                        "px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
                                        !support && "border-gray-300 bg-white text-gray-600 hover:bg-gray-50",
                                        support === "strong" &&
                                        `${borderClass} ${bgClass} ${colorClass} font-medium`,
                                        support === "weak" &&
                                        `border-dashed ${borderClass} bg-white ${colorClass}`,
                                      )}
                                      title="切换支撑强度"
                                    >
                                      {!support ? "未选" : support === "strong" ? "强支撑" : "弱支撑"}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {searchValue ? "无匹配结果" : "暂无KSA数据"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )

              return (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4 px-4">
                  {/* KSA Lists */}
                  <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
                    {renderInfoPointList(
                      "知识（Knowledge）",
                      knowledgePoints,
                      filteredKnowledgePoints,
                      ksaSearchK,
                      setKsaSearchK,
                      "text-blue-700",
                      "bg-blue-50",
                      "border-blue-300",
                      "K",
                    )}
                    {renderInfoPointList(
                      "技能（Skills）",
                      skillPoints,
                      filteredSkillPoints,
                      ksaSearchS,
                      setKsaSearchS,
                      "text-green-700",
                      "bg-green-50",
                      "border-green-300",
                      "S",
                    )}
                    {renderInfoPointList(
                      "态度（Attitude）",
                      attitudePoints,
                      filteredAttitudePoints,
                      ksaSearchA,
                      setKsaSearchA,
                      "text-purple-700",
                      "bg-purple-50",
                      "border-purple-300",
                      "A",
                    )}
                  </div>
                </div>
              )
            })()}

          <DialogFooter className="flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                setKsaDialogOpen(false)
                setSelectedKsaCell(null)
                setSelectedKsaSupport({})
                setKsaSearchK("")
                setKsaSearchS("")
                setKsaSearchA("")
              }}
            >
              {selectedKsaCell?.chapterId === "global" ? "关闭" : "取消"}
            </Button>
            {selectedKsaCell?.chapterId !== "global" && (
              <Button onClick={handleSaveKsa}>确认</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
