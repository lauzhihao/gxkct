/**
 * 任务目标对话框组件
 * 负责管理任务目标的CRUD操作
 * 保存接口: POST /api/matrix/updatetaskgoal
 */

import { useEffect, useState, useCallback } from "react"
import { Plus, Check, X, Edit, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog"
import { Popover, PopoverTrigger, PopoverContent } from "@/shared/components/ui/popover"
import { Button } from "@/shared/components/ui/button"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { projectTeachGoalApi } from "@/modules/courses/api/projectTeachGoalApi"
import type { TaskGoalItem } from "@/lib/api/project-teach-goal-api"
import type { ProjectMatrixData, ProjectMatrixGoal } from "@/modules/courses/hooks/use-project-matrix"

interface TaskObjectivesDialogProps {
  taskObjectivesDialogOpen: boolean
  selectedProjectForTasks: string | null
  projectGoalsForDialog: ProjectMatrixGoal[]
  newTaskObjective: string
  editingTaskId: string | null
  taskObjectiveSearch: string
  projectMatrixData: ProjectMatrixData | null
  setTaskObjectivesDialogOpen: (value: boolean) => void
  setNewTaskObjective: (value: string) => void
  setEditingTaskId: (value: string | null) => void
  setTaskObjectiveSearch: (value: string) => void
  setProjectGoalsForDialog: (value: ProjectMatrixGoal[]) => void
  setProjectMatrixData: (value: ProjectMatrixData | null) => void
  closeTaskObjectivesDialog: () => void
  onUpdate: (updates: any) => void
}

export function TaskObjectivesDialog({
  taskObjectivesDialogOpen,
  selectedProjectForTasks,
  projectGoalsForDialog,
  newTaskObjective,
  editingTaskId,
  taskObjectiveSearch,
  projectMatrixData,
  setTaskObjectivesDialogOpen,
  setNewTaskObjective,
  setEditingTaskId,
  setTaskObjectiveSearch,
  setProjectGoalsForDialog,
  setProjectMatrixData,
  closeTaskObjectivesDialog,
  onUpdate,
}: TaskObjectivesDialogProps) {
  const [localGoals, setLocalGoals] = useState<TaskGoalItem[]>([])
  const [deletedGoals, setDeletedGoals] = useState<TaskGoalItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  // 编辑中的 product 字段
  const [editingProduct, setEditingProduct] = useState("")
  // 删除确认气泡控制
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null)

  const projectId = selectedProjectForTasks ? parseInt(selectedProjectForTasks) : null

  // 打开对话框时从接口加载任务目标
  useEffect(() => {
    if (!taskObjectivesDialogOpen || !selectedProjectForTasks) return

    const loadGoals = async () => {
      setIsLoading(true)
      setDeletedGoals([])
      try {
        const result = await projectTeachGoalApi.getTaskGoals(selectedProjectForTasks)
        if (result.data) {
          const goals = Array.isArray(result.data) ? result.data : []
          setLocalGoals(goals)
        } else {
          setLocalGoals(
            projectGoalsForDialog.map((g) => ({
              id: g.id,
              projectId: projectId ?? 0,
              description: g.description,
              product: "",
            }))
          )
        }
      } catch {
        setLocalGoals([])
      } finally {
        setIsLoading(false)
      }
    }
    loadGoals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskObjectivesDialogOpen, selectedProjectForTasks])

  const saveToServer = useCallback(async (goals: TaskGoalItem[], deleted: TaskGoalItem[]) => {
    const payload: TaskGoalItem[] = [
      ...goals.map((g) => ({
        id: g.id,
        projectId: g.projectId,
        description: g.description,
        product: g.product,
      })),
      ...deleted.map((g) => ({
        id: -Math.abs(g.id),
        projectId: g.projectId,
        description: g.description,
        product: g.product,
      })),
    ]

    setIsSaving(true)
    const result = await projectTeachGoalApi.updateTaskGoals(payload)
    setIsSaving(false)

    if (result.error) {
      console.error("saveToServer failed:", result.error)
      return false
    }
    return true
  }, [])

  const saveAndReload = useCallback(async (goals: TaskGoalItem[], deleted: TaskGoalItem[]) => {
    const success = await saveToServer(goals, deleted)
    if (!success || !selectedProjectForTasks) return false

    const result = await projectTeachGoalApi.getTaskGoals(selectedProjectForTasks)
    if (result.data) {
      const freshGoals = Array.isArray(result.data) ? result.data : []
      setLocalGoals(freshGoals)
      setDeletedGoals([])
      syncGoalsToProjectMatrix(freshGoals)
    }
    return true
  }, [saveToServer, selectedProjectForTasks]) // eslint-disable-line react-hooks/exhaustive-deps

  const syncGoalsToProjectMatrix = (goals: TaskGoalItem[]) => {
    const mappedGoals: ProjectMatrixGoal[] = goals.map((g) => ({
      id: g.id,
      description: g.description,
      product: g.product,
    }))
    setProjectGoalsForDialog(mappedGoals)

    if (projectMatrixData && selectedProjectForTasks) {
      const pid = parseInt(selectedProjectForTasks)
      const updatedProjectMatrixData = {
        ...projectMatrixData,
        projects: (projectMatrixData.projects || []).map((projectItem: any) => {
          if (projectItem.project.id === pid) {
            return { ...projectItem, goals: mappedGoals }
          }
          return projectItem
        }),
      }
      setProjectMatrixData(updatedProjectMatrixData)
      onUpdate({ projectMatrixData: updatedProjectMatrixData })
    }
  }

  const startEditing = (goal: TaskGoalItem) => {
    setEditingTaskId(String(goal.id))
    setNewTaskObjective(goal.description)
    setEditingProduct(goal.product)
  }

  const cancelEditing = (goal: TaskGoalItem) => {
    if (goal.id === 0 && !goal.description) {
      setLocalGoals(localGoals.filter((g) => g !== goal))
    }
    setEditingTaskId(null)
    setNewTaskObjective("")
    setEditingProduct("")
  }

  const handleAddNewGoal = () => {
    if (!projectId) return

    const newGoal: TaskGoalItem = {
      id: 0,
      projectId,
      description: "",
      product: "",
    }

    const updated = [...localGoals, newGoal]
    setLocalGoals(updated)
    setEditingTaskId("0")
    setNewTaskObjective("")
    setEditingProduct("")
  }

  const handleSaveGoal = async (goal: TaskGoalItem) => {
    if (!newTaskObjective.trim()) return

    const applyUpdate = (g: TaskGoalItem) => ({
      ...g,
      description: newTaskObjective.trim(),
      product: editingProduct.trim(),
    })

    const finalGoals = goal.id === 0
      ? localGoals.map((g, idx) =>
          idx === localGoals.indexOf(goal) ? applyUpdate(g) : g
        )
      : localGoals.map((g) =>
          g.id === goal.id ? applyUpdate(g) : g
        )

    setLocalGoals(finalGoals)
    setEditingTaskId(null)
    setNewTaskObjective("")
    setEditingProduct("")

    await saveAndReload(finalGoals, deletedGoals)
  }

  const handleDeleteGoal = async (goal: TaskGoalItem) => {
    if (goal.id === 0) {
      setLocalGoals(localGoals.filter((g) => g !== goal))
      return
    }

    setDeletingGoalId(null)
    const remaining = localGoals.filter((g) => g.id !== goal.id)
    const newDeleted = [...deletedGoals, goal]
    setLocalGoals(remaining)
    setDeletedGoals(newDeleted)

    await saveAndReload(remaining, newDeleted)
  }

  return (
    <Dialog open={taskObjectivesDialogOpen} onOpenChange={setTaskObjectivesDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>教学任务目标管理</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 px-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索教学任务目标..."
              value={taskObjectiveSearch}
              onChange={(e) => setTaskObjectiveSearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button size="sm" onClick={handleAddNewGoal} disabled={isSaving} className="gap-2">
            <Plus className="w-4 h-4" />
            新增
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">教学任务目标</h4>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
          ) : localGoals.length > 0 ? (
            <div className="space-y-2">
              {localGoals
                .filter((goal) => {
                  if (!taskObjectiveSearch) return true
                  const searchLower = taskObjectiveSearch.toLowerCase()
                  return (
                    goal.description?.toLowerCase().includes(searchLower) ||
                    goal.product?.toLowerCase().includes(searchLower)
                  )
                })
                .map((goal, idx) => {
                  const goalKey = goal.id === 0 ? `new-${idx}` : String(goal.id)
                  const isEditing = editingTaskId === String(goal.id) || (goal.id === 0 && editingTaskId === "0")

                  return (
                    <div
                      key={goalKey}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                    >
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">项目任务目标</div>
                              <ExpandableTextarea
                                value={newTaskObjective}
                                onChange={setNewTaskObjective}
                                placeholder="请输入项目任务目标的内容"
                                maxLength={500}
                                rows={3}
                                autoFocus
                              />
                            </div>
                            <div>
                              <div className="text-xs font-medium text-muted-foreground mb-1">学习产出及测量评价标准（可选）</div>
                              <ExpandableTextarea
                                value={editingProduct}
                                onChange={setEditingProduct}
                                placeholder="请输入学习产出及测量评价标准"
                                maxLength={500}
                                rows={3}
                              />
                            </div>
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleSaveGoal(goal)}
                                disabled={isSaving}
                                className="p-1.5 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
                                title="保存"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </button>
                              <button
                                onClick={() => cancelEditing(goal)}
                                className="p-1.5 rounded hover:bg-red-100 transition-colors"
                                title="取消"
                              >
                                <X className="w-4 h-4 text-red-600" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm text-foreground font-medium">{goal.description || "未设置"}</div>
                            {goal.product && (
                              <div className="text-xs text-muted-foreground">
                                {goal.product}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {!isEditing && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => startEditing(goal)}
                            disabled={isSaving}
                            className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                            title="编辑"
                          >
                            <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                          </button>
                          <Popover
                            open={deletingGoalId === goalKey}
                            onOpenChange={(open) => setDeletingGoalId(open ? goalKey : null)}
                          >
                            <PopoverTrigger asChild>
                              <button
                                disabled={isSaving}
                                className="p-1.5 rounded hover:bg-secondary transition-colors disabled:opacity-50"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="top" align="end" className="w-auto p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground whitespace-nowrap">
                                  确认删除{goal.description ? `「${goal.description}」` : "此目标"}？
                                </span>
                                <button
                                  onClick={() => handleDeleteGoal(goal)}
                                  className="p-1.5 rounded hover:bg-green-100 transition-colors"
                                  title="确认删除"
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </button>
                                <button
                                  onClick={() => setDeletingGoalId(null)}
                                  className="p-1.5 rounded hover:bg-red-100 transition-colors"
                                  title="取消"
                                >
                                  <X className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无教学任务目标</div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={closeTaskObjectivesDialog} disabled={isSaving}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
