"use client"

import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import { Calendar, User, Settings } from "lucide-react"
import type { TeachingSupervisoryTask } from "@/types"
import cn from "classnames"

interface TeachingTaskListProps {
  tasks: TeachingSupervisoryTask[]
  selectedStatus?: "not_started" | "in_progress" | "completed" | null
  onTaskClick?: (task: TeachingSupervisoryTask) => void
  onSettingsClick?: (task: TeachingSupervisoryTask) => void
}

export function TeachingTaskList({ tasks, selectedStatus, onTaskClick, onSettingsClick }: TeachingTaskListProps) {
  // 过滤任务
  const filteredTasks = selectedStatus
    ? tasks.filter((task) => task.status === selectedStatus)
    : tasks

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      not_started: "未开始",
      in_progress: "进行中",
      completed: "已结束",
    }
    return statusMap[status] || status
  }

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      not_started: "bg-gray-100 text-gray-800 border-gray-300",
      in_progress: "bg-blue-100 text-blue-800 border-blue-300",
      completed: "bg-green-100 text-green-800 border-green-300",
    }
    return colorMap[status] || "bg-gray-100 text-gray-800 border-gray-300"
  }

  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>暂无任务</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-4">
      {filteredTasks.map((task) => (
        <Card
          key={task.id}
          className="hover:shadow-md transition-shadow border-border bg-card/50 backdrop-blur-sm relative cursor-pointer hover:border-primary/50"
          onClick={() => onTaskClick?.(task)}
        >
          <div className="absolute top-2 right-2 flex items-center gap-2">
            {onSettingsClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onSettingsClick(task)
                }}
              >
                <Settings className="w-4 h-4 text-muted-foreground hover:text-primary" />
              </Button>
            )}
            <Badge
              variant="outline"
              className={cn("text-xs", getStatusColor(task.status))}
            >
              {getStatusLabel(task.status)}
            </Badge>
          </div>

          <CardContent className="p-4 pt-8 pb-4">
            <div className="space-y-3">
              <h4 className="font-semibold text-foreground text-base mb-2 line-clamp-2 text-center">
                {task.title}
              </h4>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span className="text-xs">
                    {new Date(task.startDate).toLocaleDateString("zh-CN")} ~{" "}
                    {new Date(task.endDate).toLocaleDateString("zh-CN")}
                  </span>
                </div>

                {task.creator && (
                  <div className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs">{task.creator}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
