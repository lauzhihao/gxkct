"use client"

import { ArrowLeft, Plus, Edit, Copy, Info, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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
  const [expandedLevels, setExpandedLevels] = useState<Record<string, boolean>>({})

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
                    <p className="text-sm whitespace-pre-wrap text-foreground">
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
                        {item.levels?.map((level) => {
                          const levelKey = `${item.id}-${level.level}`
                          const isExpanded = expandedLevels[levelKey] || false
                          return (
                          <div key={level.level} className="col-span-3 border border-border rounded-lg bg-background/50 overflow-hidden">
                            {/* 等级卡片头部 - 根据指标类型显示不同字段 */}
                            <div className="p-3 border-b border-border flex items-start justify-between gap-2">
                              <div className="flex-1">
                                {item.type === "business" ? (
                                  // 业务指标：显示等级和系数（12列布局，各占6列）
                                  <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-6 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        <span className="text-lg font-bold text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    <div className="col-span-6 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">系数</p>
                                      <p className="text-sm font-semibold text-foreground">{level.coefficient}</p>
                                    </div>
                                  </div>
                                ) : (
                                  // 系统指标：显示等级、系数、运算符、阈值（12列布局，各占3列）
                                  <div className="grid grid-cols-12 gap-2">
                                    <div className="col-span-3 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        <span className="text-lg font-bold text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">系数</p>
                                      <p className="text-sm font-semibold text-foreground">{level.coefficient}</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">运算符</p>
                                      <p className="text-sm font-semibold text-foreground">{level.condition?.operator || "-"}</p>
                                    </div>
                                    <div className="col-span-3 flex flex-col items-center justify-center gap-1">
                                      <p className="text-xs text-muted-foreground">阈值</p>
                                      <p className="text-sm font-semibold text-foreground">{level.condition?.threshold || "-"}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* 展开按钮 */}
                              {level.description && level.description.length > 100 && (
                                <button
                                  onClick={() => setExpandedLevels(prev => ({
                                    ...prev,
                                    [levelKey]: !isExpanded
                                  }))}
                                  className="flex items-center justify-center w-6 h-6 text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                                >
                                  <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                                </button>
                              )}
                            </div>

                            {/* 说明文案 */}
                            <div className={`p-3 transition-all duration-300 overflow-hidden ${isExpanded ? "max-h-96" : "max-h-20"}`}>
                              <p className={`text-xs text-muted-foreground ${isExpanded ? "" : "line-clamp-3"}`}>
                                {level.description || "（无说明）"}
                              </p>
                            </div>
                          </div>
                        )
                        })}
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

