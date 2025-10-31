"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Grid3x3, Edit, Check, X, Loader2, Target, Plus, Trash2, BookMarked } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode } from "@/types"

interface CourseProjectMatrixProps {
  node: TreeNode
  onUpdate: (updates: Partial<TreeNode["metadata"]>) => void
}

export function CourseProjectMatrix({ node, onUpdate }: CourseProjectMatrixProps) {
  const [isEditingProjectMatrix, setIsEditingProjectMatrix] = useState(false)
  const [isSavingProjectMatrix, setIsSavingProjectMatrix] = useState(false)
  const [projectMatrixData, setProjectMatrixData] = useState<Record<string, any>>({})
  const [chapterTaskObjectives, setChapterTaskObjectives] = useState<Record<string, any[]>>({})
  const [ksaData, setKsaData] = useState<Record<string, { knowledge: string; skills: string; attitude: string }>>({})
  const [courseMatrixData, setCourseMatrixData] = useState<Record<string, any[]>>({})

  const [taskObjectivesDialogOpen, setTaskObjectivesDialogOpen] = useState(false)
  const [selectedChapterForTasks, setSelectedChapterForTasks] = useState<string | null>(null)
  const [newTaskObjective, setNewTaskObjective] = useState("")
  const [newTaskStandard, setNewTaskStandard] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

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
  const [addingKsaType, setAddingKsaType] = useState<"K" | "S" | "A" | null>(null)
  const [newKsaContent, setNewKsaContent] = useState("")
  const [editingKsaId, setEditingKsaId] = useState<string | null>(null)
  const [editingKsaContent, setEditingKsaContent] = useState("")

  useEffect(() => {
    if (node.metadata?.projectMatrixData) {
      setProjectMatrixData(node.metadata.projectMatrixData)
    }
    if (node.metadata?.chapterTaskObjectives) {
      setChapterTaskObjectives(node.metadata.chapterTaskObjectives)
    }
    if (node.metadata?.ksaData) {
      setKsaData(node.metadata.ksaData)
    }
    if (node.metadata?.courseMatrixData) {
      setCourseMatrixData(node.metadata.courseMatrixData)
    }
  }, [node.metadata])

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
    if (node.metadata?.projectMatrixData) {
      setProjectMatrixData(node.metadata.projectMatrixData)
    }
    if (node.metadata?.chapterTaskObjectives) {
      setChapterTaskObjectives(node.metadata.chapterTaskObjectives)
    }
    if (node.metadata?.ksaData) {
      setKsaData(node.metadata.ksaData)
    }
    setIsEditingProjectMatrix(false)
  }

  const handleOpenTaskObjectivesDialog = (chapterId: string) => {
    setSelectedChapterForTasks(chapterId)
    setTaskObjectivesDialogOpen(true)
  }

  const handleAddTaskObjective = () => {
    if (!selectedChapterForTasks || !newTaskObjective.trim() || !newTaskStandard.trim()) return

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
    if (!selectedChapterForTasks || !editingTaskId || !newTaskObjective.trim() || !newTaskStandard.trim()) return

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
    setSelectedKsaCell({ chapterId, coursePointId, taskId })

    // Load existing KSA support data
    const ksaKey = `${chapterId}-${coursePointId}-${taskId}`
    const existingKsa = ksaData[ksaKey] || {}
    setSelectedKsaSupport(existingKsa)

    // Reset search and editing states
    setKsaSearchK("")
    setKsaSearchS("")
    setKsaSearchA("")
    setAddingKsaType(null)
    setNewKsaContent("")
    setEditingKsaId(null)
    setEditingKsaContent("")

    setKsaDialogOpen(true)
  }

  const handleAddKsaInfoPoint = (type: "K" | "S" | "A") => {
    setAddingKsaType(type)
    setNewKsaContent("")
  }

  const handleSaveNewKsaInfoPoint = (type: "K" | "S" | "A", coursePointId: string) => {
    if (!newKsaContent.trim()) return

    // Find the course point and add new info point
    const updatedCoursePoints = (node.metadata?.coursePoints || []).map((cp: any) => {
      if (cp.id === coursePointId) {
        const existingInfoPoints = cp.infoPoints || []
        // Generate new ID based on type and existing count
        const typePoints = existingInfoPoints.filter((ip: any) => ip.type === type)
        const newId = `${type}${typePoints.length + 1}`

        return {
          ...cp,
          infoPoints: [
            ...existingInfoPoints,
            {
              id: newId,
              type: type,
              content: newKsaContent.trim(),
            },
          ],
        }
      }
      return cp
    })

    // Update the node metadata
    onUpdate({ coursePoints: updatedCoursePoints })

    setAddingKsaType(null)
    setNewKsaContent("")
  }

  const handleCancelAddKsaInfoPoint = () => {
    setAddingKsaType(null)
    setNewKsaContent("")
  }

  const handleEditKsaInfoPoint = (infoPointId: string, content: string) => {
    setEditingKsaId(infoPointId)
    setEditingKsaContent(content)
  }

  const handleSaveEditKsaInfoPoint = (coursePointId: string) => {
    if (!editingKsaId || !editingKsaContent.trim()) return

    const updatedCoursePoints = (node.metadata?.coursePoints || []).map((cp: any) => {
      if (cp.id === coursePointId) {
        return {
          ...cp,
          infoPoints: (cp.infoPoints || []).map((ip: any) =>
            ip.id === editingKsaId ? { ...ip, content: editingKsaContent.trim() } : ip,
          ),
        }
      }
      return cp
    })

    onUpdate({ coursePoints: updatedCoursePoints })

    setEditingKsaId(null)
    setEditingKsaContent("")
  }

  const handleCancelEditKsaInfoPoint = () => {
    setEditingKsaId(null)
    setEditingKsaContent("")
  }

  const handleDeleteKsaInfoPoint = (coursePointId: string, infoPointId: string) => {
    const updatedCoursePoints = (node.metadata?.coursePoints || []).map((cp: any) => {
      if (cp.id === coursePointId) {
        return {
          ...cp,
          infoPoints: (cp.infoPoints || []).filter((ip: any) => ip.id !== infoPointId),
        }
      }
      return cp
    })

    onUpdate({ coursePoints: updatedCoursePoints })

    // Also remove from selected support if exists
    setSelectedKsaSupport((prev) => {
      const newSupport = { ...prev }
      delete newSupport[infoPointId]
      return newSupport
    })
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
    setAddingKsaType(null)
    setNewKsaContent("")
    setEditingKsaId(null)
    setEditingKsaContent("")
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
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
            <Button size="sm" onClick={() => setIsEditingProjectMatrix(true)} className="gap-2">
              <Edit className="w-4 h-4" />
              编辑
            </Button>
          )}
        </div>

        {node.metadata?.chapters && node.metadata.chapters.length > 0 ? (
          <Accordion type="multiple" className="space-y-3">
            {node.metadata.chapters.map((chapter: any, chapterIdx: number) => {
              const chapterId = chapter.id || `chapter-${chapterIdx}`
              const chapterName = chapter.name || `章节${chapterIdx + 1}`

              const chapterCoursePoints: Array<{ id: string; title: string; description: string }> = []
              if (node.metadata?.teachingObjectives && courseMatrixData) {
                node.metadata.teachingObjectives.forEach((objective: any, objIdx: number) => {
                  const points = objective.points || []
                  points.forEach((point: any, pointIdx: number) => {
                    const objectiveId = objective.id || `obj-${objIdx}`
                    const pointId =
                      typeof point === "string"
                        ? `point-${objIdx}-${pointIdx}`
                        : point.id || `point-${objIdx}-${pointIdx}`
                    const key = `${objectiveId}-${pointId}-${chapterId}`
                    const coursePoints = courseMatrixData[key] || []

                    coursePoints.forEach((cp) => {
                      if (!chapterCoursePoints.find((existing) => existing.id === cp.id)) {
                        chapterCoursePoints.push({
                          id: cp.id,
                          title: cp.name,
                          description: cp.description || cp.name,
                        })
                      }
                    })
                  })
                })
              }

              const taskObjectives = chapterTaskObjectives[chapterId] || []

              return (
                <AccordionItem key={chapterId} value={chapterId} className="border border-border rounded-lg">
                  <div className="relative">
                    <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-secondary/30 rounded-t-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                          {chapterIdx + 1}
                        </div>
                        <span className="text-base font-semibold text-foreground">{chapterName}</span>
                        {chapterCoursePoints.length > 0 && (
                          <span className="text-xs text-muted-foreground">({chapterCoursePoints.length} 个课点)</span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 z-10">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTaskObjectivesDialog(chapterId)
                        }}
                        className="gap-2"
                      >
                        <Target className="w-4 h-4" />
                        教学任务目标
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="px-5 pb-5">
                    <div className="border-t border-dashed border-border mb-4" />

                    {chapterCoursePoints.length > 0 && taskObjectives.length > 0 ? (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border-collapse">
                            <thead>
                              <tr className="border-b border-border bg-secondary/50">
                                <th
                                  rowSpan={2}
                                  className="text-left p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                >
                                  课点
                                </th>
                                {taskObjectives.map((task) => (
                                  <th
                                    key={task.id}
                                    rowSpan={2}
                                    className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[150px]"
                                  >
                                    <div className="text-xs leading-relaxed">{task.objective}</div>
                                  </th>
                                ))}
                                <th
                                  rowSpan={2}
                                  className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                >
                                  学法
                                </th>
                                <th
                                  rowSpan={2}
                                  className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[120px]"
                                >
                                  教法
                                </th>
                                <th
                                  rowSpan={2}
                                  className="text-center p-3 text-muted-foreground font-medium border-r border-border min-w-[150px]"
                                >
                                  课点学习产出及测量
                                </th>
                                <th className="text-center p-3 text-muted-foreground font-medium" colSpan={2}>
                                  教学安排
                                </th>
                              </tr>
                              <tr className="border-b border-border bg-secondary/30">
                                <th className="text-center p-2 text-xs text-muted-foreground font-medium border-r border-border">
                                  开课周数
                                </th>
                                <th className="text-center p-2 text-xs text-muted-foreground font-medium">学时数</th>
                              </tr>
                            </thead>
                            <tbody>
                              {chapterCoursePoints.map((coursePoint) => {
                                const rowKey = `${chapterId}-${coursePoint.id}`
                                const rowData = projectMatrixData[rowKey] || {}

                                const coursePointIndex =
                                  node.metadata?.coursePoints?.findIndex(
                                    (cp: any) =>
                                      (cp.id || `cp-${node.metadata.coursePoints.indexOf(cp)}`) === coursePoint.id,
                                  ) + 1 || 0

                                return (
                                  <tr key={coursePoint.id} className="border-b border-border hover:bg-secondary/20">
                                    <td className="p-3 border-r border-border">
                                      <div className="relative group/tooltip">
                                        <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 border border-blue-300 text-blue-700 cursor-pointer">
                                          {coursePointIndex}
                                        </span>
                                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50 max-w-xs">
                                          <div className="font-semibold mb-1">{coursePoint.title}</div>
                                          <div className="text-gray-300">{coursePoint.description}</div>
                                          <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                                        </div>
                                      </div>
                                    </td>
                                    {taskObjectives.map((task) => {
                                      const ksaKey = `${chapterId}-${coursePoint.id}-${task.id}`
                                      const ksaSupportData = ksaData[ksaKey] || {}
                                      const hasKsa = Object.keys(ksaSupportData).length > 0

                                      // Get the course point to access its info points
                                      const fullCoursePoint = node.metadata?.coursePoints?.find(
                                        (cp: any) => cp.id === coursePoint.id,
                                      )

                                      return (
                                        <td key={task.id} className="p-3 text-center border-r border-border">
                                          {isEditingProjectMatrix ? (
                                            <button
                                              onClick={() => handleOpenKsaDialog(chapterId, coursePoint.id, task.id)}
                                              className={cn(
                                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all group",
                                                hasKsa
                                                  ? "border-primary bg-primary/20 hover:bg-primary/30"
                                                  : "border-dashed border-primary/40 hover:border-primary hover:bg-primary/10",
                                              )}
                                              title="设置KSA支撑关系"
                                            >
                                              <Plus
                                                className={cn(
                                                  "w-3 h-3",
                                                  hasKsa ? "text-primary" : "text-primary/60 group-hover:text-primary",
                                                )}
                                              />
                                            </button>
                                          ) : hasKsa ? (
                                            <div className="flex flex-wrap gap-1 justify-center">
                                              {Object.entries(ksaSupportData).map(([infoPointId, support]) => {
                                                // Find the info point details
                                                const infoPoint = fullCoursePoint?.infoPoints?.find(
                                                  (ip: any) => ip.id === infoPointId,
                                                )
                                                if (!infoPoint) return null

                                                const colorClass =
                                                  infoPoint.type === "K"
                                                    ? "bg-blue-100 border-blue-300 text-blue-700"
                                                    : infoPoint.type === "S"
                                                      ? "bg-green-100 border-green-300 text-green-700"
                                                      : "bg-purple-100 border-purple-300 text-purple-700"

                                                return (
                                                  <div key={infoPointId} className="relative group/tooltip">
                                                    <span
                                                      className={cn(
                                                        "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium border cursor-pointer",
                                                        colorClass,
                                                        support === "weak" && "opacity-60",
                                                      )}
                                                    >
                                                      {infoPoint.id}
                                                      {support === "strong" && (
                                                        <span className="text-[10px] font-bold">●</span>
                                                      )}
                                                    </span>
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50 max-w-xs">
                                                      <div className="font-semibold mb-1">
                                                        {infoPoint.id} ({infoPoint.type})
                                                      </div>
                                                      <div className="text-gray-300 mb-1">{infoPoint.content}</div>
                                                      <div className="text-yellow-300 text-[10px]">
                                                        {support === "strong" ? "强支撑" : "弱支撑"}
                                                      </div>
                                                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-800"></div>
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          ) : (
                                            <span className="text-xs text-muted-foreground">-</span>
                                          )}
                                        </td>
                                      )
                                    })}
                                    <td className="p-2 border-r border-border">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={rowData[`${coursePoint.id}-learningMethod`] || ""}
                                          onChange={(e) => {
                                            setProjectMatrixData((prev) => ({
                                              ...prev,
                                              [rowKey]: {
                                                ...prev[rowKey],
                                                [`${coursePoint.id}-learningMethod`]: e.target.value,
                                              },
                                            }))
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="输入学法"
                                        />
                                      ) : (
                                        <span className="text-xs text-foreground">
                                          {rowData[`${coursePoint.id}-learningMethod`] || "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 border-r border-border">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={rowData[`${coursePoint.id}-teachingMethod`] || ""}
                                          onChange={(e) => {
                                            setProjectMatrixData((prev) => ({
                                              ...prev,
                                              [rowKey]: {
                                                ...prev[rowKey],
                                                [`${coursePoint.id}-teachingMethod`]: e.target.value,
                                              },
                                            }))
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="输入教法"
                                        />
                                      ) : (
                                        <span className="text-xs text-foreground">
                                          {rowData[`${coursePoint.id}-teachingMethod`] || "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 border-r border-border">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={rowData[`${coursePoint.id}-output`] || ""}
                                          onChange={(e) => {
                                            setProjectMatrixData((prev) => ({
                                              ...prev,
                                              [rowKey]: {
                                                ...prev[rowKey],
                                                [`${coursePoint.id}-output`]: e.target.value,
                                              },
                                            }))
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="输入产出及测量"
                                        />
                                      ) : (
                                        <span className="text-xs text-foreground">
                                          {rowData[`${coursePoint.id}-output`] || "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2 border-r border-border">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={rowData[`${coursePoint.id}-weeks`] || ""}
                                          onChange={(e) => {
                                            setProjectMatrixData((prev) => ({
                                              ...prev,
                                              [rowKey]: {
                                                ...prev[rowKey],
                                                [`${coursePoint.id}-weeks`]: e.target.value,
                                              },
                                            }))
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="周数"
                                        />
                                      ) : (
                                        <span className="text-xs text-foreground">
                                          {rowData[`${coursePoint.id}-weeks`] || "-"}
                                        </span>
                                      )}
                                    </td>
                                    <td className="p-2">
                                      {isEditingProjectMatrix ? (
                                        <input
                                          type="text"
                                          value={rowData[`${coursePoint.id}-hours`] || ""}
                                          onChange={(e) => {
                                            setProjectMatrixData((prev) => ({
                                              ...prev,
                                              [rowKey]: {
                                                ...prev[rowKey],
                                                [`${coursePoint.id}-hours`]: e.target.value,
                                              },
                                            }))
                                          }}
                                          className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-primary/50"
                                          placeholder="学时"
                                        />
                                      ) : (
                                        <span className="text-xs text-foreground">
                                          {rowData[`${coursePoint.id}-hours`] || "-"}
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Grid3x3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm mb-2">暂无项目矩阵数据</p>
                        <p className="text-xs">
                          {chapterCoursePoints.length === 0 && "请先在课程矩阵中为该章节关联课点"}
                          {chapterCoursePoints.length > 0 &&
                            taskObjectives.length === 0 &&
                            '请点击"教学任务目标"按钮添加任务目标'}
                        </p>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无章节项目数据</p>
            <p className="text-xs">请先在课程信息中添加章节项目信息</p>
          </div>
        )}
      </div>

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
                disabled={!newTaskObjective.trim() || !newTaskStandard.trim()}
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
            <DialogTitle>设置KSA支撑关系</DialogTitle>
          </DialogHeader>
          {selectedKsaCell &&
            (() => {
              // Find the course point
              const coursePoint = node.metadata?.coursePoints?.find(
                (cp: any) => cp.id === selectedKsaCell.coursePointId,
              )

              if (!coursePoint) {
                return (
                  <div className="py-8 text-center text-muted-foreground">
                    <p className="text-sm">未找到课点信息</p>
                  </div>
                )
              }

              // Group info points by type
              const knowledgePoints = coursePoint.infoPoints?.filter((ip: any) => ip.type === "K") || []
              const skillPoints = coursePoint.infoPoints?.filter((ip: any) => ip.type === "S") || []
              const attitudePoints = coursePoint.infoPoints?.filter((ip: any) => ip.type === "A") || []

              // Filter by search
              const filteredKnowledgePoints = knowledgePoints.filter(
                (p: any) =>
                  !ksaSearchK ||
                  p.id.toLowerCase().includes(ksaSearchK.toLowerCase()) ||
                  p.content.toLowerCase().includes(ksaSearchK.toLowerCase()),
              )
              const filteredSkillPoints = skillPoints.filter(
                (p: any) =>
                  !ksaSearchS ||
                  p.id.toLowerCase().includes(ksaSearchS.toLowerCase()) ||
                  p.content.toLowerCase().includes(ksaSearchS.toLowerCase()),
              )
              const filteredAttitudePoints = attitudePoints.filter(
                (p: any) =>
                  !ksaSearchA ||
                  p.id.toLowerCase().includes(ksaSearchA.toLowerCase()) ||
                  p.content.toLowerCase().includes(ksaSearchA.toLowerCase()),
              )

              const renderInfoPointList = (
                type: "K" | "S" | "A",
                title: string,
                points: any[],
                filteredPoints: any[],
                searchValue: string,
                onSearchChange: (value: string) => void,
                colorClass: string,
                bgClass: string,
                borderClass: string,
              ) => (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-sm font-semibold ${colorClass}`}>
                      {title} ({points.length})
                    </h4>
                    <button
                      onClick={() => handleAddKsaInfoPoint(type)}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        `${borderClass} hover:${bgClass}`,
                      )}
                      title="添加信息点"
                    >
                      <Plus className={`w-4 h-4 ${colorClass}`} />
                    </button>
                  </div>

                  {/* Search */}
                  <div className="mb-2">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder={`搜索${title.split("（")[0]}...`}
                      className="w-full px-3 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>

                  {/* List */}
                  <div className="flex-1 overflow-y-auto border border-border rounded-lg bg-background/50 min-h-0">
                    <div className="p-2 space-y-1.5">
                      {/* Add new form */}
                      {addingKsaType === type && (
                        <div className={cn("p-2 rounded-lg border-2 border-dashed", borderClass, bgClass)}>
                          <input
                            type="text"
                            value={newKsaContent}
                            onChange={(e) => setNewKsaContent(e.target.value)}
                            placeholder="输入内容..."
                            className="w-full px-2 py-1 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                            autoFocus
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleSaveNewKsaInfoPoint(type, coursePoint.id)}
                              className="flex-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                            >
                              <Check className="w-3 h-3" />
                              保存
                            </button>
                            <button
                              onClick={handleCancelAddKsaInfoPoint}
                              className="flex-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1"
                            >
                              <X className="w-3 h-3" />
                              取消
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Info points */}
                      {filteredPoints.length > 0 ? (
                        filteredPoints.map((point: any) => {
                          const support = selectedKsaSupport[point.id]
                          const isEditing = editingKsaId === point.id

                          return (
                            <div
                              key={point.id}
                              className={cn(
                                "p-2 rounded-lg border transition-all",
                                support ? `${borderClass} ${bgClass}` : "border-border bg-background",
                              )}
                            >
                              {isEditing ? (
                                <div>
                                  <input
                                    type="text"
                                    value={editingKsaContent}
                                    onChange={(e) => setEditingKsaContent(e.target.value)}
                                    className="w-full px-2 py-1 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleSaveEditKsaInfoPoint(coursePoint.id)}
                                      className="flex-1 px-2 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelEditKsaInfoPoint}
                                      className="flex-1 px-2 py-1 text-xs bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors flex items-center justify-center gap-1"
                                    >
                                      <X className="w-3 h-3" />
                                      取消
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className={`text-xs font-medium mb-1 ${colorClass}`}>{point.id}</div>
                                    <div className="text-sm text-foreground leading-relaxed break-words">
                                      {point.content}
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => handleToggleKsaSupport(point.id)}
                                      className={cn(
                                        "px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap",
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
                                    <div className="flex gap-0.5">
                                      <button
                                        onClick={() => handleEditKsaInfoPoint(point.id, point.content)}
                                        className="p-1 rounded hover:bg-secondary transition-colors"
                                        title="编辑"
                                      >
                                        <Edit className="w-3 h-3 text-muted-foreground" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteKsaInfoPoint(coursePoint.id, point.id)}
                                        className="p-1 rounded hover:bg-secondary transition-colors"
                                        title="删除"
                                      >
                                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                          {searchValue ? "无匹配结果" : "暂无信息点"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )

              return (
                <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4">
                  {/* Course point info */}
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border flex-shrink-0">
                    <div className="text-xs text-muted-foreground mb-1">课点内容</div>
                    <div className="text-sm font-medium text-foreground">{coursePoint.content}</div>
                  </div>

                  {/* KSA Lists */}
                  <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                    {renderInfoPointList(
                      "K",
                      "知识（Knowledge）",
                      knowledgePoints,
                      filteredKnowledgePoints,
                      ksaSearchK,
                      setKsaSearchK,
                      "text-blue-700",
                      "bg-blue-50",
                      "border-blue-300",
                    )}
                    {renderInfoPointList(
                      "S",
                      "技能（Skills）",
                      skillPoints,
                      filteredSkillPoints,
                      ksaSearchS,
                      setKsaSearchS,
                      "text-green-700",
                      "bg-green-50",
                      "border-green-300",
                    )}
                    {renderInfoPointList(
                      "A",
                      "态度（Attitude）",
                      attitudePoints,
                      filteredAttitudePoints,
                      ksaSearchA,
                      setKsaSearchA,
                      "text-purple-700",
                      "bg-purple-50",
                      "border-purple-300",
                    )}
                  </div>

                  {/* Statistics */}
                  <div className="pt-3 border-t border-border flex-shrink-0">
                    <div className="text-sm text-muted-foreground">
                      已选择：
                      <span className="font-medium text-foreground ml-2">
                        {Object.keys(selectedKsaSupport).length} 个信息点
                      </span>
                      <span className="ml-4">
                        强支撑：
                        <span className="font-medium text-foreground ml-1">
                          {Object.values(selectedKsaSupport).filter((s) => s === "strong").length}
                        </span>
                      </span>
                      <span className="ml-4">
                        弱支撑：
                        <span className="font-medium text-foreground ml-1">
                          {Object.values(selectedKsaSupport).filter((s) => s === "weak").length}
                        </span>
                      </span>
                    </div>
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
                setAddingKsaType(null)
                setNewKsaContent("")
                setEditingKsaId(null)
                setEditingKsaContent("")
              }}
            >
              取消
            </Button>
            <Button onClick={handleSaveKsa}>确认</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
