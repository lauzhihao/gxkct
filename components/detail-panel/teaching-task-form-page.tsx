"use client"

import { ArrowLeft, Plus, Trash2, Check, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useState, useEffect } from "react"
import type { TeachingSupervisoryTask, EvaluationStandardItem, TeachingQualityStandard } from "@/types"
import { api } from "@/lib/api"

interface TeachingTaskFormPageProps {
  task: TeachingSupervisoryTask
  onBack: () => void
  onSubmit?: (task: TeachingSupervisoryTask) => void
  isLoading?: boolean
}

export function TeachingTaskFormPage({ task, onBack, onSubmit, isLoading = false }: TeachingTaskFormPageProps) {
  const [formData, setFormData] = useState<TeachingSupervisoryTask>(task)
  const [standards, setStandards] = useState<EvaluationStandardItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveMessage, setAutoSaveMessage] = useState<string>("")

  // 初始化时检查是否有复制的数据
  useEffect(() => {
    const copiedData = (window as any).__copiedTaskData
    if (copiedData) {
      console.log("检测到复制的数据:", copiedData)
      setFormData(copiedData.task)
      setStandards(copiedData.standards)
      // 清除临时数据
      delete (window as any).__copiedTaskData
    }
  }, [])

  // 加载现有的评价标准数据（编辑模式）
  useEffect(() => {
    const loadStandards = async () => {
      // 编辑模式：task.id 存在
      // 新增模式：task.id 不存在
      if (task.id) {
        try {
          console.log("编辑模式 - 加载评价标准，taskId:", task.id)
          const response = await api.teachingTasks.getTaskStandards(task.id)
          console.log("加载评价标准响应:", response)

          if (response.data && response.data.items) {
            console.log("设置评价标准:", response.data.items)
            setStandards(response.data.items)
          } else {
            console.log("没有评价标准数据")
            setStandards([])
          }
        } catch (error) {
          console.error("加载评价标准失败:", error)
          setStandards([])
        }
      }
      // 新增模式下不重置 standards，保留复制的数据
    }

    loadStandards()
  }, [task.id])

  // 自动保存（编辑模式，每10秒保存一次）
  useEffect(() => {
    // 只在编辑模式下启用自动保存
    if (!task.id) {
      return
    }

    const autoSaveInterval = setInterval(async () => {
      try {
        setAutoSaveMessage("自动保存中...")

        // 为新增任务生成 ID
        const taskToSubmit = {
          ...formData,
          id: formData.id || `task-${Date.now()}`,
          createdAt: formData.createdAt || new Date().toISOString(),
        }

        // 先保存任务基本信息
        if (onSubmit) {
          await onSubmit(taskToSubmit)
        }

        // 然后保存评价标准（过滤掉空白项）
        const validStandards = getValidStandards()
        if (validStandards.length > 0) {
          const qualityStandard: TeachingQualityStandard = {
            id: `standard-${taskToSubmit.id}`,
            taskId: taskToSubmit.id,
            universityId: taskToSubmit.universityId,
            items: validStandards,
            createdAt: new Date().toISOString(),
          }
          await api.teachingTasks.saveTaskStandards(
            taskToSubmit.universityId,
            taskToSubmit.id,
            qualityStandard,
          )
        }

        setAutoSaveMessage("已自动保存")
        // 3秒后清除提示信息
        setTimeout(() => setAutoSaveMessage(""), 3000)
      } catch (error) {
        console.error("自动保存失败:", error)
        setAutoSaveMessage("自动保存失败")
      }
    }, 10000) // 每10秒执行一次

    return () => clearInterval(autoSaveInterval)
  }, [task.id, formData, standards, onSubmit])

  const handleAddStandard = () => {
    const newStandard: EvaluationStandardItem = {
      id: `standard-${Date.now()}`,
      sequence: standards.length + 1,
      indicator: "",
      fullScore: 100,
      evaluationCriteria: "",
      evaluationLevel: "",
      score: 0,
      weight: 10,
    }
    setStandards([...standards, newStandard])
  }

  const handleDeleteStandard = (id: string) => {
    const filtered = standards.filter((s) => s.id !== id)
    // 重新计算序号
    const updated = filtered.map((s, index) => ({
      ...s,
      sequence: index + 1,
    }))
    setStandards(updated)
  }

  const handleStandardChange = (id: string, field: keyof EvaluationStandardItem, value: any) => {
    setStandards(
      standards.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    )
  }

  // 检查评价标准项是否为空（所有必填字段都为空）
  const isStandardEmpty = (standard: EvaluationStandardItem): boolean => {
    return (
      !standard.indicator.trim() &&
      !standard.evaluationCriteria.trim()
    )
  }

  // 过滤掉空白的评价标准项
  const getValidStandards = (): EvaluationStandardItem[] => {
    return standards.filter((s) => !isStandardEmpty(s))
  }

  const handleSubmit = async () => {
    setIsSaving(true)
    try {
      // 为新增任务生成 ID
      const taskToSubmit = {
        ...formData,
        id: formData.id || `task-${Date.now()}`,
        createdAt: formData.createdAt || new Date().toISOString(),
      }

      // 先保存任务基本信息
      if (onSubmit) {
        await onSubmit(taskToSubmit)
        console.log("任务基本信息保存成功，taskId:", taskToSubmit.id)
      }

      // 然后保存评价标准（过滤掉空白项）
      const validStandards = getValidStandards()
      if (validStandards.length > 0) {
        const qualityStandard: TeachingQualityStandard = {
          id: `standard-${taskToSubmit.id}`,
          taskId: taskToSubmit.id,
          universityId: taskToSubmit.universityId,
          items: validStandards,
          createdAt: new Date().toISOString(),
        }
        console.log("准备保存评价标准:", qualityStandard)
        const response = await api.teachingTasks.saveTaskStandards(
          taskToSubmit.universityId,
          taskToSubmit.id,
          qualityStandard,
        )
        console.log("评价标准保存成功:", response)
      } else {
        console.log("没有有效的评价标准需要保存")
      }
    } catch (error) {
      console.error("保存数据失败:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 编辑模式：task.id 存在
  // 新增模式：task.id 不存在
  const isEditMode = !!task.id

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
              disabled={isSaving || isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h2 className="text-xl font-bold text-foreground">
              {isEditMode ? "编辑教学质量督导任务" : "新增教学质量督导任务"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveMessage && isEditMode && (
              <span className="text-sm text-muted-foreground">{autoSaveMessage}</span>
            )}
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2 bg-transparent"
              disabled={isSaving || isLoading}
            >
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  保存
                </>
              )}
            </Button>
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
              {/* Row 1: Date Range (Start Date and End Date) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">
                    开始日期 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate.split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">
                    结束日期 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate.split("T")[0]}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Row 2: Task Title (2 columns) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="title">
                    任务标题 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="例如：2025秋季学期教学档案检查"
                  />
                </div>
              </div>

              {/* Row 3: Task Description (2 columns) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">
                    任务说明 <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入任务说明（最多500字）"
                    maxLength={500}
                    rows={8}
                    className="resize-none"
                  />
                  <div className="flex justify-end">
                    <p className="text-xs text-muted-foreground">
                      {(formData.description || "").length}/500
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Evaluation Standards Section */}
        <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-primary" />
                <h3 className="text-base font-semibold text-foreground">评价标准</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddStandard}
                className="gap-2 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                新增标准
              </Button>
            </div>
            <div className="border-t border-dashed border-border" />

            {standards.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>暂无评价标准，点击"新增标准"按钮创建</p>
              </div>
            ) : (
              <div className="space-y-4">
                {standards.map((standard) => (
                  <div key={standard.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                          {standard.sequence}
                        </div>
                        <span className="text-sm font-medium text-foreground">标准项</span>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteStandard(standard.id)}
                        className="gap-1 hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Row 1: Indicator (2 columns) */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label className="text-sm">
                            指标项 <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            value={standard.indicator}
                            onChange={(e) =>
                              handleStandardChange(standard.id, "indicator", e.target.value)
                            }
                            placeholder="请输入指标项（最多200字）"
                            maxLength={200}
                            rows={2}
                            className="resize-none"
                          />
                          <div className="flex justify-end">
                            <p className="text-xs text-muted-foreground">
                              {standard.indicator.length}/200
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Evaluation Criteria (2 columns) */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-2 space-y-2">
                          <Label className="text-sm">
                            评价标准 <span className="text-red-500">*</span>
                          </Label>
                          <Textarea
                            value={standard.evaluationCriteria}
                            onChange={(e) =>
                              handleStandardChange(standard.id, "evaluationCriteria", e.target.value)
                            }
                            placeholder="请输入评价标准（最多500字）"
                            maxLength={500}
                            rows={2}
                            className="resize-none"
                          />
                          <div className="flex justify-end">
                            <p className="text-xs text-muted-foreground">
                              {standard.evaluationCriteria.length}/500
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Full Score and Weight */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm">
                            满分 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            value={standard.fullScore}
                            onChange={(e) =>
                              handleStandardChange(standard.id, "fullScore", parseInt(e.target.value) || 0)
                            }
                            placeholder="请输入满分"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">
                            权重 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={standard.weight}
                            onChange={(e) =>
                              handleStandardChange(standard.id, "weight", parseInt(e.target.value) || 10)
                            }
                            placeholder="1-100"
                          />
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

