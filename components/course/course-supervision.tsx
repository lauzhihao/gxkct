"use client"

import { useState, useEffect } from "react"
import { ClipboardCheck, Calendar, User } from "lucide-react"
import { api, type TeachingSupervisoryTask } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { CourseSupervisionDetail } from "./course-supervision-detail"

interface CourseSupervisionProps {
  courseId?: string
  collegeId?: number
}

export function CourseSupervision({ courseId, collegeId }: CourseSupervisionProps) {
  const [tasks, setTasks] = useState<TeachingSupervisoryTask[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TeachingSupervisoryTask | null>(null)

  // 加载进行中的督导任务
  useEffect(() => {
    const loadSupervisionTasks = async () => {
      if (!collegeId) return

      setIsLoading(true)
      try {
        // 将 collegeId 转换为字符串作为 universityId
        const universityId = String(collegeId)
        const response = await api.teachingTasks.getTasksByStatus(universityId, "in_progress")
        if (response.data) {
          setTasks(response.data)
        }
      } catch (error) {
        console.error("加载督导任务失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadSupervisionTasks()
  }, [collegeId])

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("zh-CN")
    } catch {
      return dateString
    }
  }

  // 如果选中了任务，显示详情页面
  if (selectedTask) {
    return <CourseSupervisionDetail task={selectedTask} onBack={() => setSelectedTask(null)} />
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-4">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4" />
          教学督导任务
        </h3>
        <div className="border-t border-dashed border-border mb-4" />

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">暂无进行中的督导任务</div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {tasks.map((task) => (
              <button
                key={task.id}
                onClick={() => setSelectedTask(task)}
                className="rounded-lg border border-border bg-card/50 backdrop-blur-sm p-4 hover:bg-card/70 hover:border-primary/50 transition-all group relative"
              >
                {/* 状态标签 - 右上角 */}
                <div className="absolute top-3 right-3">
                  <Badge variant="outline" className="text-xs">
                    未评分
                  </Badge>
                </div>

                {/* 卡片内容 - 水平居中 */}
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                    {task.title}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>

                  {/* 日期信息 - 简化显示 */}
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span>{formatDate(task.startDate)} 至 {formatDate(task.endDate)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
