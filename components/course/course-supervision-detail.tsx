"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Calendar, User, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { api, type TeachingSupervisoryTask, type TeachingQualityStandard } from "@/lib/api"

interface CourseSupervisionDetailProps {
  task: TeachingSupervisoryTask
  onBack: () => void
}

export function CourseSupervisionDetail({ task, onBack }: CourseSupervisionDetailProps) {
  const [standards, setStandards] = useState<TeachingQualityStandard | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scores, setScores] = useState<Record<string, { score: number; level: string }>>({})
  const [totalScore, setTotalScore] = useState<number>(0)
  const [totalLevel, setTotalLevel] = useState<string>("")

  // 加载评价标准
  useEffect(() => {
    const loadStandards = async () => {
      setIsLoading(true)
      try {
        const response = await api.teachingTasks.getTaskStandards(task.id)
        if (response.data) {
          setStandards(response.data)
          // 初始化评分数据
          const initialScores: Record<string, { score: number; level: string }> = {}
          response.data.items?.forEach((item) => {
            initialScores[item.id] = { score: 0, level: "" }
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

  // 计算总分和评级（暂时留空备用）
  useEffect(() => {
    // TODO: 实现总分和评级的计算规则
    // 当前暂时为空，等待业务规则确定
  }, [scores])

  // 格式化日期
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("zh-CN")
    } catch {
      return dateString
    }
  }

  // 处理评分变化
  const handleScoreChange = (itemId: string, value: number) => {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], score: value },
    }))
  }

  // 处理评级变化
  const handleLevelChange = (itemId: string, value: string) => {
    setScores((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], level: value },
    }))
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

          {/* 总分和评级 - 醒目显示 */}
          <div className="border-t border-dashed border-border pt-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <div className="text-xs text-muted-foreground mb-2">总分</div>
                <div className="text-3xl font-bold text-primary">{totalScore}</div>
                <div className="text-xs text-muted-foreground mt-1">自动计算</div>
              </div>
              <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
                <div className="text-xs text-muted-foreground mb-2">评级</div>
                <div className="text-2xl font-bold text-primary">{totalLevel || "-"}</div>
                <div className="text-xs text-muted-foreground mt-1">自动计算</div>
              </div>
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
                      <Label className="text-xs text-muted-foreground mb-1 block">指标项</Label>
                      <p className="text-sm text-foreground">{item.indicator}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">评价标准</Label>
                      <p className="text-sm text-foreground">{item.evaluationCriteria}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`score-${item.id}`} className="text-xs text-muted-foreground">
                        得分
                      </Label>
                      <Input
                        id={`score-${item.id}`}
                        type="number"
                        min="0"
                        max={item.fullScore}
                        value={scores[item.id]?.score || ""}
                        onChange={(e) => handleScoreChange(item.id, Number(e.target.value))}
                        placeholder="输入得分"
                        className="text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`level-${item.id}`} className="text-xs text-muted-foreground">
                        评级
                      </Label>
                      <Input
                        id={`level-${item.id}`}
                        type="text"
                        value={scores[item.id]?.level || ""}
                        onChange={(e) => handleLevelChange(item.id, e.target.value)}
                        placeholder="输入评级"
                        className="text-sm"
                      />
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

