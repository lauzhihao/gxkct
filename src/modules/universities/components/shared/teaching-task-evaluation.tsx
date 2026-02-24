"use client"

import { ArrowLeft, Edit, Copy, Info, Archive, Play, Square, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { Spinner } from "@/shared/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
import type { TeachingSupervisoryTask, TaskEvaluationCriteria } from "@/types"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import { usePermission } from "@/shared/hooks/use-permission"
import type { PermissionAction } from "@/shared/permissions/types"

const CREATE_TEACHING_TASK_ACTION: PermissionAction = "college.qa.create"
const MANAGE_TEACHING_TASK_ACTION: PermissionAction = "college.qa.manage"

interface TeachingTaskEvaluationProps {
  task: TeachingSupervisoryTask
  onBack: () => void
  onEdit?: () => void
  onCopy?: (task: TeachingSupervisoryTask, criteria: TaskEvaluationCriteria | null) => void
  onArchive?: (taskId: NonNullable<TeachingSupervisoryTask["id"]>) => Promise<void>
  onStatusChange?: (
    taskId: NonNullable<TeachingSupervisoryTask["id"]>,
    status: "not_started" | "in_progress" | "completed",
  ) => Promise<void>
}

export function TeachingTaskEvaluation({ task: initialTask, onBack, onEdit, onCopy, onArchive, onStatusChange }: TeachingTaskEvaluationProps) {
  const { can } = usePermission()
  const canCreateTeachingTask = can(CREATE_TEACHING_TASK_ACTION, { scope: "college" })
  const canManageTeachingTask = can(MANAGE_TEACHING_TASK_ACTION, { scope: "college" })
  const [task, setTask] = useState<TeachingSupervisoryTask>(initialTask)
  const [criteria, setCriteria] = useState<TaskEvaluationCriteria | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isArchiving, setIsArchiving] = useState(false)
  const [statusUpdating, setStatusUpdating] = useState<"not_started" | "in_progress" | "completed" | null>(null)
  const [isStopDialogOpen, setIsStopDialogOpen] = useState(false)
  const [isPublishNodesDialogOpen, setIsPublishNodesDialogOpen] = useState(false)
  const [publishNodesFilter, setPublishNodesFilter] = useState("")
  const [isJuryMembersDialogOpen, setIsJuryMembersDialogOpen] = useState(false)
  const [juryMembersFilter, setJuryMembersFilter] = useState("")
  const [isCollegeJuryMembersDialogOpen, setIsCollegeJuryMembersDialogOpen] = useState(false)
  const [collegeJuryMembersFilter, setCollegeJuryMembersFilter] = useState("")

  // 根据任务ID查询最新数据
  useEffect(() => {
    if (typeof initialTask.id !== "number") {
      setCriteria(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let cancelled = false

    const loadTaskData = async () => {
      if (typeof initialTask.id !== "number" || typeof initialTask.universityId !== "number") {
        setCriteria(null)
        setIsLoading(false)
        return
      }

      try {
        const response = await api.teachingTasks.getTask(initialTask.universityId, initialTask.id, {
          includeCriteria: true,
        })
        if (!cancelled && response.data) {
          // 更新任务数据
          setTask(response.data)
          // 更新评价标准
          setCriteria(response.data.evaluationCriteria || null)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载任务数据失败:", error)
          // 加载失败时使用传入的数据
          setTask(initialTask)
          setCriteria(initialTask.evaluationCriteria || null)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadTaskData()

    return () => {
      cancelled = true
    }
  }, [initialTask])

  const handleArchive = async () => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingTaskEvaluation] archive blocked by whitelist")
      return
    }

    if (!onArchive || typeof task.id !== "number") return
    try {
      setIsArchiving(true)
      await onArchive(task.id)
      onBack()
    } finally {
      setIsArchiving(false)
    }
  }

  const handleStatusAction = async (status: "not_started" | "in_progress" | "completed") => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingTaskEvaluation] status update blocked by whitelist")
      return
    }

    if (!onStatusChange || typeof task.id !== "number") return
    try {
      setStatusUpdating(status)
      await onStatusChange(task.id, status)
      // 状态变更成功后更新本地任务状态
      setTask((prev) => ({ ...prev, status }))
    } finally {
      setStatusUpdating(null)
    }
  }

  const handleConfirmStop = async () => {
    if (!canManageTeachingTask) {
      return
    }

    await handleStatusAction("not_started")
    setIsStopDialogOpen(false)
  }

  const handleEditClick = () => {
    if (!canManageTeachingTask) {
      console.warn("[TeachingTaskEvaluation] edit blocked by whitelist")
      return
    }

    onEdit?.()
  }

  const handleCopyClick = () => {
    if (!canCreateTeachingTask) {
      console.warn("[TeachingTaskEvaluation] copy blocked by whitelist")
      return
    }

    onCopy?.(task, criteria)
  }

  const isNotStarted = task.status === "not_started"
  const isInProgress = task.status === "in_progress"
  const canOperateWhenStopped = isNotStarted && statusUpdating === null
  const disableStart = !canOperateWhenStopped
  const disableStop = !isInProgress || statusUpdating !== null
  const disableArchive = !canOperateWhenStopped || isArchiving
  const disableEdit = !canOperateWhenStopped

  // 系统指标标签映射
  const getSystemIndicatorLabel = (systemIndicator: string | undefined): string => {
    const labelMap: Record<string, string> = {
      course_development_completion: "课程开发完成度",
      course_point_optimization_count: "课点优化次数",
      teaching_indicator_count: "教学指标数量",
      resource_count: "资源数量",
      material_count: "教材数量",
    }
    return labelMap[systemIndicator || ""] || systemIndicator || ""
  }

  // 等级标签映射（转换为ABCD）
  const getLevelLabel = (level: string | number): string => {
    const levelStr = String(level)
    const levelMap: Record<string, string> = {
      "1": "A",
      "2": "B",
      "3": "C",
      "4": "D",
    }
    return levelMap[levelStr] || levelStr
  }

  // 格式化系数显示（确保显示为小数格式）
  const formatCoefficient = (coefficient: number | undefined): string => {
    if (coefficient === undefined || coefficient === null) return "-"
    const num = Number(coefficient)
    // 如果是整数，显示为 X.0 格式
    if (Number.isInteger(num)) {
      return num.toFixed(1)
    }
    // 否则显示原值
    return num.toString()
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Header with back button and edit button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h2 className="text-xl font-bold text-foreground">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {onStatusChange && canManageTeachingTask && !task.archived && (
              <>
                {/* 状态控制按钮 */}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disableStart}
                  onClick={() => handleStatusAction("in_progress")}
                  className="gap-2 bg-transparent"
                >
                  <Play className="w-4 h-4" />
                  启动
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={disableStop}
                  onClick={() => {
                    if (!canManageTeachingTask) {
                      return
                    }

                    setIsStopDialogOpen(true)
                  }}
                  className="gap-2 bg-transparent"
                >
                  <Square className="w-4 h-4" />
                  停止
                </Button>
              </>
            )}
            {onArchive && canManageTeachingTask && !task.archived && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleArchive}
                disabled={disableArchive}
                className="gap-2 bg-transparent"
              >
                {isArchiving ? (
                  <>
                    <Spinner className="w-4 h-4" />
                    归档中...
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    归档
                  </>
                )}
              </Button>
            )}
            {onEdit && canManageTeachingTask && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleEditClick}
                disabled={disableEdit}
                className="gap-2 bg-transparent"
              >
                <Edit className="w-4 h-4" />
                编辑
              </Button>
            )}
            {onCopy && canCreateTeachingTask && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyClick}
                className="gap-2 bg-transparent"
              >
                <Copy className="w-4 h-4" />
                复制
              </Button>
            )}
          </div>
        </div>

        {/* Task Info Section */}
        <div className="space-y-4 bg-card/50 backdrop-blur-sm border border-border p-6 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h3 className="text-base font-semibold text-foreground">任务信息</h3>
          </div>
          <div className="border-t border-dashed border-border" />

          <div className="space-y-4">
            {/* Row 1: 日期区间 + 任务标题 */}
            <div className="grid grid-cols-2 gap-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">开始日期</p>
                  <p className="font-medium" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                    {new Date(task.startDate).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">结束日期</p>
                  <p className="font-medium" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                    {new Date(task.endDate).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">任务标题</p>
                <p className="font-medium" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>{task.title}</p>
              </div>
            </div>

            {/* Row 2: 评分类型 + 任务说明 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">评分类型</p>
                <p className="font-medium" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                  {task.scoringType === "five_level" ? "五级制" : "百分制"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">任务说明</p>
                <p className="text-sm whitespace-pre-wrap text-foreground" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                  {task.description || "（无）"}
                </p>
              </div>
            </div>

            {/* Row 3: 发布范围 + 教师自评 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">发布范围</p>
                <div className="flex flex-wrap gap-2">
                  {task.publishNodes && task.publishNodes.length > 0 ? (
                    <>
                      {task.publishNodes.slice(0, 3).map((node, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                        >
                          {node.nodeName}
                        </span>
                      ))}
                      {task.publishNodes.length > 3 && (
                        <span
                          className="inline-flex items-center px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm cursor-pointer hover:bg-primary/10 transition-colors"
                          onClick={() => setIsPublishNodesDialogOpen(true)}
                        >
                          等{task.publishNodes.length}个
                        </span>
                      )}
                    </>
                  ) : (
                    <p className="font-medium text-muted-foreground">（未设置）</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">教师自评</p>
                <p className="font-medium" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                  {task.teacherSelfEvaluation === false ? "不需要" : "需要"}
                </p>
              </div>
            </div>

            {/* Row 4: 专业评委 + 院校评委 */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">专业评委</p>
                <div className="flex flex-wrap gap-2">
                  {task.juryType === "designated_member" ? (
                    task.juryMembers && task.juryMembers.length > 0 ? (
                      <>
                        {task.juryMembers.slice(0, 3).map((member, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                          >
                            {member.name}
                          </span>
                        ))}
                        {task.juryMembers.length > 3 && (
                          <span
                            className="inline-flex items-center px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => setIsJuryMembersDialogOpen(true)}
                          >
                            等{task.juryMembers.length}人
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-muted-foreground">（未设置）</p>
                    )
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-accent/10 border border-accent/30 rounded-md text-sm">
                      专业管理员
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">院校评委</p>
                <div className="flex flex-wrap gap-2">
                  {task.collegeJuryType === "designated_member" ? (
                    task.collegeJuryMembers && task.collegeJuryMembers.length > 0 ? (
                      <>
                        {task.collegeJuryMembers.slice(0, 3).map((member, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                          >
                            {member.name}
                          </span>
                        ))}
                        {task.collegeJuryMembers.length > 3 && (
                          <span
                            className="inline-flex items-center px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={() => setIsCollegeJuryMembersDialogOpen(true)}
                          >
                            等{task.collegeJuryMembers.length}人
                          </span>
                        )}
                      </>
                    ) : (
                      <p className="font-medium text-muted-foreground">（未设置）</p>
                    )
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 bg-accent/10 border border-accent/30 rounded-md text-sm">
                      院校管理员
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Standards Section */}
        <div className="space-y-4 bg-card/50 backdrop-blur-sm border border-border p-6 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-sm bg-primary" />
            <h3 className="text-base font-semibold text-foreground">评价标准</h3>
          </div>
          <div className="border-t border-dashed border-border" />

          {isLoading ? (
            <LoadingState title="加载中..." className="py-12" />
          ) : !criteria || criteria.items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无评价标准</p>
            </div>
          ) : (
            <div className="space-y-4">
              {criteria.items.map((item) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                    {/* 标题行：序号、指标名称、类型提示和右上角满分卡片 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* 增大序号圆形尺寸和字号 */}
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                          {item.sequence}
                        </div>
                        <span className="text-base font-semibold text-foreground">
                          {item.type === "business" ? item.indicator : getSystemIndicatorLabel(item.systemIndicator)}
                        </span>
                        {/* 类型提示 Tips */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.type === "business" ? "业务指标" : "系统指标"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {/* 本项满分卡片 - 右上角 */}
                      <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{item.fullScore}</div>
                        <div className="text-xs text-muted-foreground">本项满分</div>
                      </div>
                    </div>

                    {/* 评价等级 - 12列布局（每个等级占3列） */}
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">评价等级</p>

                      {/* 调整网格布局为12列，每个等级占3列 */}
                      <div className="grid grid-cols-12 gap-3">
                        {item.levels?.map((level) => (
                          <div key={level.level} className="col-span-3 border border-border rounded-lg bg-background/50 overflow-hidden">
                            {/* 等级卡片头部 - 根据指标类型显示不同字段 */}
                            <div className="p-3 border-b border-border flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {item.type === "business" ? (
                                  // 业务指标：显示等级和系数（12列布局，各占6列）
                                  <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-6 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        {/* 调整等级字号到1.5倍后再增加1.2倍（text-lg -> text-2xl -> text-3xl），字重设置为400 */}
                                        <span className="text-3xl font-normal text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    <div className="col-span-6 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">系数</p>
                                      {/* 调整系数字号到1.5倍后再增加1.2倍（text-sm -> text-base -> text-lg），字重设置为400 */}
                                      <p className="text-lg font-normal text-foreground">{formatCoefficient(level.coefficient)}</p>
                                    </div>
                                  </div>
                                ) : (
                                  // 系统指标：显示等级、系数、运算符、阈值（12列布局，各占3列）
                                  <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-3 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        {/* 调整等级字号到1.5倍后再增加1.2倍（text-lg -> text-2xl -> text-3xl），字重设置为400 */}
                                        <span className="text-3xl font-normal text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">系数</p>
                                      {/* 调整系数字号到1.5倍后再增加1.2倍（text-sm -> text-base -> text-lg），字重设置为400 */}
                                      <p className="text-lg font-normal text-foreground">{formatCoefficient(level.coefficient)}</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">运算符</p>
                                      {/* 调整运算符字号到1.5倍后再增加1.2倍（text-sm -> text-base -> text-lg），字重设置为400 */}
                                      <p className="text-lg font-normal text-foreground">{level.condition?.operator || "-"}</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">阈值</p>
                                      {/* 调整阈值字号到1.5倍后再增加1.2倍（text-sm -> text-base -> text-lg），字重设置为400 */}
                                      <p className="text-lg font-normal text-foreground">{level.condition?.threshold || "-"}</p>
                                    </div>
                                  </div>
                                )}
                              </div>

                            </div>

                            {/* 说明文案 - 根据内容自适应高度 */}
                            <div className="p-3 transition-all duration-300 overflow-hidden">
                              {/* 调整说明文案字号到1.5倍后再增加1.2倍（text-xs -> text-sm -> text-base），字体设置为思源雅黑粗体 */}
                              <p className="text-base text-muted-foreground" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                                {level.description || "（无说明）"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
      </div>
      {onStatusChange && canManageTeachingTask && (
        <AlertDialog open={isStopDialogOpen} onOpenChange={setIsStopDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认停止任务</AlertDialogTitle>
              <AlertDialogDescription>
                停止该任务会导致所有课程无法进行评分操作。是否继续？
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={statusUpdating !== null}>取消</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmStop}
                disabled={statusUpdating !== null}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                确认停止
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 发布范围完整列表弹窗 */}
      <Dialog
        open={isPublishNodesDialogOpen}
        onOpenChange={(open) => {
          setIsPublishNodesDialogOpen(open)
          if (!open) setPublishNodesFilter("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>发布范围</DialogTitle>
            <DialogDescription>
              共 {task.publishNodes?.length || 0} 个课程
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索课程名称..."
              value={publishNodesFilter}
              onChange={(e) => setPublishNodesFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="max-h-80">
            <div className="flex flex-wrap gap-2 p-1">
              {task.publishNodes
                ?.filter((node) =>
                  node?.nodeName?.toLowerCase().includes(publishNodesFilter.toLowerCase())
                )
                .map((node, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                  >
                    {node?.nodeName || "未命名"}
                  </span>
                ))}
              {task.publishNodes?.filter((node) =>
                node?.nodeName?.toLowerCase().includes(publishNodesFilter.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 w-full text-center">无匹配结果</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 专业评委完整列表弹窗 */}
      <Dialog
        open={isJuryMembersDialogOpen}
        onOpenChange={(open) => {
          setIsJuryMembersDialogOpen(open)
          if (!open) setJuryMembersFilter("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>专业评委</DialogTitle>
            <DialogDescription>
              共 {task.juryMembers?.length || 0} 人
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名..."
              value={juryMembersFilter}
              onChange={(e) => setJuryMembersFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="max-h-80">
            <div className="flex flex-wrap gap-2 p-1">
              {task.juryMembers
                ?.filter((member) =>
                  member.name.toLowerCase().includes(juryMembersFilter.toLowerCase())
                )
                .map((member, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                  >
                    {member.name}
                  </span>
                ))}
              {task.juryMembers?.filter((member) =>
                member.name.toLowerCase().includes(juryMembersFilter.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 w-full text-center">无匹配结果</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 院校评委完整列表弹窗 */}
      <Dialog
        open={isCollegeJuryMembersDialogOpen}
        onOpenChange={(open) => {
          setIsCollegeJuryMembersDialogOpen(open)
          if (!open) setCollegeJuryMembersFilter("")
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>院校评委</DialogTitle>
            <DialogDescription>
              共 {task.collegeJuryMembers?.length || 0} 人
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索成员姓名..."
              value={collegeJuryMembersFilter}
              onChange={(e) => setCollegeJuryMembersFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="max-h-80">
            <div className="flex flex-wrap gap-2 p-1">
              {task.collegeJuryMembers
                ?.filter((member) =>
                  member.name.toLowerCase().includes(collegeJuryMembersFilter.toLowerCase())
                )
                .map((member, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                  >
                    {member.name}
                  </span>
                ))}
              {task.collegeJuryMembers?.filter((member) =>
                member.name.toLowerCase().includes(collegeJuryMembersFilter.toLowerCase())
              ).length === 0 && (
                <p className="text-sm text-muted-foreground py-4 w-full text-center">无匹配结果</p>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  )
}
