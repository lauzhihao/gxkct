/**
 * 任务目标管理Hook
 * 负责管理任务目标对话框的状态和操作
 */

import { useState } from "react"

export interface TaskObjective {
  id: string
  content: string
  ksaPoints?: Array<{
    id: string
    title: string
    description: string
  }>
}

type ProjectGoal = Record<string, unknown>

export interface UseTaskObjectivesResult {
  // 对话框状态
  taskObjectivesDialogOpen: boolean
  selectedProjectForTasks: string | null
  projectGoalsForDialog: ProjectGoal[]

  // 编辑状态
  newTaskObjective: string
  editingTaskId: string | null
  taskObjectiveSearch: string
  focusedCell: string | null

  // 状态更新方法
  setTaskObjectivesDialogOpen: (value: boolean) => void
  setSelectedProjectForTasks: (value: string | null) => void
  setProjectGoalsForDialog: (value: ProjectGoal[]) => void
  setNewTaskObjective: (value: string) => void
  setEditingTaskId: (value: string | null) => void
  setTaskObjectiveSearch: (value: string) => void
  setFocusedCell: (value: string | null) => void

  // 业务操作方法
  openTaskObjectivesDialog: (projectId: string, goals: ProjectGoal[]) => void
  closeTaskObjectivesDialog: () => void
  addTaskObjective: (chapterId: string, coursePointId: string) => void
  updateTaskObjective: (chapterId: string, coursePointId: string, taskId: string, newContent: string) => void
  deleteTaskObjective: (chapterId: string, coursePointId: string, taskId: string) => void
}

export function useTaskObjectives(
  chapterTaskObjectives: Record<string, TaskObjective[]>,
  setChapterTaskObjectives: (value: Record<string, TaskObjective[]>) => void
): UseTaskObjectivesResult {
  const [taskObjectivesDialogOpen, setTaskObjectivesDialogOpen] = useState(false)
  const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<string | null>(null)
  const [projectGoalsForDialog, setProjectGoalsForDialog] = useState<ProjectGoal[]>([])
  const [newTaskObjective, setNewTaskObjective] = useState("")
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [taskObjectiveSearch, setTaskObjectiveSearch] = useState("")
  const [focusedCell, setFocusedCell] = useState<string | null>(null)

  // 打开任务目标对话框
  const openTaskObjectivesDialog = (projectId: string, goals: ProjectGoal[]) => {
    setSelectedProjectForTasks(projectId)
    setProjectGoalsForDialog(goals || [])
    setTaskObjectivesDialogOpen(true)
    setNewTaskObjective("")
    setTaskObjectiveSearch("")
  }

  // 关闭任务目标对话框
  const closeTaskObjectivesDialog = () => {
    setTaskObjectivesDialogOpen(false)
    setSelectedProjectForTasks(null)
    setProjectGoalsForDialog([])
    setNewTaskObjective("")
    setEditingTaskId(null)
    setTaskObjectiveSearch("")
  }

  // 添加任务目标
  const addTaskObjective = (chapterId: string, coursePointId: string) => {
    if (!newTaskObjective.trim()) return

    const cellKey = `${chapterId}-${coursePointId}`
    const newTask = {
      id: `task-${Date.now()}`,
      content: newTaskObjective.trim(),
      ksaPoints: [],
    }

    setChapterTaskObjectives({
      ...chapterTaskObjectives,
      [cellKey]: [...(chapterTaskObjectives[cellKey] || []), newTask],
    })

    setNewTaskObjective("")
  }

  // 更新任务目标
  const updateTaskObjective = (
    chapterId: string,
    coursePointId: string,
    taskId: string,
    newContent: string
  ) => {
    const cellKey = `${chapterId}-${coursePointId}`
    const tasks = chapterTaskObjectives[cellKey] || []

    setChapterTaskObjectives({
      ...chapterTaskObjectives,
      [cellKey]: tasks.map((task) =>
        task.id === taskId ? { ...task, content: newContent } : task
      ),
    })

    setEditingTaskId(null)
  }

  // 删除任务目标
  const deleteTaskObjective = (chapterId: string, coursePointId: string, taskId: string) => {
    const cellKey = `${chapterId}-${coursePointId}`
    const tasks = chapterTaskObjectives[cellKey] || []

    const updatedTasks = tasks.filter((task) => task.id !== taskId)

    if (updatedTasks.length === 0) {
      const newObjectives = { ...chapterTaskObjectives }
      delete newObjectives[cellKey]
      setChapterTaskObjectives(newObjectives)
    } else {
      setChapterTaskObjectives({
        ...chapterTaskObjectives,
        [cellKey]: updatedTasks,
      })
    }
  }

  return {
    taskObjectivesDialogOpen,
    selectedProjectForTasks,
    projectGoalsForDialog,
    newTaskObjective,
    editingTaskId,
    taskObjectiveSearch,
    focusedCell,
    setTaskObjectivesDialogOpen,
    setSelectedProjectForTasks,
    setProjectGoalsForDialog,
    setNewTaskObjective,
    setEditingTaskId,
    setTaskObjectiveSearch,
    setFocusedCell,
    openTaskObjectivesDialog,
    closeTaskObjectivesDialog,
    addTaskObjective,
    updateTaskObjective,
    deleteTaskObjective,
  }
}
