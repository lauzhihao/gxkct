/**
 * 任务目标对话框组件
 * 负责管理任务目标的CRUD操作
 */

import { Plus, Check, X, Edit, Trash2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { UseTaskObjectivesResult } from "@/modules/courses/hooks/use-task-objectives"
import type { ProjectMatrixData } from "@/modules/courses/hooks/use-project-matrix"

interface TaskObjectivesDialogProps {
  taskObjectivesDialogOpen: boolean
  selectedProjectForTasks: string | null
  projectGoalsForDialog: any[]
  newTaskObjective: string
  editingTaskId: string | null
  taskObjectiveSearch: string
  projectMatrixData: ProjectMatrixData | null
  setTaskObjectivesDialogOpen: (value: boolean) => void
  setNewTaskObjective: (value: string) => void
  setEditingTaskId: (value: string | null) => void
  setTaskObjectiveSearch: (value: string) => void
  setProjectGoalsForDialog: (value: any[]) => void
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
  const handleAddNewGoal = () => {
    if (!selectedProjectForTasks || !projectMatrixData) return

    const newGoal = {
      id: Date.now(),
      projectId: parseInt(selectedProjectForTasks),
      description: "",
      product: "",
    }

    const updatedProjectMatrixData = {
      ...projectMatrixData,
      projects: (projectMatrixData.projects || []).map((projectItem: any) => {
        if (projectItem.project.id === parseInt(selectedProjectForTasks)) {
          return {
            ...projectItem,
            goals: [newGoal, ...(projectItem.goals || [])],
          }
        }
        return projectItem
      }),
    }

    setProjectMatrixData(updatedProjectMatrixData)
    setProjectGoalsForDialog([newGoal, ...projectGoalsForDialog])
    onUpdate({
      projectMatrixData: updatedProjectMatrixData,
    })
    // 自动进入编辑模式
    setEditingTaskId(String(newGoal.id))
    setNewTaskObjective("")
  }

  const handleSaveGoal = (goal: any) => {
    if (!newTaskObjective.trim() || !projectMatrixData || !selectedProjectForTasks) return

    const updatedProjectMatrixData = {
      ...projectMatrixData,
      projects: (projectMatrixData.projects || []).map((projectItem: any) => {
        if (projectItem.project.id === parseInt(selectedProjectForTasks)) {
          return {
            ...projectItem,
            goals: projectItem.goals.map((g: any) =>
              g.id === goal.id ? { ...g, description: newTaskObjective.trim() } : g
            ),
          }
        }
        return projectItem
      }),
    }

    setProjectMatrixData(updatedProjectMatrixData)
    setProjectGoalsForDialog(
      projectGoalsForDialog.map((g) => (g.id === goal.id ? { ...g, description: newTaskObjective.trim() } : g))
    )
    onUpdate({
      projectMatrixData: updatedProjectMatrixData,
    })
    setEditingTaskId(null)
    setNewTaskObjective("")
  }

  const handleDeleteGoal = (goalId: number) => {
    if (!selectedProjectForTasks || !projectMatrixData) return

    const updatedProjectMatrixData = {
      ...projectMatrixData,
      projects: (projectMatrixData.projects || []).map((projectItem: any) => {
        if (projectItem.project.id === parseInt(selectedProjectForTasks)) {
          return {
            ...projectItem,
            goals: projectItem.goals.filter((g: any) => g.id !== goalId),
          }
        }
        return projectItem
      }),
    }

    setProjectMatrixData(updatedProjectMatrixData)
    setProjectGoalsForDialog(projectGoalsForDialog.filter((g) => g.id !== goalId))
    onUpdate({
      projectMatrixData: updatedProjectMatrixData,
    })
  }

  return (
    <Dialog open={taskObjectivesDialogOpen} onOpenChange={setTaskObjectivesDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>教学任务目标管理</DialogTitle>
        </DialogHeader>

        {/* 顶部搜索框和加号按钮 */}
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
          <Button size="sm" onClick={handleAddNewGoal} className="gap-2">
            <Plus className="w-4 h-4" />
            新增
          </Button>
        </div>

        {/* 教学任务目标列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">教学任务目标</h4>
          {projectGoalsForDialog && projectGoalsForDialog.length > 0 ? (
            <div className="space-y-2">
              {projectGoalsForDialog
                .filter((goal) => {
                  if (!taskObjectiveSearch) return true
                  const searchLower = taskObjectiveSearch.toLowerCase()
                  return goal.description?.toLowerCase().includes(searchLower)
                })
                .map((goal, idx) => (
                  <div
                    key={goal.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 space-y-1">
                      {editingTaskId === String(goal.id) ? (
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <ExpandableTextarea
                              value={newTaskObjective}
                              onChange={setNewTaskObjective}
                              placeholder="输入任务目标"
                              maxLength={500}
                              rows={4}
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-1 flex-shrink-0 pt-1">
                            <button
                              onClick={() => handleSaveGoal(goal)}
                              className="p-1.5 rounded hover:bg-green-100 transition-colors"
                              title="保存"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingTaskId(null)
                                setNewTaskObjective("")
                              }}
                              className="p-1.5 rounded hover:bg-red-100 transition-colors"
                              title="取消"
                            >
                              <X className="w-4 h-4 text-red-600" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-foreground font-medium">{goal.description || "未设置"}</div>
                        </>
                      )}
                    </div>
                    {editingTaskId !== String(goal.id) && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => {
                            setEditingTaskId(String(goal.id))
                            setNewTaskObjective(goal.description)
                          }}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="编辑"
                        >
                          <Edit className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="p-1.5 rounded hover:bg-secondary transition-colors"
                          title="删除"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无教学任务目标</div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={closeTaskObjectivesDialog}>完成</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
