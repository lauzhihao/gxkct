"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Check, X, Info } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
import type { TeachingSupervisoryTask, TeachingQualityStandard } from "@/types"
import { courseTeachingTasksApi } from "@/modules/courses/api/courseTeachingTasksApi"

interface CourseSupervisionDetailProps {
  task: TeachingSupervisoryTask
  onBack: () => void
}

interface ScoreItem {
  level: "A" | "B" | "C" | "D" | ""
  comment: string
}

export function CourseSupervisionDetail({ task, onBack }: CourseSupervisionDetailProps) {
  const [standards, setStandards] = useState<TeachingQualityStandard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, ScoreItem>>({})
  const [totalScore, setTotalScore] = useState<number>(0)

  // 获取标准项的等级系数映射
  const getLevelCoefficients = (itemId: string): Record<string, number> => {
    if (!standards) return {}
    const item = standards.items?.find((i) => i.id === itemId)
    if (!item) return {}

    const coefficients: Record<string, number> = {}
    item.levels?.forEach((level) => {
      coefficients[level.level] = level.coefficient
    })
    return coefficients
  }

  // 获取选中等级的说明文案
  const getLevelDescription = (itemId: string, level: string): string => {
    if (!standards) return ""
    const item = standards.items?.find((i) => i.id === itemId)
    if (!item) return ""

    const levelObj = item.levels?.find((l) => l.level === level)
    return levelObj?.description || ""
  }

  // 加载评价标准
  useEffect(() => {
    const loadStandards = async () => {
      setIsLoading(true)
      try {
        const response = await courseTeachingTasksApi.getTaskStandards(task.id)
        if (response.data) {
          setStandards(response.data)
          // 初始化评分数据，默认选中A级
          const initialScores: Record<string, ScoreItem> = {}
          response.data.items?.forEach((item) => {
            initialScores[item.id] = { level: "A", comment: "" }
          })
          setScores(initialScores)
        }
      } catch (error) {
        console.error("加载评价标准失败:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStandards()
  }, [task.id])

  // 计算总分
  useEffect(() => {
    if (!standards) return

    let total = 0
    standards.items?.forEach((item) => {
      const scoreItem = scores[item.id]
      if (scoreItem && scoreItem.level) {
        const coefficients = getLevelCoefficients(item.id)
        const coefficient = coefficients[scoreItem.level] || 0
        const itemScore = item.fullScore * coefficient
        total += itemScore
      }
    })

    setTotalScore(Math.round(total * 100) / 100)
  }, [scores, standards])

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("zh-CN")
    } catch {
      return dateString
    }
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

  // 操作符标签映射
  const getOperatorLabel = (operator: string | undefined): string => {
    const operatorMap: Record<string, string> = {
      ">": "大于",
      "<": "小于",
      ">=": "大于等于",
      "<=": "小于等于",
      "=": "等于",
      "contains": "包含",
      "not_contains": "不包含",
    }
    return operatorMap[operator || ""] || operator || ""
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

  // 处理评级变化
  const handleLevelChange = (itemId: string, level: "A" | "B" | "C" | "D") => {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], level },
    }))
  }

  // 处理评语变化
  const handleCommentChange = (itemId: string, comment: string) => {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], comment: comment.slice(0, 200) },
    }))
  }

  // 计算单项得分
  const calculateItemScore = (itemId: string, fullScore: number) => {
    const scoreItem = scores[itemId]
    if (!scoreItem || !scoreItem.level) return 0
    const coefficients = getLevelCoefficients(itemId)
    const coefficient = coefficients[scoreItem.level] || 0
    return Math.round(fullScore * coefficient * 100) / 100
  }

  // 处理保存
  const handleSave = () => {
    console.log("保存评分:", scores)
    // TODO: 调用 API 保存评分
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="space-y-6">
        {/* Header with back button and action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
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
            <Button variant="outline" onClick={onBack} className="gap-2 bg-transparent">
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Check className="w-4 h-4" />
              保存
            </Button>
          </div>
        </div>

        {/* 任务基本信息 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">任务信息</h3>
            </div>
            <div className="border-t border-dashed border-border" />

            <div className="space-y-4">
              {/* Row 1: Date Range (Start Date and End Date) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">开始日期</Label>
                  <p className="text-sm text-foreground">{formatDate(task.startDate)}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">结束日期</Label>
                  <p className="text-sm text-foreground">{formatDate(task.endDate)}</p>
                </div>
              </div>

              {/* Row 2: Task Title (2 columns) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">任务标题</Label>
                  <p className="text-sm text-foreground">{task.title}</p>
                </div>
              </div>

              {/* Row 3: Task Description (2 columns) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs text-muted-foreground">任务说明</Label>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>
                </div>
              </div>
            </div>

            {/* 总分 - 醒目显示 */}
            <div className="border-t border-dashed border-border pt-6 flex justify-center">
              <div className="w-1/2 rounded-lg bg-primary/10 border border-primary/20 p-8 flex flex-col items-center justify-center">
                <div className="text-sm font-semibold text-muted-foreground mb-4">总分</div>
                <div className="text-5xl font-bold text-primary text-center">{totalScore}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* 评价标准和评分 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : standards && standards.items && standards.items.length > 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-primary" />
                <h3 className="text-base font-semibold text-foreground">评价标准与评分</h3>
              </div>
              <div className="border-t border-dashed border-border" />

            <div className="space-y-4">
              {standards.items.map((item, index) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <span className="text-base font-semibold text-foreground">
                        {item.type === "business" ? item.indicator : getSystemIndicatorLabel(item.systemIndicator)}
                      </span>
                      {/* Tips图标 - hover显示指标类型 */}
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
                    {/* 本项满分和本项得分卡片 - 右上角 */}
                    <div className="flex gap-3">
                      {/* 本项满分 */}
                      <div className="rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 px-4 py-3 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-primary">{item.fullScore}</div>
                        <div className="text-xs text-muted-foreground">本项满分</div>
                      </div>
                      {/* 本项得分 */}
                      <div className="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 px-4 py-3 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-green-600">{calculateItemScore(item.id, item.fullScore)}</div>
                        <div className="text-xs text-muted-foreground">本项得分</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">



                    {/* 评级与评语 - 同一行，各占6列 */}
                    <div className="grid grid-cols-12 gap-4">
                      {/* 评级 - 6列 */}
                      <div className="col-span-6 space-y-3">
                        <Label className="text-sm font-semibold text-foreground">
                          评级 <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex gap-2">
                          {item.levels?.map((level: any) => (
                            <Button
                              key={level.level}
                              onClick={() => handleLevelChange(item.id, level.level as "A" | "B" | "C" | "D")}
                              variant={scores[item.id]?.level === level.level ? "default" : "outline"}
                              className="flex-1 font-semibold"
                            >
                              {level.level}
                            </Button>
                          ))}
                        </div>

                        {/* 选中等级的说明文案 */}
                        {scores[item.id]?.level && (
                          <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                            {/* 调整标题字号到1.5倍后再增加1.2倍（text-xs -> text-sm -> text-base），字体设置为思源雅黑粗体 */}
                            <div className="text-base font-semibold text-foreground mb-2">等级说明</div>
                            {/* 调整说明文案字号到1.5倍后再增加1.2倍（text-xs -> text-sm -> text-base），字体设置为思源雅黑粗体 */}
                            <p className="text-base text-muted-foreground line-clamp-4">
                              {getLevelDescription(item.id, scores[item.id].level)}
                            </p>
                            {/* 显示系数（所有指标都需要显示）和表达式（系统指标） */}
                            {/* 调整字号到1.5倍后再增加1.2倍（text-xs -> text-sm -> text-base），字体设置为思源雅黑粗体 */}
                            <div className="text-base text-muted-foreground pt-2 border-t border-primary/10 flex items-center justify-between">
                              {/* 系统指标表达式 - 居中显示 */}
                              {item.type === "system" ? (
                                <span className="font-semibold text-primary flex-1 text-center">
                                  {getSystemIndicatorLabel(item.systemIndicator)} {getOperatorLabel(item.levels?.find((l: any) => l.level === scores[item.id].level)?.condition?.operator)} {item.levels?.find((l: any) => l.level === scores[item.id].level)?.condition?.threshold || "-"}
                                </span>
                              ) : (
                                <div className="flex-1" />
                              )}
                              {/* 系数标签 - 居右显示 */}
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                {/* 调整系数字号到1.5倍后再增加1.2倍（text-xs -> text-sm -> text-base），字体设置为思源雅黑粗体 */}
                                <span className="font-semibold text-primary text-base">
                                  {formatCoefficient(item.levels?.find((l: any) => l.level === scores[item.id].level)?.coefficient)}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 评语 - 6列 */}
                      <div className="col-span-6 flex flex-col gap-2">
                        <Label htmlFor={`comment-${item.id}`} className="text-sm font-semibold text-foreground">
                          评语 <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id={`comment-${item.id}`}
                          value={scores[item.id]?.comment || ""}
                          onChange={(e) => handleCommentChange(item.id, e.target.value)}
                          placeholder="请输入评语（最多200字）"
                          className="text-sm resize-none flex-1"
                          rows={5}
                        />
                        <div className="text-xs text-muted-foreground text-right">
                          {scores[item.id]?.comment.length || 0}/200
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            </div>
          </Card>
        ) : (
          <div className="text-center py-8 text-muted-foreground">暂无评价标准</div>
        )}
      </div>
    </div>
  )
}
