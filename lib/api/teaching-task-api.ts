import { StorageAdapter } from "./storage-adapter"
import type { ApiResponse } from "./types"
import type { TeachingSupervisoryTask, TeachingQualityStandard } from "@/types"

export class TeachingTaskApi {
  private storage = new StorageAdapter()
  private storageKeyPrefix = "teaching-tasks-"
  private standardsKeyPrefix = "teaching-standards-"

  /**
   * 获取指定学校的所有教学督导任务
   */
  async getTasks(universityId: string): Promise<ApiResponse<TeachingSupervisoryTask[]>> {
    const key = `${this.storageKeyPrefix}${universityId}`
    const response = await this.storage.get<TeachingSupervisoryTask[]>(key)
    return response
  }

  /**
   * 获取单个教学督导任务
   */
  async getTask(taskId: string): Promise<ApiResponse<TeachingSupervisoryTask>> {
    const key = `teaching-task-${taskId}`
    const response = await this.storage.get<TeachingSupervisoryTask>(key)
    return response
  }

  /**
   * 创建新的教学督导任务
   */
  async createTask(task: Omit<TeachingSupervisoryTask, "id" | "createdAt">): Promise<ApiResponse<TeachingSupervisoryTask>> {
    const newTask: TeachingSupervisoryTask = {
      id: `task-${Date.now()}`,
      ...task,
      createdAt: new Date().toISOString(),
    }

    // 获取现有任务列表
    const tasksResponse = await this.getTasks(task.universityId)
    const tasks = tasksResponse.data || []

    // 添加新任务
    tasks.push(newTask)

    // 保存更新后的任务列表
    const key = `${this.storageKeyPrefix}${task.universityId}`
    await this.storage.set(key, tasks)

    return { data: newTask, error: null, status: 200 }
  }

  /**
   * 更新教学督导任务
   */
  async updateTask(
    universityId: string,
    taskId: string,
    updates: Partial<TeachingSupervisoryTask>,
  ): Promise<ApiResponse<TeachingSupervisoryTask>> {
    // 获取现有任务列表
    const tasksResponse = await this.getTasks(universityId)
    if (tasksResponse.error || !tasksResponse.data) {
      return { data: null, error: tasksResponse.error, status: tasksResponse.status }
    }

    // 查找并更新任务
    const tasks = tasksResponse.data
    const taskIndex = tasks.findIndex((t) => t.id === taskId)

    if (taskIndex === -1) {
      return { data: null, error: "Task not found", status: 404 }
    }

    const updatedTask: TeachingSupervisoryTask = {
      ...tasks[taskIndex],
      ...updates,
      id: taskId, // 保持ID不变
      createdAt: tasks[taskIndex].createdAt, // 保持创建时间不变
      updatedAt: new Date().toISOString(),
    }

    tasks[taskIndex] = updatedTask

    // 保存更新后的任务列表
    const key = `${this.storageKeyPrefix}${universityId}`
    await this.storage.set(key, tasks)

    return { data: updatedTask, error: null, status: 200 }
  }

  /**
   * 删除教学督导任务
   */
  async deleteTask(universityId: string, taskId: string): Promise<ApiResponse<boolean>> {
    // 获取现有任务列表
    const tasksResponse = await this.getTasks(universityId)
    if (tasksResponse.error || !tasksResponse.data) {
      return { data: null, error: tasksResponse.error, status: tasksResponse.status }
    }

    // 过滤掉要删除的任务
    const tasks = tasksResponse.data.filter((t) => t.id !== taskId)

    // 保存更新后的任务列表
    const key = `${this.storageKeyPrefix}${universityId}`
    await this.storage.set(key, tasks)

    return { data: true, error: null, status: 200 }
  }

  /**
   * 按状态过滤任务
   */
  async getTasksByStatus(
    universityId: string,
    status: "not_started" | "in_progress" | "completed",
  ): Promise<ApiResponse<TeachingSupervisoryTask[]>> {
    const tasksResponse = await this.getTasks(universityId)
    if (tasksResponse.error || !tasksResponse.data) {
      return tasksResponse
    }

    const filteredTasks = tasksResponse.data.filter((t) => t.status === status)
    return { data: filteredTasks, error: null, status: 200 }
  }

  /**
   * 获取任务的评价标准
   */
  async getTaskStandards(taskId: string): Promise<ApiResponse<TeachingQualityStandard>> {
    try {
      // 首先尝试从 localStorage 获取
      const key = `${this.standardsKeyPrefix}${taskId}`
      const response = await this.storage.get<TeachingQualityStandard>(key)

      // 如果找到了，直接返回
      if (response.data) {
        return response
      }

      // 如果没有找到，从 mock 数据文件读取
      const mockData = await import("@/mock-data/teaching-standards.json")
      const standards = mockData.data.find((s: TeachingQualityStandard) => s.taskId === taskId)

      if (standards) {
        return { data: standards, error: null, status: 200 }
      }

      return { data: null, error: "标准未找到", status: 404 }
    } catch (error) {
      console.error("获取评价标准失败:", error)
      return { data: null, error: String(error), status: 500 }
    }
  }

  /**
   * 保存任务的评价标准
   */
  async saveTaskStandards(
    universityId: string,
    taskId: string,
    standards: TeachingQualityStandard,
  ): Promise<ApiResponse<TeachingQualityStandard>> {
    const key = `${this.standardsKeyPrefix}${taskId}`
    const standardsData: TeachingQualityStandard = {
      ...standards,
      universityId,
      taskId,
      updatedAt: new Date().toISOString(),
    }
    await this.storage.set(key, standardsData)
    return { data: standardsData, error: null, status: 200 }
  }
}

