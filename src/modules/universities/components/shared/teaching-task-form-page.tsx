"use client"

import { ArrowLeft, Plus, Trash2, Check, X, Loader2, ChevronDown } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select"
import { useState, useEffect, useRef } from "react"
import type {
  TeachingSupervisoryTask,
  EvaluationCriterion,
  PublishNode,
  TaskEvaluationCriteria,
  TaskMember,
} from "@/types"
import { api } from "@/lib/api"
import { cn } from "@/shared/utils/utils"
import { UniversalTreeSelector } from "@/shared/components/universal-tree-selector"
import { MemberSelector } from "@/shared/components/member-selector"

type TeachingTaskSubmitHandler = (
  task: TeachingSupervisoryTask,
) => Promise<TeachingSupervisoryTask | null | void> | TeachingSupervisoryTask | null | void

interface TeachingTaskFormPageProps {
  task: TeachingSupervisoryTask
  onBack: () => void
  onSubmit?: TeachingTaskSubmitHandler
  onAutoSave?: TeachingTaskSubmitHandler
  isLoading?: boolean
}

export function TeachingTaskFormPage({ task: initialTask, onBack, onSubmit, onAutoSave, isLoading = false }: TeachingTaskFormPageProps) {
  const [formData, setFormData] = useState<TeachingSupervisoryTask>({
    ...initialTask,
    scoringType: initialTask.scoringType || "percentage",
    teacherSelfEvaluation: initialTask.teacherSelfEvaluation ?? true,
    juryType: "designated_member",
    juryMembers: initialTask.juryMembers || [],
    collegeJuryType: "designated_member",
    collegeJuryMembers: initialTask.collegeJuryMembers || [],
  })
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([
    {
      id: Date.now(),
      sequence: 1,
      type: "business",
      indicator: "",
      fullScore: 100,
      levels: [{ level: "A", description: "", coefficient: 1.0 }],
    },
  ])
  const [isSaving, setIsSaving] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(typeof initialTask.id === "number")
  const [autoSaveStatus, setAutoSaveStatus] = useState<"" | "saving" | "saved" | "failed">("")
  const [isPublishSelectorOpen, setIsPublishSelectorOpen] = useState(false)
  const [isMemberSelectorOpen, setIsMemberSelectorOpen] = useState(false)
  const [isCollegeMemberSelectorOpen, setIsCollegeMemberSelectorOpen] = useState(false)

  // 表单字段 ref，用于校验失败时聚焦
  const startDateRef = useRef<HTMLInputElement>(null)
  const endDateRef = useRef<HTMLInputElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const publishNodesRef = useRef<HTMLDivElement>(null)

  // 表单错误状态
  const [formErrors, setFormErrors] = useState<{
    startDate?: boolean
    endDate?: boolean
    title?: boolean
    description?: boolean
    publishNodes?: boolean
  }>({})

  // 初始化时检查是否有复制的数据
  const sortCriteriaByIdDesc = (items: EvaluationCriterion[]): EvaluationCriterion[] => {
    return [...items].sort((a, b) => Number(b.id) - Number(a.id))
  }

  const normalizeCriteriaOrder = (items: EvaluationCriterion[]): EvaluationCriterion[] => {
    const sorted = sortCriteriaByIdDesc(items)
    return sorted.map((item, index) => ({
      ...item,
      sequence: sorted.length - index,
    }))
  }

  useEffect(() => {
    const copiedData = (window as any).__copiedTaskData
    if (copiedData) {
      console.log("检测到复制的数据:", copiedData)
      setFormData({
        ...copiedData.task,
        scoringType: copiedData.task?.scoringType || "percentage",
        teacherSelfEvaluation: copiedData.task?.teacherSelfEvaluation ?? true,
        juryType: "designated_member",
        juryMembers: copiedData.task?.juryMembers || [],
        collegeJuryType: "designated_member",
        collegeJuryMembers: copiedData.task?.collegeJuryMembers || [],
      })
      setCriteria(normalizeCriteriaOrder(copiedData.criteria || copiedData.standards || []))
      // 清除临时数据
      delete (window as any).__copiedTaskData
    }
  }, [])

  const normalizeCriteriaItems = (items: EvaluationCriterion[]): EvaluationCriterion[] => {
    return items.map((item) => ({
      ...item,
      id: Number(item.id) as EvaluationCriterion["id"],
      levels: item.levels?.length ? item.levels : [{ level: "A", description: "", coefficient: 1.0 }],
    }))
  }

  // 编辑模式下根据任务ID查询最新数据
  useEffect(() => {
    if (typeof initialTask.id !== "number") {
      setIsDataLoading(false)
      return
    }

    let cancelled = false
    setIsDataLoading(true)

    const fetchTaskData = async () => {
      try {
        const response = await api.teachingTasks.getTask(initialTask.universityId, initialTask.id, {
          includeCriteria: true,
        })
        if (!cancelled && response.data) {
          // 更新表单数据
          const taskData = response.data
          setFormData({
            ...taskData,
            scoringType: taskData.scoringType || "percentage",
            teacherSelfEvaluation: taskData.teacherSelfEvaluation ?? true,
            juryType: "designated_member",
            juryMembers: taskData.juryMembers || [],
            collegeJuryType: "designated_member",
            collegeJuryMembers: taskData.collegeJuryMembers || [],
          })
          // 更新评价标准
          const fetchedItems = taskData.evaluationCriteria?.items || []
          setCriteria(
            fetchedItems.length ? normalizeCriteriaOrder(normalizeCriteriaItems(fetchedItems)) : [],
          )
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载任务数据失败:", error)
          // 加载失败时使用传入的数据
          const itemsFromProps = initialTask.evaluationCriteria?.items
          if (itemsFromProps && itemsFromProps.length > 0) {
            setCriteria(normalizeCriteriaOrder(normalizeCriteriaItems(itemsFromProps)))
          }
        }
      } finally {
        if (!cancelled) {
          setIsDataLoading(false)
        }
      }
    }

    fetchTaskData()

    return () => {
      cancelled = true
    }
  }, [initialTask.id, initialTask.universityId])

  // 自动保存（编辑模式，每30秒保存一次）
  useEffect(() => {
    // 只在编辑模式下启用自动保存
    if (typeof initialTask.id !== "number") {
      return
    }

    // 当任意弹窗打开时，停止自动保存
    if (isPublishSelectorOpen || isMemberSelectorOpen || isCollegeMemberSelectorOpen) {
      return
    }

    // 数据加载中时不自动保存
    if (isDataLoading) {
      return
    }

    const autoSaveInterval = setInterval(async () => {
      try {
        setAutoSaveStatus("saving")

        const evaluationPayload = buildEvaluationCriteriaPayload(initialTask.id)
        const taskToSubmit: TeachingSupervisoryTask = {
          ...formData,
          id: initialTask.id,
          universityId: formData.universityId || initialTask.universityId,
          scoringType: formData.scoringType || "percentage",
          // 只传递成员id和姓名
          juryMembers: formData.juryMembers?.map((m) => ({ id: m.id, name: m.name })) as any,
          collegeJuryMembers: formData.collegeJuryMembers?.map((m) => ({ id: m.id, name: m.name })) as any,
          ...(evaluationPayload ? { evaluationCriteria: evaluationPayload } : {}),
        }

        // 先保存任务基本信息（使用 onAutoSave 而不是 onSubmit，避免页面跳转）
        if (onAutoSave) {
          await onAutoSave(taskToSubmit)
        }

        setAutoSaveStatus("saved")
        // 3秒后清除提示信息
        setTimeout(() => setAutoSaveStatus(""), 3000)
      } catch (error) {
        console.error("自动保存失败:", error)
        setAutoSaveStatus("failed")
        setTimeout(() => setAutoSaveStatus(""), 3000)
      }
    }, 30000) // 每30秒执行一次

    return () => clearInterval(autoSaveInterval)
  }, [initialTask.id, initialTask.universityId, formData, criteria, onAutoSave, isPublishSelectorOpen, isMemberSelectorOpen, isCollegeMemberSelectorOpen, isDataLoading])

  const handleAddCriterion = () => {
    const newCriterion: EvaluationCriterion = {
      id: Date.now(),
      sequence: criteria.length + 1,
      type: "business", // 默认为业务指标
      indicator: "",
      fullScore: 100,
      levels: [{ level: "A", description: "", coefficient: 1.0 }], // 默认包含A级
    }
    setCriteria((prev) => normalizeCriteriaOrder([...prev, newCriterion]))
  }

  const handleDeleteCriterion = (id: EvaluationCriterion["id"]) => {
    if (criteria.length === 1) {
      return
    }
    const filtered = criteria.filter((s) => s.id !== id)
    setCriteria(normalizeCriteriaOrder(filtered))
  }

  const handleCriterionChange = (id: EvaluationCriterion["id"], field: keyof EvaluationCriterion, value: any) => {
    setCriteria(
      criteria.map((s) =>
        s.id === id ? { ...s, [field]: value } : s
      )
    )
  }

  // 添加等级
  const handleAddLevel = (standardId: EvaluationCriterion["id"], level: "A" | "B" | "C" | "D") => {
    // 等级系数映射
    const levelCoefficients: Record<string, number> = {
      A: 1.0,
      B: 0.8,
      C: 0.6,
      D: 0.4,
    }

    setCriteria(
      criteria.map((s) => {
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
  const handleDeleteLevel = (standardId: EvaluationCriterion["id"], level: "A" | "B" | "C" | "D") => {
    setCriteria(
      criteria.map((s) => {
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
  const handleUpdateLevel = (
    standardId: EvaluationCriterion["id"],
    level: "A" | "B" | "C" | "D",
    field: "description" | "coefficient" | "condition",
    value: any,
  ) => {
    setCriteria(
      criteria.map((s) => {
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
  const isCriterionEmpty = (criterion: EvaluationCriterion): boolean => {
    return !criterion.indicator || !criterion.indicator.trim()
  }

  // 过滤掉空白的评价标准项
  const getValidCriteria = (): EvaluationCriterion[] => {
    return criteria.filter((s) => !isCriterionEmpty(s))
  }

  const buildEvaluationCriteriaPayload = (targetTaskId?: number): TaskEvaluationCriteria | undefined => {
    const validCriteria = getValidCriteria()
    if (validCriteria.length === 0) {
      return undefined
    }
    const resolvedUniversityId = formData.universityId || initialTask.universityId
    if (!resolvedUniversityId) {
      return undefined
    }
    return {
      taskId: typeof targetTaskId === "number" ? targetTaskId : undefined,
      universityId: resolvedUniversityId,
      items: validCriteria,
    }
  }

  const handleSubmit = async () => {
    // 验证必填字段，收集所有错误
    const errors: typeof formErrors = {}

    if (!formData.startDate) {
      errors.startDate = true
    }

    if (!formData.endDate) {
      errors.endDate = true
    }

    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errors.startDate = true
      errors.endDate = true
    }

    if (!formData.title || !formData.title.trim()) {
      errors.title = true
    }

    if (!formData.description || !formData.description.trim()) {
      errors.description = true
    }

    if (!formData.publishNodes || formData.publishNodes.length === 0) {
      errors.publishNodes = true
    }

    // 如果有错误，设置错误状态并聚焦到第一个错误字段
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      // 按顺序聚焦到第一个错误字段
      if (errors.startDate) {
        startDateRef.current?.focus()
      } else if (errors.endDate) {
        endDateRef.current?.focus()
      } else if (errors.title) {
        titleRef.current?.focus()
      } else if (errors.description) {
        descriptionRef.current?.focus()
      } else if (errors.publishNodes) {
        publishNodesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
        setIsPublishSelectorOpen(true)
      }
      return
    }

    setIsSaving(true)
    try {
      const evaluationPayload = buildEvaluationCriteriaPayload(formData.id)
      const taskToSubmit: TeachingSupervisoryTask = {
        ...formData,
        universityId: formData.universityId || initialTask.universityId,
        scoringType: formData.scoringType || "percentage",
        // 只传递成员id和姓名
        juryMembers: formData.juryMembers?.map((m) => ({ id: m.id, name: m.name })) as any,
        collegeJuryMembers: formData.collegeJuryMembers?.map((m) => ({ id: m.id, name: m.name })) as any,
        ...(evaluationPayload ? { evaluationCriteria: evaluationPayload } : {}),
      }

      if (onSubmit) {
        await onSubmit(taskToSubmit)
      }
    } catch (error) {
      console.error("保存数据失败:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // 编辑模式：initialTask.id 存在
  // 新增模式：initialTask.id 不存在
  const isEditMode = !!initialTask.id

  // 数据加载中显示加载状态
  if (isDataLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gap-2 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h2 className="text-xl font-bold text-foreground">编辑任务</h2>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-muted-foreground">加载中...</span>
        </div>
      </div>
    )
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
              className="gap-2 hover:text-white"
              disabled={isSaving || isLoading}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </Button>
            <h2 className="text-xl font-bold text-foreground">
              {isEditMode ? "编辑任务" : "新增任务"}
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

        <div className="border-t border-dashed border-border" />

        {/* Task Info Section */}
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">任务信息</h3>
            </div>

            <div className="space-y-4">
              {/* Row 1: 日期区间 + 标题 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">
                      开始日期 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      ref={startDateRef}
                      id="startDate"
                      type="date"
                      value={formData.startDate?.split("T")[0] || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, startDate: e.target.value })
                        if (formErrors.startDate) setFormErrors((prev) => ({ ...prev, startDate: false }))
                      }}
                      className={cn(formErrors.startDate && "border-red-500 focus:ring-red-500")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">
                      结束日期 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      ref={endDateRef}
                      id="endDate"
                      type="date"
                      value={formData.endDate?.split("T")[0] || ""}
                      onChange={(e) => {
                        setFormData({ ...formData, endDate: e.target.value })
                        if (formErrors.endDate) setFormErrors((prev) => ({ ...prev, endDate: false }))
                      }}
                      className={cn(formErrors.endDate && "border-red-500 focus:ring-red-500")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">
                    任务标题 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      ref={titleRef}
                      id="title"
                      value={formData.title}
                      maxLength={50}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value.slice(0, 50) })
                        if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: false }))
                      }}
                      placeholder="例如：2025秋季学期教学档案检查"
                      className={cn("pr-16", formErrors.title && "border-red-500 focus:ring-red-500")}
                    />
                    <span className="absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      {(formData.title || "").length}/50
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2: 评分类型 + 任务说明 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>评分类型</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={formData.scoringType === "percentage" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, scoringType: "percentage" })}
                      className="flex-1 h-10"
                    >
                      百分制
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={formData.scoringType === "five_level" ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, scoringType: "five_level" })}
                      className="flex-1 h-10"
                    >
                      五级制
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">
                    任务说明 <span className="text-red-500">*</span>
                  </Label>
                  <ExpandableTextarea
                    ref={descriptionRef}
                    value={formData.description || ""}
                    onChange={(value) => {
                      setFormData({ ...formData, description: value })
                      if (formErrors.description) setFormErrors((prev) => ({ ...prev, description: false }))
                    }}
                    placeholder="请输入任务说明（最多500字）"
                    maxLength={500}
                    rows={6}
                    className={cn(formErrors.description && "border-red-500 focus:ring-red-500")}
                  />
                </div>
              </div>

              {/* Row 3: 发布范围 + 教师自评 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="publishNodes">
                    发布范围 <span className="text-red-500">*</span>
                  </Label>
                  <div
                    ref={publishNodesRef}
                    id="publishNodes"
                    className={cn(
                      "h-10 rounded-md bg-background px-3 flex items-center justify-between gap-2 border cursor-pointer",
                      formErrors.publishNodes ? "border-red-500" : "border-gray-300"
                    )}
                    onClick={() => setIsPublishSelectorOpen(true)}
                  >
                    <div className="flex items-center flex-wrap gap-2 flex-1 overflow-hidden">
                      {(formData.publishNodes || []).length > 0 ? (
                        <>
                          <div
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                          >
                            <span>
                              {formData.publishNodes?.[0]?.nodeName || "已选节点"}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                const currentNodes = formData.publishNodes || []
                                const updatedNodes = currentNodes.slice(1)
                                setFormData({
                                  ...formData,
                                  publishNodes: updatedNodes,
                                })
                              }}
                              className="ml-1 text-muted-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </div>
                          {(formData.publishNodes || []).length > 1 && (
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm"
                            >
                              <span className="whitespace-nowrap">等{(formData.publishNodes || []).length}个</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData({
                                    ...formData,
                                    publishNodes: [],
                                  })
                                }}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">点击右侧加号选择发布范围</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 flex-shrink-0 text-primary hover:text-white hover:bg-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsPublishSelectorOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>教师自评</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={formData.teacherSelfEvaluation === true ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, teacherSelfEvaluation: true })}
                      className="flex-1 h-10"
                    >
                      需要
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={formData.teacherSelfEvaluation === false ? "default" : "outline"}
                      onClick={() => setFormData({ ...formData, teacherSelfEvaluation: false })}
                      className="flex-1 h-10"
                    >
                      不需要
                    </Button>
                  </div>
                </div>
              </div>

              {/* Row 4: 专业评委 + 院校评委 */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>专业评委</Label>
                  <div
                    className="min-h-10 rounded-md bg-background px-3 py-2 flex items-center gap-2 border border-gray-300 cursor-pointer"
                    onClick={() => setIsMemberSelectorOpen(true)}
                  >
                    <div className="flex items-center flex-wrap gap-2 flex-1">
                      {(formData.juryMembers || []).length > 0 ? (
                        <>
                          {/* 显示前3个成员标签 */}
                          {(formData.juryMembers || []).slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                            >
                              <span>{member.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData({
                                    ...formData,
                                    juryMembers: (formData.juryMembers || []).filter((m) => m.id !== member.id),
                                  })
                                }}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {/* 第4个及以后显示"等X人" */}
                          {(formData.juryMembers || []).length > 3 && (
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm"
                            >
                              <span className="whitespace-nowrap">等{(formData.juryMembers || []).length}人</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData({
                                    ...formData,
                                    juryMembers: [],
                                  })
                                }}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">点击右侧加号选择成员</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 flex-shrink-0 text-primary hover:text-white hover:bg-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMemberSelectorOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>院校评委</Label>
                  <div
                    className="min-h-10 rounded-md bg-background px-3 py-2 flex items-center gap-2 border border-gray-300 cursor-pointer"
                    onClick={() => setIsCollegeMemberSelectorOpen(true)}
                  >
                    <div className="flex items-center flex-wrap gap-2 flex-1">
                      {(formData.collegeJuryMembers || []).length > 0 ? (
                        <>
                          {/* 显示前3个成员标签 */}
                          {(formData.collegeJuryMembers || []).slice(0, 3).map((member) => (
                            <div
                              key={member.id}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/30 rounded-md text-sm"
                            >
                              <span>{member.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData({
                                    ...formData,
                                    collegeJuryMembers: (formData.collegeJuryMembers || []).filter((m) => m.id !== member.id),
                                  })
                                }}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {/* 第4个及以后显示"等X人" */}
                          {(formData.collegeJuryMembers || []).length > 3 && (
                            <div
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/5 border border-primary/30 rounded-md text-sm"
                            >
                              <span className="whitespace-nowrap">等{(formData.collegeJuryMembers || []).length}人</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setFormData({
                                    ...formData,
                                    collegeJuryMembers: [],
                                  })
                                }}
                                className="ml-1 text-muted-foreground hover:text-foreground"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">点击右侧加号选择成员</span>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 flex-shrink-0 text-primary hover:text-white hover:bg-primary"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsCollegeMemberSelectorOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <UniversalTreeSelector
          open={isPublishSelectorOpen}
          onOpenChange={setIsPublishSelectorOpen}

          onConfirm={(nodes) => {
            const selectedNodes = Array.isArray(nodes) ? nodes : nodes ? [nodes] : []
            // 只返回nodeType为course的节点
            const publishNodes: PublishNode[] = selectedNodes
              .filter((node) => node.nodeType === "course")
              .map((node) => ({
                nodeId: node.nodeId,  // 保留原始格式，如 'course_2334'
                nodeName: node.nodeName,
              }))
            setFormData({
              ...formData,
              publishNodes,
            })
            // 清除发布范围的错误状态
            if (formErrors.publishNodes && publishNodes.length > 0) {
              setFormErrors((prev) => ({ ...prev, publishNodes: false }))
            }
          }}
          mode="multiple"
          title="选择发布范围"
          description="请选择需要接收任务的组织节点"
          initialSelectedIds={(formData.publishNodes || []).map((node) => String(node.nodeId))}
          rootType="university"
          rootId={String(formData.universityId || initialTask.universityId)}
        />

        <MemberSelector
          open={isMemberSelectorOpen}
          onOpenChange={setIsMemberSelectorOpen}
          mode="multiple"
          nodeType="university"
          departmentId={String(formData.universityId || initialTask.universityId)}
          title="选择专业评委成员"
          description="请选择指定的专业评委成员"
          initialSelectedMembers={formData.juryMembers || []}
          onConfirm={(selected) => {
            const members = Array.isArray(selected) ? selected : [selected]
            setFormData({
              ...formData,
              juryMembers: members,
            })
          }}
        />

        <MemberSelector
          open={isCollegeMemberSelectorOpen}
          onOpenChange={setIsCollegeMemberSelectorOpen}
          mode="multiple"
          nodeType="university"
          departmentId={String(formData.universityId || initialTask.universityId)}
          title="选择院校评委成员"
          description="请选择指定的院校评委成员"
          initialSelectedMembers={formData.collegeJuryMembers || []}
          onConfirm={(selected) => {
            const members = Array.isArray(selected) ? selected : [selected]
            setFormData({
              ...formData,
              collegeJuryMembers: members,
            })
          }}
        />

        {/* Evaluation Standards Section */}
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm bg-primary" />
                <h3 className="text-base font-semibold text-foreground">评价标准</h3>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddCriterion}
                className="gap-2 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                新增标准
              </Button>
            </div>

            <div className="space-y-4">
              {/* 当存在标准项时渲染列表，否则给出空状态提示 */}
              {criteria.length ? (
                criteria.map((standard) => (
                  <div key={standard.id} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                        {standard.sequence}
                      </div>
                      <span className="text-sm font-medium text-foreground">标准项</span>
                    </div>
                    {criteria.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteCriterion(standard.id)}
                        className="gap-1 hover:bg-destructive/10 text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </Button>
                    )}
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
                              onClick={() => handleCriterionChange(standard.id, "type", "business")}
                              className="text-xs flex-1"
                            >
                              业务指标
                            </Button>
                            <Button
                              size="sm"
                              variant={standard.type === "system" ? "default" : "outline"}
                              onClick={() => handleCriterionChange(standard.id, "type", "system")}
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
                                  handleCriterionChange(standard.id, "indicator", e.target.value.slice(0, 200))
                                }
                                placeholder="请输入指标项（最多200字）"
                                maxLength={200}
                              />
                              <div className="flex justify-end">
                                <p className="text-xs text-muted-foreground">
                                  {(standard.indicator || "").length}/200
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full">
                              <Select value={standard.systemIndicator || ""} onValueChange={(value) => handleCriterionChange(standard.id, "systemIndicator", value)}>
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
                              handleCriterionChange(standard.id, "fullScore", parseInt(e.target.value) || 0)
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
                ))
              ) : (
                <div className="border border-dashed border-border rounded-lg p-8 text-center text-sm text-muted-foreground bg-background/30">
                  暂无标准项，请点击上方“新增标准”按钮添加
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 底部保存取消按钮 */}
        <div className="flex justify-center gap-2 pt-4">
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
    </div>
  )
}
