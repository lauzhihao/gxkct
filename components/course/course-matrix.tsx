"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Pencil, X, Check, Loader2, Plus, BookMarked } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TreeNode, CoursePoint } from "@/types"
import { api } from "@/lib/api"

interface CourseMatrixProps {
  node: TreeNode
  onUpdateNode?: (nodeId: string, updates: Partial<TreeNode>) => void
}

export function CourseMatrix({ node, onUpdateNode }: CourseMatrixProps) {
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
  }, [node?.id, node?.type, node.metadata])

  useEffect(() => {
    if (!isEditingCourseMatrix) return

    const autoSaveInterval = setInterval(() => {
      handleSaveCourseMatrix(true)
    }, 10000)

    return () => clearInterval(autoSaveInterval)
  }, [isEditingCourseMatrix, courseMatrixData])

  const handleSaveCourseMatrix = async (isAutoSave = false) => {
    setIsSavingCourseMatrix(true)

    try {
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
    setIsEditingCourseMatrix(false)
  }

  const handleAddCoursePoint = (objectiveId: string, pointId: string, chapterId: string) => {
    setSelectedMatrixCell({ objectiveId, pointId, chapterId })
    setSelectedCoursePoints({})
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

    const coursePointsMap = new Map()
    if (node?.metadata?.coursePoints) {
      node.metadata.coursePoints.forEach((cp: CoursePoint, idx: number) => {
        const id = cp.id || `cp-${idx}`
        const title = cp.title || `课点 ${idx + 1}`
        const description = cp.description || ""
        coursePointsMap.set(id, { title, description })
      })
    }

    setCourseMatrixData((prev) => {
      const existing = prev[key] || []
      const newPoints = Object.entries(selectedCoursePoints).map(([id, support]) => {
        const pointData = coursePointsMap.get(id) || { title: id, description: "" }
        return {
          id,
          name: pointData.title,
          description: pointData.description,
          support,
        }
      })

      const merged = [...existing]
      newPoints.forEach((newPoint) => {
        const existingIndex = merged.findIndex((cp) => cp.id === newPoint.id)
        if (existingIndex >= 0) {
          merged[existingIndex] = newPoint
        } else {
          merged.push(newPoint)
        }
      })

      return {
        ...prev,
        [key]: merged,
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

  const coursePointIndexMap = new Map()
  if (node?.metadata?.coursePoints) {
    node.metadata.coursePoints.forEach((cp: CoursePoint, idx: number) => {
      const id = cp.id || `cp-${idx}`
      coursePointIndexMap.set(id, idx + 1)
    })
  }

  return (
    <>
      <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">课程矩阵</h3>
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
                取消
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

        {node.metadata?.teachingObjectives &&
          node.metadata?.chapters &&
          node.metadata.teachingObjectives.length > 0 &&
          node.metadata.chapters.length > 0 ? (
          <div className="rounded-lg border border-border bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm border-collapse" style={{ width: 'auto', minWidth: '100%' }}>
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-left p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap">
                      教学目标
                    </th>
                    <th className="text-left p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap">
                      指标点
                    </th>
                    {node.metadata.chapters.map((chapter: any, idx: number) => (
                      <th
                        key={chapter.id || idx}
                        className="text-center p-3 text-muted-foreground font-medium border-r border-border whitespace-nowrap"
                      >
                        {chapter.name || `章节${idx + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {node.metadata.teachingObjectives.map((objective: any, objIdx: number) => {
                    const points = objective.points || []
                    const rowCount = points.length || 1

                    return points.length > 0 ? (
                      points.map((point: any, pointIdx: number) => {
                        const objectiveId = objective.id || `obj-${objIdx}`
                        const pointId =
                          typeof point === "string"
                            ? `point-${objIdx}-${pointIdx}`
                            : point.id || `point-${objIdx}-${pointIdx}`
                        const pointContent = typeof point === "string" ? point : point.content || point.name || point

                        return (
                          <tr
                            key={`${objectiveId}-${pointIdx}`}
                            className="border-b border-border hover:bg-white/50 transition-colors"
                          >
                            {pointIdx === 0 && (
                              <td
                                rowSpan={rowCount}
                                className="p-3 align-top border-r border-border bg-secondary/20"
                                style={{ minWidth: '200px', maxWidth: '400px' }}
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                                    {objIdx + 1}
                                  </div>
                                  <div className="flex-1 text-sm text-foreground leading-relaxed break-words">
                                    {objective.content || objective.name || "未设置"}
                                  </div>
                                </div>
                              </td>
                            )}

                            <td className="p-3 border-r border-border bg-white/80" style={{ minWidth: '250px', maxWidth: '500px' }}>
                              <div className="flex items-start gap-2">
                                <span className="text-sm text-muted-foreground flex-shrink-0 mt-0.5">
                                  {objIdx + 1}.{pointIdx + 1}
                                </span>
                                <div className="flex-1 text-sm text-foreground leading-relaxed break-words">{pointContent}</div>
                              </div>
                            </td>

                            {node.metadata.chapters.map((chapter: any, chapterIdx: number) => {
                              const chapterId = chapter.id || `chapter-${chapterIdx}`
                              const key = `${objectiveId}-${pointId}-${chapterId}`
                              const coursePoints = courseMatrixData[key] || []

                              return (
                                <td key={chapterId} className="p-3 text-center border-r border-border" style={{ minWidth: '120px' }}>
                                  {isEditingCourseMatrix ? (
                                    <div className="flex flex-col items-center gap-2">
                                      {coursePoints.length > 0 && (
                                        <div className="flex flex-wrap gap-1 justify-center">
                                          {coursePoints.map((cp) => (
                                            <div key={cp.id} className="relative group/tooltip">
                                              <span
                                                className={cn(
                                                  "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium cursor-pointer",
                                                  cp.support === "strong" &&
                                                  "bg-orange-100 border border-orange-300 text-orange-700",
                                                  cp.support === "weak" &&
                                                  "bg-green-100 border border-green-300 text-green-700",
                                                )}
                                              >
                                                {coursePointIndexMap.get(cp.id) || cp.id}
                                                <button
                                                  onClick={() =>
                                                    handleRemoveCoursePoint(objectiveId, pointId, chapterId, cp.id)
                                                  }
                                                  className="hover:text-red-600 transition-colors"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </span>
                                              <div
                                                className={cn(
                                                  "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50",
                                                  cp.support === "strong" && "bg-orange-600",
                                                  cp.support === "weak" && "bg-green-600",
                                                )}
                                              >
                                                {cp.description || cp.name}
                                                <div
                                                  className={cn(
                                                    "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent",
                                                    cp.support === "strong" && "border-t-orange-600",
                                                    cp.support === "weak" && "border-t-green-600",
                                                  )}
                                                ></div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      <button
                                        onClick={() => handleAddCoursePoint(objectiveId, pointId, chapterId)}
                                        className="w-4 h-4 rounded-full border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all group"
                                        title={`为指标点"${pointContent}"添加课点`}
                                      >
                                        <Plus className="w-2 h-2 text-primary/60 group-hover:text-primary" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {coursePoints.length > 0 ? (
                                        coursePoints.map((cp) => (
                                          <div key={cp.id} className="relative group/tooltip">
                                            <span
                                              className={cn(
                                                "inline-block px-2 py-1 rounded text-xs font-medium cursor-pointer",
                                                cp.support === "strong" &&
                                                "bg-orange-100 border border-orange-300 text-orange-700",
                                                cp.support === "weak" &&
                                                "bg-green-100 border border-green-300 text-green-700",
                                              )}
                                            >
                                              {coursePointIndexMap.get(cp.id) || cp.id}
                                            </span>
                                            <div
                                              className={cn(
                                                "absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-white text-xs rounded shadow-lg whitespace-nowrap opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-150 pointer-events-none z-50",
                                                cp.support === "strong" && "bg-orange-600",
                                                cp.support === "weak" && "bg-green-600",
                                              )}
                                            >
                                              {cp.description || cp.name}
                                              <div
                                                className={cn(
                                                  "absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent",
                                                  cp.support === "strong" && "border-t-orange-600",
                                                  cp.support === "weak" && "border-t-green-600",
                                                )}
                                              ></div>
                                            </div>
                                          </div>
                                        ))
                                      ) : (
                                        <span className="text-xs text-muted-foreground">-</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        )
                      })
                    ) : (
                      <tr
                        key={objective.id || objIdx}
                        className="border-b border-border hover:bg-white/50 transition-colors"
                      >
                        <td className="p-3 border-r border-border bg-secondary/20" style={{ minWidth: '200px', maxWidth: '400px' }}>
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-medium text-primary">
                              {objIdx + 1}
                            </div>
                            <div className="flex-1 text-sm text-foreground leading-relaxed break-words">
                              {objective.content || objective.name || "未设置"}
                            </div>
                          </div>
                        </td>
                        <td
                          className="p-3 text-center text-muted-foreground text-sm border-r border-border bg-white/80"
                          style={{ minWidth: '250px', maxWidth: '500px' }}
                          colSpan={1}
                        >
                          暂无指标点
                        </td>
                        {node.metadata.chapters.map((chapter: any, chapterIdx: number) => (
                          <td key={chapter.id || chapterIdx} className="p-3 text-center border-r border-border" style={{ minWidth: '120px' }}>
                            <span className="text-xs text-muted-foreground">-</span>
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无课程矩阵数据</p>
            <p className="text-xs">请先在课程信息中添加教学目标和章节信息</p>
          </div>
        )}
      </div>

      <Dialog open={isAddCoursePointDialogOpen} onOpenChange={setIsAddCoursePointDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>选择课点并设置支撑度</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {node?.metadata?.coursePoints && node.metadata.coursePoints.length > 0 ? (
              node.metadata.coursePoints.map((coursePoint: CoursePoint, idx: number) => {
                const cpId = coursePoint.id || `cp-${idx}`
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
                      <span className="text-sm text-foreground">{cpTitle}</span>
                    </div>
                    <div className="flex gap-2">
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
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddCoursePointDialogOpen(false)
                setSelectedMatrixCell(null)
                setSelectedCoursePoints({})
              }}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirmCoursePointSelection}
              disabled={Object.keys(selectedCoursePoints).length === 0}
            >
              确认 {Object.keys(selectedCoursePoints).length > 0 && `(${Object.keys(selectedCoursePoints).length})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
