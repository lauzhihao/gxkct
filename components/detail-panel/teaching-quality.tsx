"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useState } from "react"
import type { TreeNode, TeachingSupervisoryTask } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { TeachingTaskList } from "./shared/teaching-task-list"
import { TeachingTaskEvaluation } from "./teaching-task-evaluation"
import { TeachingTaskFormPage } from "./teaching-task-form-page"

interface TeachingQualityProps {
  node: TreeNode
}

type PageState = "list" | "view" | "create" | "edit"

export function TeachingQuality({ node }: TeachingQualityProps) {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [selectedStatus, setSelectedStatus] = useState<"not_started" | "in_progress" | "completed" | null>(null)
  const [selectedTask, setSelectedTask] = useState<TeachingSupervisoryTask | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [pageState, setPageState] = useState<PageState>("list")

  // 从API获取任务数据
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true)
        // 获取当前学校ID - 教学质量页面只在university节点显示，所以node.id就是universityId
        const universityId = node.id

        console.log("获取教学督导任务，universityId:", universityId, "node.type:", node.type)
        const response = await api.teachingTasks.getTasks(universityId)
        console.log("API响应:", response)
        if (response.data) {
          console.log("获取到任务数据:", response.data)
          setTasks(response.data)
        } else {
          console.log("API返回的data为空，error:", response.error)
        }
      } catch (error) {
        console.error("获取教学督导任务失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTasks()
  }, [node.id])

  // 计算各状态的任务数
  const notStartedCount = tasks.filter((t) => t.status === "not_started").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const completedCount = tasks.filter((t) => t.status === "completed").length

  const handleCreateTask = async (taskData: Omit<TeachingSupervisoryTask, "id" | "createdAt">) => {
    try {
      // 新增任务时默认设置为未开始
      const taskWithStatus = {
        ...taskData,
        status: "not_started" as const,
      }
      const response = await api.teachingTasks.createTask(taskWithStatus)
      if (response.data) {
        setTasks([...tasks, response.data])
        setPageState("list")
      }
    } catch (error) {
      console.error("创建教学督导任务失败:", error)
    }
  }

  const handleUpdateTask = async (taskData: TeachingSupervisoryTask) => {
    try {
      const response = await api.teachingTasks.updateTask(node.id, taskData.id, taskData)
      if (response.data) {
        setTasks(tasks.map((t) => (t.id === taskData.id ? response.data : t)))
        setSelectedTask(response.data)
        setPageState("view")
      }
    } catch (error) {
      console.error("更新教学督导任务失败:", error)
    }
  }

  // 自动保存任务（不改变页面状态）
  const handleAutoSaveTask = async (taskData: TeachingSupervisoryTask) => {
    try {
      const response = await api.teachingTasks.updateTask(node.id, taskData.id, taskData)
      if (response.data) {
        // 只更新任务列表，不改变页面状态
        setTasks(tasks.map((t) => (t.id === taskData.id ? response.data : t)))
      }
    } catch (error) {
      console.error("自动保存教学督导任务失败:", error)
    }
  }

  const handleStatusChange = async (taskId: string, newStatus: "not_started" | "in_progress" | "completed") => {
    try {
      const task = tasks.find((t) => t.id === taskId)
      if (!task) return

      const updatedTask = { ...task, status: newStatus }
      const response = await api.teachingTasks.updateTask(node.id, taskId, updatedTask)
      if (response.data) {
        setTasks(tasks.map((t) => (t.id === taskId ? response.data : t)))
      }
    } catch (error) {
      console.error("更新任务状态失败:", error)
    }
  }

  const handleCopyTask = async (task: TeachingSupervisoryTask, standards: any) => {
    // 创建新任务，不包含 id 和 createdAt
    const newTask: Omit<TeachingSupervisoryTask, "id" | "createdAt"> & { id?: string; createdAt?: string } = {
      universityId: task.universityId,
      title: `${task.title}（副本）`,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      status: "not_started",
      creator: task.creator,
    }

    // 保存复制的评价标准到临时状态
    const copiedStandards = standards?.items || []

    // 通过 window 对象传递复制的数据给表单组件
    ;(window as any).__copiedTaskData = {
      task: newTask,
      standards: copiedStandards,
    }

    // 切换到新增模式
    setPageState("create")
  }

  // 页面状态路由
  if (pageState === "create") {
    const newTask: Omit<TeachingSupervisoryTask, "id" | "createdAt"> & { id?: string; createdAt?: string } = {
      universityId: node.id,
      title: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      status: "not_started",
      creator: "",
    }
    return (
      <TeachingTaskFormPage
        task={newTask as TeachingSupervisoryTask}
        onBack={() => setPageState("list")}
        onSubmit={handleCreateTask}
      />
    )
  }

  if (pageState === "edit" && selectedTask) {
    return (
      <TeachingTaskFormPage
        task={selectedTask}
        onBack={() => setPageState("view")}
        onSubmit={handleUpdateTask}
        onAutoSave={handleAutoSaveTask}
      />
    )
  }

  // 如果选中了任务，显示评价标准管理页面
  if (pageState === "view" && selectedTask) {
    return (
      <TeachingTaskEvaluation
        task={selectedTask}
        onBack={() => {
          setSelectedTask(null)
          setPageState("list")
        }}
        onEdit={() => setPageState("edit")}
        onCopy={handleCopyTask}
      />
    )
  }

  // 加载状态
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="text-center py-12 text-muted-foreground">
          <p>加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Header with action button */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">数据统计</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPageState("create")}
            className="gap-2 hover:bg-primary/10"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span className="text-primary font-medium">督导任务</span>
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 grid-cols-3">
          <Card
            className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => setSelectedStatus(selectedStatus === "not_started" ? null : "not_started")}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-bold text-foreground">{notStartedCount}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>未开始</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => setSelectedStatus(selectedStatus === "in_progress" ? null : "in_progress")}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-bold text-foreground">{inProgressCount}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>进行中</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
            onClick={() => setSelectedStatus(selectedStatus === "completed" ? null : "completed")}
          >
            <CardContent className="p-4">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="text-3xl font-bold text-foreground">{completedCount}</div>
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>已结束</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teaching Tasks List */}
        <div className="space-y-3">
          <h3 className="text-base font-medium text-foreground">
            {selectedStatus ? `${["未开始", "进行中", "已结束"][["not_started", "in_progress", "completed"].indexOf(selectedStatus)]}的教学质量督导任务` : "教学质量督导任务"}
          </h3>
          <TeachingTaskList
            tasks={tasks}
            selectedStatus={selectedStatus}
            onTaskClick={(task) => {
              setSelectedTask(task)
              setPageState("view")
            }}
            onStatusChange={handleStatusChange}
          />
        </div>
      </div>
    </div>
  )
}

