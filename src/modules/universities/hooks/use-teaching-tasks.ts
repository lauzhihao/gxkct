import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { TeachingSupervisoryTask, Long } from "@/types"

type TeachingStatus = "not_started" | "in_progress" | "completed"
type TeachingTaskInput = Omit<TeachingSupervisoryTask, "id" | "createdAt" | "updatedAt">

interface UseTeachingTasksResult {
  tasks: TeachingSupervisoryTask[]
  isLoading: boolean
  createTask: (taskData: TeachingTaskInput) => Promise<TeachingSupervisoryTask | null>
  updateTask: (task: TeachingSupervisoryTask) => Promise<TeachingSupervisoryTask | null>
  autoSaveTask: (task: TeachingSupervisoryTask) => Promise<void>
  updateTaskStatus: (taskId: Long, status: TeachingStatus) => Promise<TeachingSupervisoryTask | null>
  archiveTask: (taskId: Long) => Promise<TeachingSupervisoryTask | null>
}

export function useTeachingTasks(universityId: Long): UseTeachingTasksResult {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        const response = await api.teachingTasks.getTasks(universityId, {
          includeCriteria: true,
        })
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
    async (taskData: TeachingTaskInput) => {
      const response = await api.teachingTasks.createTask(universityId, taskData)
      if (response.data) {
        setTasks((prev) => [...prev, response.data!])
        return response.data
      }
      return null
    },
    [universityId],
  )

  const updateTask = useCallback(
    async (task: TeachingSupervisoryTask) => {
      if (typeof task.id !== "number") {
        return null
      }
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
      if (typeof task.id !== "number") {
        return
      }
      const response = await api.teachingTasks.updateTask(universityId, task.id, task)
      if (response.data) {
        updateTaskState(response.data)
      }
    },
    [universityId, updateTaskState],
  )

  const updateTaskStatus = useCallback(
    async (taskId: Long, status: TeachingStatus) => {
      const response = await api.teachingTasks.updateTaskStatus(universityId, taskId, status)
      if (response.data) {
        updateTaskState(response.data)
        return response.data
      }
      return null
    },
    [universityId, updateTaskState],
  )

  const archiveTask = useCallback(
    async (taskId: Long) => {
      const response = await api.teachingTasks.archiveTask(universityId, taskId)
      if (response.data) {
        updateTaskState(response.data)
        return response.data
      }
      return null
    },
    [universityId, updateTaskState],
  )

  return {
    tasks,
    isLoading,
    createTask,
    updateTask,
    autoSaveTask,
    updateTaskStatus,
    archiveTask,
  }
}
