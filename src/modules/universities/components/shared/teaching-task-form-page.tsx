"use client"

import { ArrowLeft, Plus, Trash2, Check, X, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useState, useEffect } from "react"
import type { TeachingSupervisoryTask, EvaluationStandardItem, TeachingQualityStandard } from "@/types"
import { api } from "@/lib/api"

interface TeachingTaskFormPageProps {
  task: TeachingSupervisoryTask
  onBack: () => void
  onSubmit?: (task: TeachingSupervisoryTask) => void
  onAutoSave?: (task: TeachingSupervisoryTask) => void
  isLoading?: boolean
}

export function TeachingTaskFormPage({ task, onBack, onSubmit, onAutoSave, isLoading = false }: TeachingTaskFormPageProps) {
  const [formData, setFormData] = useState<TeachingSupervisoryTask>(task)
  const [standards, setStandards] = useState<EvaluationStandardItem[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")

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
            // 确保每个标准项都有 levels 字段
            const normalizedItems = response.data.items.map((item: EvaluationStandardItem) => ({
              ...item,
              levels: item.levels || [{ level: "A", description: "", coefficient: 1.0 }],
            }))
            setStandards(normalizedItems)
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
        setAutoSaveStatus("saving")

        // 为新增任务生成 ID
        const taskToSubmit = {
          ...formData,
          id: formData.id || `task-${Date.now()}`,
          createdAt: formData.createdAt || new Date().toISOString(),
        }

        // 先保存任务基本信息（使用 onAutoSave 而不是 onSubmit，避免页面跳转）
        if (onAutoSave) {
          await onAutoSave(taskToSubmit)
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

        setAutoSaveStatus("saved")
        // 3秒后清除提示信息
        setTimeout(() => setAutoSaveStatus(""), 3000)
      } catch (error) {
        console.error("自动保存失败:", error)
        setAutoSaveStatus("failed")
        setTimeout(() => setAutoSaveStatus(""), 3000)
      }
    }, 10000) // 每10秒执行一次

    return () => clearInterval(autoSaveInterval)
  }, [task.id, formData, standards, onAutoSave])

  const handleAddStandard = () => {
    const newStandard: EvaluationStandardItem = {
      id: `standard-${Date.now()}`,
      sequence: standards.length + 1,
      type: "business", // 默认为业务指标
      indicator: "",
      fullScore: 100,
      levels: [{ level: "A", description: "", coefficient: 1.0 }], // 默认包含A级
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

  // 添加等级
  const handleAddLevel = (standardId: string, level: "A" | "B" | "C" | "D") => {
    // 等级系数映射
    const levelCoefficients: Record<string, number> = {
      A: 1.0,
      B: 0.8,
      C: 0.6,
      D: 0.4,
    }

    setStandards(
      standards.map((s) => {
        if (s.id === standardId) {
          // 检查是否已存在该等级
          if (s.levels.some((l) => l.level === level)) {
            return s
          }
          // 最多4个等级
          if (s.levels.length >= 4) {
            return s
          }
          return {
            ...s,
            levels: [...s.levels, { level, description: "", coefficient: levelCoefficients[level] }],
          }
        }
        return s
      })
    )
  }

  // 删除等级
  const handleDeleteLevel = (standardId: string, level: "A" | "B" | "C" | "D") => {
    setStandards(
      standards.map((s) => {
        if (s.id === standardId) {
          // 至少保留一个等级
          if (s.levels.length === 1) {
            return s
          }
          return {
            ...s,
            levels: s.levels.filter((l) => l.level !== level),
          }
        }
        return s
      })
    )
  }

  // 更新等级字段
  const handleUpdateLevel = (standardId: string, level: "A" | "B" | "C" | "D", field: "description" | "coefficient" | "condition", value: any) => {
    setStandards(
      standards.map((s) => {
        if (s.id === standardId) {
          return {
            ...s,
            levels: s.levels.map((l) => {
              if (l.level === level) {
                if (field === "coefficient") {
                  return { ...l, coefficient: Math.max(0.1, Math.min(1, value)) }
                }
                if (field === "condition") {
                  return { ...l, condition: value }
                }
                return { ...l, [field]: value }
              }
              return l
            }),
          }
        }
        return s
      })
    )
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

  // 检查评价标准项是否为空（所有必填字段都为空）
  const isStandardEmpty = (standard: EvaluationStandardItem): boolean => {
    return !standard.indicator || !standard.indicator.trim()
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
              className="gap-2 hover:text-white"
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
            <Button
              variant="outline"
              onClick={onBack}
              className="gap-2 bg-transparent"
              disabled={isSaving || isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
            >
              <X className="w-4 h-4" />
              取消
            </Button>
            <Button
              onClick={handleSubmit}
              className="gap-2"
              disabled={isSaving || isLoading || autoSaveStatus === "saving" || autoSaveStatus === "saved"}
              variant={autoSaveStatus === "saved" ? "default" : autoSaveStatus === "failed" ? "destructive" : "default"}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  保存中
                </>
              ) : autoSaveStatus === "saving" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  自动保存中
                </>
              ) : autoSaveStatus === "saved" ? (
                <>
                  <Check className="w-4 h-4" />
                  已保存
                </>
              ) : autoSaveStatus === "failed" ? (
                <>
                  <X className="w-4 h-4" />
                  保存失败
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
                      {/* Row: Type Selection (3 columns), Indicator (5 columns), Full Score (4 columns) */}
                      <div className="grid grid-cols-12 gap-4">
                        {/* Column 1: Type Selection (3 columns) */}
                        <div className="col-span-3 space-y-2">
                          <Label className="text-sm font-semibold">
                            指标类型 <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={standard.type === "business" ? "default" : "outline"}
                              onClick={() => handleStandardChange(standard.id, "type", "business")}
                              className="text-xs flex-1"
                            >
                              业务指标
                            </Button>
                            <Button
                              size="sm"
                              variant={standard.type === "system" ? "default" : "outline"}
                              onClick={() => handleStandardChange(standard.id, "type", "system")}
                              className="text-xs flex-1"
                            >
                              系统指标
                            </Button>
                          </div>
                        </div>

                        {/* Column 2: Indicator/System Indicator (5 columns) */}
                        <div className="col-span-5 space-y-2">
                          <Label className="text-sm">
                            {standard.type === "system" ? "系统指标" : "指标项"} <span className="text-red-500">*</span>
                          </Label>
                          {standard.type === "business" ? (
                            <div className="space-y-1">
                              <Input
                                value={standard.indicator}
                                onChange={(e) =>
                                  handleStandardChange(standard.id, "indicator", e.target.value.slice(0, 200))
                                }
                                placeholder="请输入指标项（最多200字）"
                                maxLength={200}
                              />
                              <div className="flex justify-end">
                                <p className="text-xs text-muted-foreground">
                                  {standard.indicator.length}/200
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <Select value={standard.systemIndicator || ""} onValueChange={(value) => handleStandardChange(standard.id, "systemIndicator", value)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="请选择系统指标" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="course_development_completion">课程开发完成度</SelectItem>
                                  <SelectItem value="course_point_optimization_count">课点优化次数</SelectItem>
                                  <SelectItem value="teaching_indicator_count">教学指标数量</SelectItem>
                                  <SelectItem value="resource_count">资源数量</SelectItem>
                                  <SelectItem value="material_count">教材数量</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>

                        {/* Column 3: Full Score (4 columns) */}
                        <div className="col-span-4 space-y-2">
                          <Label className="text-sm">
                            本项满分 <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={standard.fullScore}
                            onChange={(e) =>
                              handleStandardChange(standard.id, "fullScore", parseInt(e.target.value) || 0)
                            }
                            placeholder="0-100"
                          />
                        </div>
                      </div>

                      {/* Row 2: Levels Configuration */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-semibold">
                            评价等级 <span className="text-red-500">*</span>
                          </Label>
                          <div className="flex gap-1">
                            {(["A", "B", "C", "D"] as const).map((level) => (
                              <Button
                                key={level}
                                size="sm"
                                variant={standard.levels.some((l) => l.level === level) ? "default" : "outline"}
                                onClick={() => {
                                  // A级默认选中，不可取消
                                  if (level === "A") {
                                    return
                                  }
                                  if (standard.levels.some((l) => l.level === level)) {
                                    handleDeleteLevel(standard.id, level)
                                  } else {
                                    handleAddLevel(standard.id, level)
                                  }
                                }}
                                disabled={level === "A" && standard.levels.some((l) => l.level === "A")}
                                className="w-8 h-8 p-0"
                              >
                                {level}
                              </Button>
                            ))}
                          </div>
                        </div>

                        {/* Levels Grid: 4 columns, each level occupies 3 columns */}
                        <div className="grid grid-cols-12 gap-3">
                          {standard.levels.map((level) => (
                            <div key={level.level} className="col-span-3 border border-border rounded-lg bg-background/50 overflow-hidden relative">
                              {/* Delete Button - Top Right Corner */}
                              {standard.levels.length > 1 && level.level !== "A" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteLevel(standard.id, level.level)}
                                  className="absolute top-1 right-1 h-6 w-6 p-0 hover:bg-destructive/10 text-red-500 z-10"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}

                              {/* Row 1: Level and Coefficient/Condition - 12 column layout */}
                              <div className="grid grid-cols-12 gap-2 p-3 border-b border-border">
                                {/* Business Indicator: Level (6 cols) + Coefficient (6 cols) */}
                                {standard.type === "business" ? (
                                  <>
                                    {/* Column 1-6: Level */}
                                    <div className="col-span-6 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        {/* 调整等级字号到1.5倍后再增加1.2倍（text-lg -> text-2xl -> text-3xl），字重设置为400 */}
                                        <span className="text-3xl font-normal text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    {/* Column 7-12: Coefficient */}
                                    <div className="col-span-6 flex flex-col items-start justify-center gap-1">
                                      <Label className="text-xs text-muted-foreground">系数</Label>
                                      <Input
                                        type="number"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={level.coefficient}
                                        onChange={(e) =>
                                          handleUpdateLevel(standard.id, level.level, "coefficient", parseFloat(e.target.value) || 0.1)
                                        }
                                        placeholder="0.1-1"
                                        className="h-8 text-xs w-20"
                                      />
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {/* System Indicator: Level (3 cols) + Coefficient (3 cols) + Operator (3 cols) + Threshold (3 cols) */}
                                    {/* Column 1-3: Level */}
                                    <div className="col-span-3 flex items-center justify-center">
                                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center">
                                        {/* 调整等级字号到1.5倍后再增加1.2倍（text-lg -> text-2xl -> text-3xl），字重设置为400 */}
                                        <span className="text-3xl font-normal text-primary">{getLevelLabel(level.level)}</span>
                                      </div>
                                    </div>
                                    {/* Column 4-6: Coefficient */}
                                    <div className="col-span-3 flex flex-col items-start justify-center gap-1">
                                      <Label className="text-xs text-muted-foreground">系数</Label>
                                      <Input
                                        type="number"
                                        min="0.1"
                                        max="1"
                                        step="0.1"
                                        value={level.coefficient}
                                        onChange={(e) =>
                                          handleUpdateLevel(standard.id, level.level, "coefficient", parseFloat(e.target.value) || 0.1)
                                        }
                                        placeholder="0.1-1"
                                        className="h-8 text-xs w-20"
                                      />
                                    </div>
                                    {/* Column 7-9: Operator */}
                                    <div className="col-span-3 flex flex-col items-start justify-center gap-1">
                                      <Label className="text-xs text-muted-foreground">运算符</Label>
                                      <Select
                                        value={level.condition?.operator || ">"}
                                        onValueChange={(value) => {
                                          const newCondition = {
                                            operator: value as any,
                                            threshold: level.condition?.threshold || 0,
                                          }
                                          handleUpdateLevel(standard.id, level.level, "condition", newCondition)
                                        }}
                                      >
                                        <SelectTrigger className="w-full h-8 text-xs">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value=">">大于</SelectItem>
                                          <SelectItem value="<">小于</SelectItem>
                                          <SelectItem value=">=">&gt;=</SelectItem>
                                          <SelectItem value="<=">&lt;=</SelectItem>
                                          <SelectItem value="=">=</SelectItem>
                                          <SelectItem value="contains">包含</SelectItem>
                                          <SelectItem value="not_contains">不包含</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    {/* Column 10-12: Threshold */}
                                    <div className="col-span-3 flex flex-col items-start justify-center gap-1">
                                      <Label className="text-xs text-muted-foreground">阈值</Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={level.condition?.threshold || 0}
                                        onChange={(e) => {
                                          const newCondition = {
                                            operator: level.condition?.operator || ">",
                                            threshold: parseFloat(e.target.value) || 0,
                                          }
                                          handleUpdateLevel(standard.id, level.level, "condition", newCondition)
                                        }}
                                        placeholder="阈值"
                                        className="h-8 text-xs w-20"
                                      />
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Row 2: Description (spans 2 columns) */}
                              <div className="p-3 space-y-1">
                                <Textarea
                                  value={level.description}
                                  onChange={(e) =>
                                    handleUpdateLevel(standard.id, level.level, "description", e.target.value.slice(0, 500))
                                  }
                                  placeholder="等级说明（最多500字）"
                                  maxLength={500}
                                  rows={3}
                                  className="resize-none text-xs"
                                />
                                <div className="flex justify-end">
                                  <p className="text-xs text-muted-foreground">
                                    {level.description.length}/500
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
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

