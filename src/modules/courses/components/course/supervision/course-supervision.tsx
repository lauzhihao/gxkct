"use client"

import { useState, useEffect } from "react"
import { ClipboardCheck, Calendar } from "lucide-react"
import type { TeachingSupervisoryTask, Long } from "@/types"
import { Badge } from "@/shared/components/ui/badge"
import { LoadingState } from "@/shared/components/ui/loading-state"
import { CourseSupervisionDetail } from "./course-supervision-detail"
import { courseTeachingTasksApi, type CourseTeachingTaskResponse } from "@/modules/courses/api/courseTeachingTasksApi"
import { formatDate } from "@/shared/utils/date-utils"

interface CourseSupervisionProps {
  courseId?: string | number
  collegeId?: number
}

// 状态映射配置
const STATUS_CONFIG = {
  not_started: { label: "未开始", className: "bg-muted text-muted-foreground" },
  in_progress: { label: "进行中", className: "bg-primary/10 text-primary border-primary/30" },
  completed: { label: "已完成", className: "bg-green-500/10 text-green-600 border-green-500/30" },
} as const

// 格式化分数显示：整数不显示小数点，非整数保留1位小数
const formatScore = (score: number | null | undefined): string => {
  if (score === null || score === undefined) return "-"
  return Number.isInteger(score) ? String(score) : score.toFixed(1)
}

const normalizeCourseId = (rawId?: string | number): number | null => {
  if (rawId === undefined || rawId === null) return null
  if (typeof rawId === "number" && !Number.isNaN(rawId)) {
    return rawId
  }
  const cleaned = String(rawId).trim()
  if (!cleaned) return null
  const match = cleaned.match(/(\d+)/)
  if (!match) return null
  const parsed = Number(match[1])
  return Number.isNaN(parsed) ? null : parsed
}

const mapStatus = (status?: string): TeachingSupervisoryTask["status"] => {
  if (status === "in_progress" || status === "completed") {
    return status
  }
  return "not_started"
}

const mapTaskToTeachingTask = (
  task: CourseTeachingTaskResponse,
  fallbackCollegeId?: number,
): TeachingSupervisoryTask => {
  const normalizedStatus = mapStatus(task.overallStatus)
  const resolvedCollegeId = task.collegeId ?? fallbackCollegeId ?? 0
  return {
    id: task.taskId ?? task.id,
    evaluationRecordId: task.id,
    universityId: resolvedCollegeId as Long,
    title: task.title || task.courseName || "教学质量督导任务",
    description: task.description || "",
    startDate: task.startDate,
    endDate: task.endDate,
    status: normalizedStatus,
    creator: task.collegeName || task.deptName || "系统生成",
    courseId: task.courseId,
    courseName: task.courseName,
    majorId: task.majorId,
    majorName: task.majorName,
    deptId: task.deptId,
    deptName: task.deptName,
    collegeId: task.collegeId ?? fallbackCollegeId,
    overallStatus: normalizedStatus,
    selfEvaluationStatus: task.selfEvaluationStatus,
    deptEvaluationStatus: task.deptEvaluationStatus,
    schoolEvaluationStatus: task.schoolEvaluationStatus,
    selfTotalScore: task.selfTotalScore,
    deptTotalScore: task.deptTotalScore,
    schoolTotalScore: task.schoolTotalScore,
    finalScore: task.finalScore,
    selfSubmittedAt: task.selfSubmittedAt,
    deptSubmittedAt: task.deptSubmittedAt,
    schoolSubmittedAt: task.schoolSubmittedAt,
  }
}

export function CourseSupervision({ courseId, collegeId }: CourseSupervisionProps) {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TeachingSupervisoryTask | null>(null)

  // 任务卡片点击仅用于页面内导航到详情，不属于管理类操作，不接入 PermissionAction 白名单
  const handleOpenTaskDetail = (task: TeachingSupervisoryTask) => {
    setSelectedTask(task)
  }

  // 加载进行中的督导任务
  useEffect(() => {
    const loadSupervisionTasks = async () => {
      const parsedCourseId = normalizeCourseId(courseId)
      if (!parsedCourseId) {
        console.warn("[CourseSupervision] 无法解析课程ID，跳过督导任务加载")
        setTasks([])
        return
      }

      setIsLoading(true)
      try {
        const response = await courseTeachingTasksApi.getTasksByCourse(parsedCourseId as Long)
        if (response.data) {
          const normalizedTasks = response.data.map((task) => mapTaskToTeachingTask(task, collegeId))
          setTasks(normalizedTasks)
        } else {
          setTasks([])
        }
      } catch (error) {
        console.error("加载督导任务失败:", error)
        setTasks([])
      } finally {
        setIsLoading(false)
      }
    }

    loadSupervisionTasks()
  }, [courseId, collegeId])

  // 如果选中了任务，显示详情页面
  if (selectedTask) {
    return <CourseSupervisionDetail task={selectedTask} onBack={() => setSelectedTask(null)} />
  }

  return (
    <div className="space-y-3 pb-[15px]">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4" />
        教学质量督导任务
      </h3>
      <div className="border-t border-dashed border-border" />

      {isLoading ? (
        <LoadingState title="加载中..." description="正在获取督导任务数据" variant="card" />
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">暂无进行中的督导任务</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {tasks.map((task) => {
            const statusConfig = STATUS_CONFIG[task.overallStatus || "not_started"]
            return (
              <button
                key={task.id}
                onClick={() => handleOpenTaskDetail(task)}
                className="relative rounded-lg border border-border px-4 py-3 text-left hover:border-primary/50 hover:bg-accent/5 transition-colors group flex flex-col"
              >
                {/* 左上角日期区间 + 右上角状态 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDate(task.startDate)} 至 {formatDate(task.endDate)}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${statusConfig.className}`}>
                    {statusConfig.label}
                  </Badge>
                </div>

                {/* 任务名称 - 垂直水平居中 */}
                <div className="flex-1 flex items-center justify-center py-3">
                  <h4 className="text-sm font-semibold text-foreground text-center line-clamp-2 group-hover:text-primary transition-colors">
                    {task.title}
                  </h4>
                </div>

                {/* 评分结果 */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-lg font-bold text-foreground">
                      {formatScore(task.selfTotalScore)}
                    </span>
                    <span className="text-xs text-muted-foreground">自评得分</span>
                  </div>
                  <div className="flex flex-col items-center flex-1 border-x border-border">
                    <span className="text-lg font-bold text-foreground">
                      {formatScore(task.deptTotalScore)}
                    </span>
                    <span className="text-xs text-muted-foreground">专业评分</span>
                  </div>
                  <div className="flex flex-col items-center flex-1">
                    <span className="text-lg font-bold text-foreground">
                      {formatScore(task.schoolTotalScore)}
                    </span>
                    <span className="text-xs text-muted-foreground">院校评分</span>
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
