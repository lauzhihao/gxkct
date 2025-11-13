"use client"

import { ArrowLeft, Plus, Edit, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { TeachingSupervisoryTask, TeachingQualityStandard } from "@/types"
import { useEffect, useState } from "react"
import { api } from "@/lib/api"

interface TeachingTaskEvaluationProps {
  task: TeachingSupervisoryTask
  onBack: () => void
  onEdit?: () => void
  onCopy?: (task: TeachingSupervisoryTask, standards: TeachingQualityStandard | null) => void
}

export function TeachingTaskEvaluation({ task, onBack, onEdit, onCopy }: TeachingTaskEvaluationProps) {
  const [standards, setStandards] = useState<TeachingQualityStandard | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStandards = async () => {
      setIsLoading(true)
      try {
        const response = await api.teachingTasks.getTaskStandards(task.id)
        if (response.data) {
          setStandards(response.data)
          console.log("加载评价标准成功:", response.data)
        } else {
          console.log("暂无评价标准数据")
          setStandards(null)
        }
      } catch (error) {
        console.error("加载评价标准失败:", error)
        setStandards(null)
      } finally {
        setIsLoading(false)
      }
    }

    loadStandards()
  }, [task.id])
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
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h2 className="text-xl font-bold text-foreground">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="gap-2 bg-transparent"
              >
                <Edit className="w-4 h-4" />
                编辑
              </Button>
            )}
            {onCopy && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onCopy(task, standards)}
                className="gap-2 bg-transparent"
              >
                <Copy className="w-4 h-4" />
                复制
              </Button>
            )}
          </div>
        </div>

        {/* Task Info Card */}
        <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">任务信息</h3>
            </div>
            <div className="border-t border-dashed border-border" />

            <div className="space-y-4">
              {/* Row 1: Date Range */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">开始日期</p>
                  <p className="font-medium">
                    {new Date(task.startDate).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">结束日期</p>
                  <p className="font-medium">
                    {new Date(task.endDate).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>

              {/* Row 2: Task Title */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground mb-2">任务标题</p>
                  <p className="font-medium">{task.title}</p>
                </div>
              </div>

              {/* Row 3: Task Description */}
              {task.description && (
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground mb-2">任务说明</p>
                    <p className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded border border-border">
                      {task.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Evaluation Standards Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">评价标准</h3>
            </div>
            <div className="border-t border-dashed border-border" />

            {/* Note: 新增标准按钮只在编辑表单中显示 */}

            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>加载中...</p>
              </div>
            ) : !standards || standards.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>暂无评价标准</p>
              </div>
            ) : (
              <div className="space-y-4">
                {standards.items.map((item) => (
                  <div key={item.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {item.sequence}
                      </div>
                      <span className="text-sm font-medium text-foreground">标准项</span>
                    </div>

                    <div className="space-y-4">
                      {/* Row 1: Indicator */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground mb-2">指标项</p>
                          <p className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded border border-border">
                            {item.indicator}
                          </p>
                        </div>
                      </div>

                      {/* Row 2: Evaluation Criteria */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2">
                          <p className="text-sm text-muted-foreground mb-2">评价标准</p>
                          <p className="text-sm whitespace-pre-wrap bg-background/50 p-3 rounded border border-border">
                            {item.evaluationCriteria}
                          </p>
                        </div>
                      </div>

                      {/* Row 3: Full Score and Weight */}
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">满分</p>
                          <p className="font-medium">{item.fullScore}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">权重</p>
                          <p className="font-medium">{item.weight}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

