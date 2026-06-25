"use client"

import { useState, useEffect } from "react"
import { Building2, ChevronRight, GraduationCap } from "lucide-react"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/shared/components/ui/breadcrumb"
import { LoadingState } from "@/shared/components/ui/loading-state"
import type { TeachingSupervisoryTask, Long, TaskTargetType } from "@/types"
import { courseTeachingTasksApi, type TaskTargetItem } from "@/modules/courses/api/courseTeachingTasksApi"
import { EvaluationDetail } from "./EvaluationDetail"

interface TargetEvaluationListProps {
  task: TeachingSupervisoryTask
  rootName?: string
  semesterId?: number | null
  onBack: () => void
  onSaveSuccess?: () => void
}

const OVERALL_STATUS_META: Record<string, { label: string; className: string }> = {
  completed: { label: "已结束", className: "bg-green-100 text-green-700" },
  in_progress: { label: "进行中", className: "bg-blue-100 text-blue-700" },
  not_started: { label: "未开始", className: "bg-muted text-muted-foreground" },
}

// 该任务派发层级对应的图标
function targetIcon(targetType?: TaskTargetType) {
  return targetType === "major" ? GraduationCap : Building2
}

export function TargetEvaluationList({ task, rootName, semesterId, onBack, onSaveSuccess }: TargetEvaluationListProps) {
  const [targets, setTargets] = useState<TaskTargetItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTarget, setSelectedTarget] = useState<TaskTargetItem | null>(null)

  const taskId = (task.taskId ?? task.id) as Long
  const targetType = (task.targetType || "course") as TaskTargetType
  const Icon = targetIcon(targetType)

  useEffect(() => {
    if (!taskId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let cancelled = false

    const loadTargets = async () => {
      try {
        const response = await courseTeachingTasksApi.getTaskTargets(taskId)
        if (!cancelled) {
          // 仅展示与任务层级一致的执行主体
          const list = (response.data || []).filter((t) => t.targetType === targetType)
          setTargets(list)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载执行主体列表失败:", error)
          setTargets([])
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadTargets()

    return () => {
      cancelled = true
    }
  }, [taskId, targetType])

  const renderBreadcrumb = (current?: string) => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onBack()
            }}
            className="text-muted-foreground hover:text-primary cursor-pointer"
          >
            {task.title}
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator>
          <ChevronRight className="w-4 h-4" />
        </BreadcrumbSeparator>
        <BreadcrumbItem>
          {current ? (
            <BreadcrumbLink
              href="#"
              onClick={(e) => {
                e.preventDefault()
                setSelectedTarget(null)
              }}
              className="text-muted-foreground hover:text-primary cursor-pointer"
            >
              {rootName || "执行主体"}
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="text-primary">{rootName || "执行主体"}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {current && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="w-4 h-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="text-primary">{current}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  )

  // 选中执行主体后，进入 target 层级评价详情
  if (selectedTarget) {
    return (
      <EvaluationDetail
        taskId={taskId}
        targetType={targetType}
        targetId={selectedTarget.targetId}
        semesterId={semesterId}
        onBack={() => setSelectedTarget(null)}
        breadcrumb={renderBreadcrumb(selectedTarget.targetName || undefined)}
        onSaveSuccess={onSaveSuccess}
      />
    )
  }

  return (
    <div className="space-y-6">
      {renderBreadcrumb()}

      {isLoading ? (
        <LoadingState variant="card" />
      ) : targets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">该任务暂无执行主体，请确认任务已发布</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {targets.map((target, index) => {
            const statusMeta = OVERALL_STATUS_META[target.overallStatus] || OVERALL_STATUS_META.not_started
            return (
              <button
                key={`${target.targetId}-${index}`}
                type="button"
                onClick={() => setSelectedTarget(target)}
                className="rounded-lg border border-border bg-card/50 p-4 text-left hover:border-primary/50 hover:bg-accent/5 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                        {target.targetName || "-"}
                      </h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    {/* 三阶段得分 */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">自评</div>
                        <div className="text-sm font-bold text-primary">
                          {target.selfTotalScore != null ? target.selfTotalScore : "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">专业</div>
                        <div className="text-sm font-bold text-primary">
                          {target.deptTotalScore != null ? target.deptTotalScore : "-"}
                        </div>
                      </div>
                      <div className="rounded-md bg-muted/30 px-2 py-1.5 text-center">
                        <div className="text-xs text-muted-foreground mb-0.5">院校</div>
                        <div className="text-sm font-bold text-primary">
                          {target.schoolTotalScore != null ? target.schoolTotalScore : "-"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
