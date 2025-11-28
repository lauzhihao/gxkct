import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { TeachingSupervisoryTask } from "@/types"

type TeachingStatus = "not_started" | "in_progress" | "completed"

interface UseTeachingTasksResult {
  tasks: TeachingSupervisoryTask[]
  isLoading: boolean
  createTask: (taskData: Omit<TeachingSupervisoryTask, "id" | "createdAt">) => Promise<TeachingSupervisoryTask | null>
  updateTask: (task: TeachingSupervisoryTask) => Promise<TeachingSupervisoryTask | null>
  autoSaveTask: (task: TeachingSupervisoryTask) => Promise<void>
  updateTaskStatus: (taskId: string, status: TeachingStatus) => Promise<TeachingSupervisoryTask | null>
}

export function useTeachingTasks(universityId: string): UseTeachingTasksResult {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const response = await api.teachingTasks.getTasks(universityId)
        if (response.data) {
          setTasks(response.data)
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [universityId])

  const updateTaskState = useCallback((updated: TeachingSupervisoryTask) => {
    setTasks((prev) => prev.map((task) => (task.id === updated.id ? updated : task)))
  }, [])

  const createTask = useCallback(
    async (taskData: Omit<TeachingSupervisoryTask, "id" | "createdAt">) => {
      const response = await api.teachingTasks.createTask(taskData)
      if (response.data) {
        setTasks((prev) => [...prev, response.data!])
        return response.data
      }
      return null
    },
    [],
  )

  const updateTask = useCallback(
    async (task: TeachingSupervisoryTask) => {
      const response = await api.teachingTasks.updateTask(universityId, task.id, task)
      if (response.data) {
        updateTaskState(response.data)
        return response.data
      }
      return null
    },
    [universityId, updateTaskState],
  )

  const autoSaveTask = useCallback(
    async (task: TeachingSupervisoryTask) => {
      const response = await api.teachingTasks.updateTask(universityId, task.id, task)
      if (response.data) {
        updateTaskState(response.data)
      }
    },
    [universityId, updateTaskState],
  )

  const updateTaskStatus = useCallback(
    async (taskId: string, status: TeachingStatus) => {
      const target = tasks.find((t) => t.id === taskId)
      if (!target) return null
      const updatedTask = { ...target, status }
      const response = await api.teachingTasks.updateTask(universityId, taskId, updatedTask)
      if (response.data) {
        updateTaskState(response.data)
        return response.data
      }
      return null
    },
    [tasks, universityId, updateTaskState],
  )

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    autoSaveTask,
    updateTaskStatus,
  }
}
