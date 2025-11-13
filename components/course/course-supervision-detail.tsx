"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, User, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { api, type TeachingSupervisoryTask, type TeachingQualityStandard } from "@/lib/api"

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
        const response = await api.teachingTasks.getTaskStandards(task.id)
        if (response.data) {
          setStandards(response.data)
          // 初始化评分数据
          const initialScores: Record<string, ScoreItem> = {}
          response.data.items?.forEach((item) => {
            initialScores[item.id] = { level: "", comment: "" }
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
        <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
          </div>

          <div className="border-t border-dashed border-border my-4" />

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>开始日期</span>
              </div>
              <div className="text-sm font-medium text-foreground">{formatDate(task.startDate)}</div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>结束日期</span>
              </div>
              <div className="text-sm font-medium text-foreground">{formatDate(task.endDate)}</div>
            </div>

            {task.creator && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span>创建人</span>
                </div>
                <div className="text-sm font-medium text-foreground">{task.creator}</div>
              </div>
            )}
          </div>

          {/* 总分 - 醒目显示 */}
          <div className="border-t border-dashed border-border pt-6">
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-8 flex flex-col items-center justify-center">
              <div className="text-sm font-semibold text-muted-foreground mb-4">总分</div>
              <div className="text-5xl font-bold text-primary text-center">{totalScore}</div>
            </div>
          </div>
        </div>

        {/* 评价标准和评分 */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">加载中...</div>
        ) : standards && standards.items && standards.items.length > 0 ? (
          <div className="rounded-lg border border-border bg-secondary/30 backdrop-blur-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">评价标准与评分</h3>
            </div>
            <div className="border-t border-dashed border-border mb-6" />

            <div className="space-y-6">
              {standards.items.map((item, index) => (
                <div key={item.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium text-foreground">评价标准</span>
                    <span className="text-xs text-muted-foreground ml-auto">满分: {item.fullScore}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-2 block font-medium">指标项</Label>
                      <p className="text-sm font-semibold text-foreground">{item.indicator}</p>
                    </div>
                  </div>

                  {/* 评级选择和评语 */}
                  <div className="pt-4 border-t border-border grid grid-cols-2 gap-4">
                    {/* 评级选择 */}
                    <div className="flex flex-col gap-3">
                      <Label className="text-xs font-semibold text-foreground">
                        评级 <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex gap-2">
                        {item.levels?.map((level) => (
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
                        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                          <p className="text-xs text-muted-foreground line-clamp-4">
                            {getLevelDescription(item.id, scores[item.id].level)}
                          </p>
                          <div className="text-xs text-muted-foreground">
                            该项得分: {calculateItemScore(item.id, item.fullScore)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 评语 */}
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`comment-${item.id}`} className="text-xs font-semibold text-foreground">
                        评语 <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`comment-${item.id}`}
                        value={scores[item.id]?.comment || ""}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                        placeholder="请输入评语（最多200字）"
                        className="text-sm resize-none"
                        rows={3}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {scores[item.id]?.comment.length || 0}/200
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">暂无评价标准</div>
        )}
      </div>
    </div>
  )
}

