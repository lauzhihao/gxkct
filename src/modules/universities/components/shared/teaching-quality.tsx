"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { useEffect, useState } from "react"
import type { TreeNode, TeachingSupervisoryTask, TaskEvaluationCriteria, Long } from "@/types"
import { LoadingState } from "@/shared/components/ui/loading-state"

// 定义通过 window 对象传递的复制任务数据类型
interface CopiedTaskData {
  task: TeachingTaskDraft
  criteria: Array<unknown>
}

// 扩展 Window 类型以支持 __copiedTaskData 属性
declare global {
  interface Window {
    __copiedTaskData?: CopiedTaskData
  }
}
import { Button } from "@/shared/components/ui/button"
import { Plus } from "lucide-react"
import { TeachingTaskList } from "./shared/teaching-task-list"
import { TeachingTaskEvaluation } from "./teaching-task-evaluation"
import { TeachingTaskFormPage } from "./teaching-task-form-page"
import { useTeachingTasks } from "@/modules/universities/hooks/use-teaching-tasks"
import { DeptEvaluationList } from "@/shared/components/supervision"
import { usePermission } from "@/shared/hooks/use-permission"

interface TeachingQualityProps {
  node: TreeNode
}

type PageState = "list" | "view" | "create" | "edit" | "depts"
type TeachingTaskDraft = Omit<TeachingSupervisoryTask, "id" | "createdAt" | "updatedAt">

export function TeachingQuality({ node }: TeachingQualityProps) {
  const { can } = usePermission()
  const canCreateTeachingTask = can("college.qa.create", { scope: "college" })
  const canManageTeachingTask = can("college.qa.manage", { scope: "college" })
  // 从 node.id 中提取数字部分（处理 "univ_86" 格式）
  const nodeId = node.id || node.nodeId || ""
  const idMatch = nodeId.match(/\d+/)
  const universityLongId = (idMatch ? Number(idMatch[0]) : Number(nodeId)) as Long
  const {
    tasks,
    isLoading,
    refetch,
    createTask,
    updateTask: updateTaskRecord,
    autoSaveTask,
    updateTaskStatus,
    archiveTask,
  } = useTeachingTasks(universityLongId)
  const [selectedStatus, setSelectedStatus] = useState<"not_started" | "in_progress" | "completed" | null>(null)
  const [selectedTask, setSelectedTask] = useState<TeachingSupervisoryTask | null>(null)
  const [pageState, setPageState] = useState<PageState>("list")

  // 计算各状态的任务数
  const notStartedCount = tasks.filter((t) => t.status === "not_started").length
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length
  const completedCount = tasks.filter((t) => t.status === "completed").length

  const handleCreateTask = async (taskData: TeachingTaskDraft) => {
    if (!canCreateTeachingTask) {
      console.warn("[TeachingQuality] create teaching task blocked by whitelist")
      return null
    }

    const taskWithStatus = {
      ...taskData,
      status: "not_started" as const,
    }
    const created = await createTask(taskWithStatus)
    if (created) {
      setPageState("list")
    }
    return created
  }

  const handleUpdateTask = async (taskData: TeachingSupervisoryTask) => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingQuality] update teaching task blocked by whitelist")
      return null
    }

    const updated = await updateTaskRecord(taskData)
    if (updated) {
      setSelectedTask(updated)
      setPageState("view")
    }
    return updated
  }

  const handleAutoSaveTask = async (taskData: TeachingSupervisoryTask) => {
    if (!canManageTeachingTask) {
      return
    }

    await autoSaveTask(taskData)
  }

  const handleStatusChange = async (
    taskId: NonNullable<TeachingSupervisoryTask["id"]>,
    newStatus: "not_started" | "in_progress" | "completed",
  ) => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingQuality] update task status blocked by whitelist")
      return
    }

    const updated = await updateTaskStatus(taskId, newStatus)
    if (updated && selectedTask?.id === updated.id) {
      setSelectedTask(updated)
    }
  }

  const handleCopyTask = async (
    task: TeachingSupervisoryTask,
    criteria: TaskEvaluationCriteria | null,
  ) => {
    if (!canCreateTeachingTask) {
      console.warn("[TeachingQuality] copy teaching task blocked by whitelist")
      return
    }

    // 创建新任务，不包含 id 和 createdAt
    const newTask: TeachingTaskDraft = {
      universityId: task.universityId,
      title: `${task.title}（副本）`,
      description: task.description,
      startDate: task.startDate,
      endDate: task.endDate,
      status: "not_started",
      creator: task.creator,
      publishNodes: (task.publishNodes || []).map((node) => ({ ...node })),
      scoringType: task.scoringType || "percentage",
      teacherSelfEvaluation: task.teacherSelfEvaluation,
      juryMembers: task.juryMembers ? [...task.juryMembers] : undefined,
      collegeJuryMembers: task.collegeJuryMembers ? [...task.collegeJuryMembers] : undefined,
    }

    // 保存复制的评价标准到临时状态
    const copiedCriteria = criteria?.items || []

    // 通过 window 对象传递复制的数据给表单组件
    window.__copiedTaskData = {
      task: newTask,
      criteria: copiedCriteria,
    }

    // 切换到新增模式
    setPageState("create")
  }

  const handleArchiveTask = async (taskId: NonNullable<TeachingSupervisoryTask["id"]>) => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingQuality] archive teaching task blocked by whitelist")
      return
    }

    await archiveTask(taskId)
  }

  const handleOpenCreatePage = () => {
    if (!canCreateTeachingTask) {
      console.warn("[TeachingQuality] open create page blocked by whitelist")
      return
    }

    setPageState("create")
  }

  useEffect(() => {
    if (pageState === "create" && !canCreateTeachingTask) {
      setPageState("list")
      return
    }

    if (pageState === "edit" && !canManageTeachingTask) {
      setPageState("view")
    }
  }, [canCreateTeachingTask, canManageTeachingTask, pageState])

  // 页面状态路由
  if (pageState === "create") {
    const newTask: TeachingTaskDraft = {
      universityId: universityLongId,
      title: "",
      description: "",
      startDate: "",
      endDate: "",
      status: "not_started",
      creator: "",
      publishNodes: [],
      scoringType: "percentage",
      teacherSelfEvaluation: true,
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
        onEdit={canManageTeachingTask ? () => setPageState("edit") : undefined}
        onCopy={canCreateTeachingTask ? handleCopyTask : undefined}
        onArchive={canManageTeachingTask ? handleArchiveTask : undefined}
        onStatusChange={canManageTeachingTask ? handleStatusChange : undefined}
      />
    )
  }

  // 显示院系评估列表
  if (pageState === "depts" && selectedTask) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <DeptEvaluationList
          task={selectedTask}
          collegeId={universityLongId}
          collegeName={node.nodeName || node.name}
          onBack={() => {
            setSelectedTask(null)
            setPageState("list")
          }}
          onSaveSuccess={refetch}
        />
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState variant="card" />
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Header with action button */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium text-foreground">数据统计</h3>
          {canCreateTeachingTask && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenCreatePage}
              className="gap-2 hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 text-primary" />
              <span className="text-primary font-medium">新任务</span>
            </Button>
          )}
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
            {selectedStatus ? `${["未开始", "进行中", "已结束"][["not_started", "in_progress", "completed"].indexOf(selectedStatus)]}的任务` : "教学质量督导任务"}
          </h3>
          <TeachingTaskList
            tasks={tasks}
            selectedStatus={selectedStatus}
            onTaskClick={(task) => {
              setSelectedTask(task)
              setPageState("depts")
            }}
            onSettingsClick={canManageTeachingTask
              ? (task) => {
                setSelectedTask(task)
                setPageState("view")
              }
              : undefined}
          />
        </div>
      </div>
    </div>
  )
}
