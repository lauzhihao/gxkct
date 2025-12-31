"use client"

import { useState, useEffect } from "react"
import { Check, X as CloseIcon, Info, Plus, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Card } from "@/shared/components/ui/card"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
import type { Long } from "@/types"
import { courseTeachingTasksApi, type CourseEvaluationDetailResponse, type EvaluationItemDetail, type CourseEvaluationSubmitDTO, type EvaluationTypeSubmit } from "@/modules/courses/api/courseTeachingTasksApi"
import { formatDate } from "@/shared/utils/date-utils"
import { CourseResourcePickerDialog, type PickedResource } from "@/modules/courses/components/dialogs/course-resource-picker-dialog"

interface EvaluationDetailProps {
  taskId: Long
  courseId: Long
  courseName?: string
  onBack: () => void
  breadcrumb?: React.ReactNode
}

interface ScoreItem {
  level: "A" | "B" | "C" | "D" | ""
  comment: string
}

// 评价视图类型
type EvaluationViewType = "self" | "dept" | "school"

export function EvaluationDetail({ taskId, courseId, courseName, onBack, breadcrumb }: EvaluationDetailProps) {
  const [evaluationDetail, setEvaluationDetail] = useState<CourseEvaluationDetailResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  // 按视图类型分开存储评分数据
  const [scoresByType, setScoresByType] = useState<Record<EvaluationViewType, Record<string, ScoreItem>>>({
    self: {},
    dept: {},
    school: {}
  })
  const [totalScore, setTotalScore] = useState<number>(0)
  // 按视图类型分开存储支撑材料选择
  const [materialsByType, setMaterialsByType] = useState<Record<EvaluationViewType, Record<string, PickedResource[]>>>({
    self: {},
    dept: {},
    school: {}
  })
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  // 当前查看的评价类型
  const [activeViewType, setActiveViewType] = useState<EvaluationViewType>("self")
  // 保存中状态
  const [isSaving, setIsSaving] = useState(false)

  // 获取当前视图类型的 scores 和 materialSelections
  const scores = scoresByType[activeViewType]
  const materialSelections = materialsByType[activeViewType]

  const courseResourceNodeId = courseId ? String(courseId) : null

  // 判断当前是否可以编辑
  const canEdit = (activeViewType === "self" && evaluationDetail?.canSelfEvaluate) ||
    (activeViewType === "dept" && evaluationDetail?.canDeptEvaluate) ||
    (activeViewType === "school" && evaluationDetail?.canSchoolEvaluate)

  // 获取标准项的等级系数映射
  const getLevelCoefficients = (itemId: string): Record<string, number> => {
    if (!evaluationDetail) return {}
    const item = evaluationDetail.items?.find((i) => String(i.criterion.id) === itemId)
    if (!item) return {}

    const coefficients: Record<string, number> = {}
    item.criterion.levels?.forEach((level) => {
      coefficients[level.level] = level.coefficient
    })
    return coefficients
  }

  // 获取选中等级的说明文案
  const getLevelDescription = (itemId: string, level: string): string => {
    if (!evaluationDetail) return ""
    const item = evaluationDetail.items?.find((i) => String(i.criterion.id) === itemId)
    if (!item) return ""

    const levelObj = item.criterion.levels?.find((l) => l.level === level)
    return levelObj?.description || ""
  }

  // 根据视图类型获取评价数据
  const getEvaluationByType = (item: EvaluationItemDetail, type: EvaluationViewType) => {
    switch (type) {
      case "self":
        return item.selfEvaluation
      case "dept":
        return item.deptEvaluation
      case "school":
        return item.schoolEvaluation
      default:
        return null
    }
  }

  // 切换视图类型
  const handleViewTypeChange = (type: EvaluationViewType) => {
    setActiveViewType(type)
  }

  // 从评价数据中提取 scores 和 materials
  const extractEvaluationData = (
    items: EvaluationItemDetail[] | undefined,
    type: EvaluationViewType
  ): { scores: Record<string, ScoreItem>; materials: Record<string, PickedResource[]> } => {
    const scores: Record<string, ScoreItem> = {}
    const materials: Record<string, PickedResource[]> = {}
    items?.forEach((item) => {
      const itemId = String(item.criterion.id)
      const evaluation = getEvaluationByType(item, type)
      scores[itemId] = {
        level: evaluation?.level || "",
        comment: evaluation?.comment || ""
      }
      if (evaluation?.materials?.length) {
        materials[itemId] = evaluation.materials.map((m) => ({
          id: m.id,
          name: m.name,
          path: m.url || ""
        }))
      }
    })
    return { scores, materials }
  }

  // 加载评分详情
  useEffect(() => {
    if (typeof taskId !== "number" || typeof courseId !== "number") {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    let cancelled = false

    const loadEvaluationDetail = async () => {
      try {
        const response = await courseTeachingTasksApi.getEvaluationDetail(taskId, courseId)
        if (!cancelled && response.data) {
          setEvaluationDetail(response.data)
          const { canSelfEvaluate, canDeptEvaluate, canSchoolEvaluate } = response.data

          // 为三种视图类型分别加载数据
          const selfData = extractEvaluationData(response.data.items, "self")
          const deptData = extractEvaluationData(response.data.items, "dept")
          const schoolData = extractEvaluationData(response.data.items, "school")

          setScoresByType({
            self: selfData.scores,
            dept: deptData.scores,
            school: schoolData.scores
          })
          setMaterialsByType({
            self: selfData.materials,
            dept: deptData.materials,
            school: schoolData.materials
          })

          // 根据权限设置默认激活的视图类型
          if (canSelfEvaluate) {
            setActiveViewType("self")
          } else if (canDeptEvaluate) {
            setActiveViewType("dept")
          } else if (canSchoolEvaluate) {
            setActiveViewType("school")
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error("加载评分详情失败:", error)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadEvaluationDetail()

    return () => {
      cancelled = true
    }
  }, [taskId, courseId])

  // 计算总分
  useEffect(() => {
    if (!evaluationDetail) return

    let total = 0
    evaluationDetail.items?.forEach((item) => {
      const itemId = String(item.criterion.id)
      const scoreItem = scores[itemId]
      if (scoreItem && scoreItem.level) {
        const coefficients = getLevelCoefficients(itemId)
        const coefficient = coefficients[scoreItem.level] || 0
        const itemScore = item.criterion.fullScore * coefficient
        total += itemScore
      }
    })

    setTotalScore(Math.round(total * 100) / 100)
  }, [scores, evaluationDetail])

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

  // 格式化系数显示
  const formatCoefficient = (coefficient: number | undefined): string => {
    if (coefficient === undefined || coefficient === null) return "-"
    const num = Number(coefficient)
    if (Number.isInteger(num)) {
      return num.toFixed(1)
    }
    return num.toString()
  }

  // 处理评级变化
  const handleLevelChange = (itemId: string, level: "A" | "B" | "C" | "D") => {
    setScoresByType((prev) => ({
      ...prev,
      [activeViewType]: {
        ...prev[activeViewType],
        [itemId]: { ...prev[activeViewType][itemId], level },
      }
    }))
  }

  // 处理评语变化
  const handleCommentChange = (itemId: string, comment: string) => {
    setScoresByType((prev) => ({
      ...prev,
      [activeViewType]: {
        ...prev[activeViewType],
        [itemId]: { ...prev[activeViewType][itemId], comment: comment.slice(0, 200) },
      }
    }))
  }

  const handleOpenResourcePicker = (itemId: string) => {
    if (!courseResourceNodeId) return
    setPickerTargetId(itemId)
    setIsPickerOpen(true)
  }

  const handlePickerConfirm = (items: PickedResource[]) => {
    if (!pickerTargetId) return
    setMaterialsByType((prev) => ({
      ...prev,
      [activeViewType]: {
        ...prev[activeViewType],
        [pickerTargetId]: items,
      }
    }))
  }

  const handlePickerOpenChange = (open: boolean) => {
    setIsPickerOpen(open)
    if (!open) {
      setPickerTargetId(null)
    }
  }

  const handleClearMaterials = (itemId: string) => {
    setMaterialsByType((prev) => {
      const currentTypeData = prev[activeViewType]
      if (!currentTypeData[itemId]) return prev
      const { [itemId]: _, ...rest } = currentTypeData
      return {
        ...prev,
        [activeViewType]: rest
      }
    })
  }

  const handleRemoveSingleMaterial = (itemId: string, resourceId: string) => {
    setMaterialsByType((prev) => {
      const currentTypeData = prev[activeViewType]
      const current = currentTypeData[itemId]
      if (!current) return prev
      const nextList = current.filter((res) => res.id !== resourceId)
      if (nextList.length === 0) {
        const { [itemId]: _, ...rest } = currentTypeData
        return {
          ...prev,
          [activeViewType]: rest
        }
      }
      return {
        ...prev,
        [activeViewType]: { ...currentTypeData, [itemId]: nextList }
      }
    })
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
  const handleSave = async (): Promise<boolean> => {
    if (!evaluationDetail || isSaving) return false

    const { canSelfEvaluate, canDeptEvaluate, canSchoolEvaluate } = evaluationDetail

    if (typeof taskId !== "number" || typeof courseId !== "number") {
      console.error("任务ID或课程ID无效")
      return false
    }

    // 构建单个评价类型的 items 数据
    const buildItems = (viewType: EvaluationViewType) => {
      const typeScores = scoresByType[viewType]
      const typeMaterials = materialsByType[viewType]

      return evaluationDetail.items?.map((item) => {
        const itemId = String(item.criterion.id)
        const scoreItem = typeScores[itemId]
        const materials = typeMaterials[itemId] || []

        return {
          criterionId: item.criterion.id,
          level: (scoreItem?.level || null) as "A" | "B" | "C" | "D" | null,
          comment: scoreItem?.comment || "",
          materialIds: materials.map((m) => m.id)
        }
      }) || []
    }

    // 收集所有有权限编辑的评价类型数据
    const evaluations: EvaluationTypeSubmit[] = []

    if (canSelfEvaluate) {
      evaluations.push({
        evaluationType: "SELF",
        items: buildItems("self")
      })
    }
    if (canDeptEvaluate) {
      evaluations.push({
        evaluationType: "DEPT",
        items: buildItems("dept")
      })
    }
    if (canSchoolEvaluate) {
      evaluations.push({
        evaluationType: "SCHOOL",
        items: buildItems("school")
      })
    }

    const submitDTO: CourseEvaluationSubmitDTO = { evaluations }

    setIsSaving(true)
    try {
      const response = await courseTeachingTasksApi.submitEvaluation(taskId, courseId, submitDTO)
      if (response.data) {
        console.log("保存成功:", response.data)

        // 保存成功后重新获取最新的评价详情数据
        const detailResponse = await courseTeachingTasksApi.getEvaluationDetail(taskId, courseId)
        if (detailResponse.data) {
          setEvaluationDetail(detailResponse.data)

          const selfData = extractEvaluationData(detailResponse.data.items, "self")
          const deptData = extractEvaluationData(detailResponse.data.items, "dept")
          const schoolData = extractEvaluationData(detailResponse.data.items, "school")

          setScoresByType({
            self: selfData.scores,
            dept: deptData.scores,
            school: schoolData.scores
          })
          setMaterialsByType({
            self: selfData.materials,
            dept: deptData.materials,
            school: schoolData.materials
          })
        }

        return true
      } else if (response.error) {
        console.error("保存失败:", response.error)
        return false
      }
      return false
    } catch (error) {
      console.error("保存评分失败:", error)
      return false
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">加载评分详情...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
        {/* 面包屑导航 */}
        <div className="flex items-center justify-between">
          <div className="flex-1">{breadcrumb}</div>
          {canEdit && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button variant="outline" onClick={onBack} disabled={isSaving} className="gap-2 bg-transparent">
                <CloseIcon className="w-4 h-4" />
                取消
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isSaving ? "保存中..." : "保存"}
              </Button>
            </div>
          )}
        </div>

        {/* 任务基本信息 */}
        <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-primary" />
              <h3 className="text-base font-semibold text-foreground">任务信息</h3>
            </div>
            <div className="border-t border-dashed border-border" />

            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">开始日期</Label>
                <p className="text-sm text-foreground">{formatDate(evaluationDetail?.startDate)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">结束日期</Label>
                <p className="text-sm text-foreground">{formatDate(evaluationDetail?.endDate)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">任务名称</Label>
                <p className="text-sm text-foreground">{evaluationDetail?.title}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">任务说明</Label>
                <p className="text-sm text-foreground whitespace-pre-wrap">{evaluationDetail?.description}</p>
              </div>
            </div>

            {/* 评分卡片 */}
            <div className="border-t border-dashed border-border pt-6">
              <div className="grid grid-cols-3 gap-6">
                <button
                  type="button"
                  onClick={() => handleViewTypeChange("self")}
                  className={`rounded-lg p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    activeViewType === "self"
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/30 border border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-semibold text-muted-foreground mb-3">自评得分</div>
                  <div className={`text-4xl font-bold text-center ${activeViewType === "self" ? "text-primary" : "text-muted-foreground"}`}>
                    {activeViewType === "self" ? totalScore : (evaluationDetail?.selfTotalScore ?? "-")}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewTypeChange("dept")}
                  className={`rounded-lg p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    activeViewType === "dept"
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/30 border border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-semibold text-muted-foreground mb-3">专业评分</div>
                  <div className={`text-4xl font-bold text-center ${activeViewType === "dept" ? "text-primary" : "text-muted-foreground"}`}>
                    {activeViewType === "dept" ? totalScore : (evaluationDetail?.deptTotalScore ?? "-")}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleViewTypeChange("school")}
                  className={`rounded-lg p-6 flex flex-col items-center justify-center transition-all cursor-pointer ${
                    activeViewType === "school"
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted/30 border border-border hover:border-primary/50"
                  }`}
                >
                  <div className="text-sm font-semibold text-muted-foreground mb-3">院校评分</div>
                  <div className={`text-4xl font-bold text-center ${activeViewType === "school" ? "text-primary" : "text-muted-foreground"}`}>
                    {activeViewType === "school" ? totalScore : (evaluationDetail?.schoolTotalScore ?? "-")}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </Card>

        {/* 评价标准和评分 */}
        {evaluationDetail && evaluationDetail.items && evaluationDetail.items.length > 0 ? (
          <Card className="bg-card/50 backdrop-blur-sm border-border p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-sm bg-primary" />
                  <h3 className="text-base font-semibold text-foreground">评价标准与评分</h3>
                </div>
                {/* 评价人信息标签 */}
                {(() => {
                  const firstItem = evaluationDetail.items?.[0]
                  const evaluation = firstItem ? getEvaluationByType(firstItem, activeViewType) : null
                  const evaluatorName = evaluation?.evaluatorName
                  const evaluatedAt = evaluation?.evaluatedAt
                  if (!evaluatorName && !evaluatedAt) return null
                  const parts = [evaluatedAt ? formatDate(evaluatedAt) : null, evaluatorName].filter(Boolean)
                  if (parts.length === 0) return null
                  return (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {parts.join("\u00A0\u00A0\u00A0\u00A0")}
                    </span>
                  )
                })()}
              </div>
              <div className="border-t border-dashed border-border" />

              <div className="space-y-4">
                {evaluationDetail.items.map((item, index) => {
                  const criterion = item.criterion
                  const itemId = String(criterion.id)
                  return (
                    <div key={itemId} className="border border-border rounded-lg p-4 bg-background/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {index + 1}
                          </div>
                          <span className="text-base font-semibold text-foreground">
                            {criterion.type === "business" ? criterion.indicator : getSystemIndicatorLabel(criterion.systemIndicator)}
                          </span>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="w-5 h-5 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{criterion.type === "business" ? "业务指标" : "系统指标"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        {/* 三种评分卡片 */}
                        <TooltipProvider>
                          <div className="flex gap-2">
                            <Tooltip open={activeViewType === "self" ? false : undefined}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleViewTypeChange("self")}
                                  className={`rounded-lg px-3 py-2 flex flex-col items-center justify-center transition-all cursor-pointer min-w-[72px] ${
                                    activeViewType === "self"
                                      ? "bg-primary/10 border-2 border-primary"
                                      : "bg-muted/30 border border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <div className={`text-lg font-bold ${activeViewType === "self" ? "text-primary" : "text-muted-foreground"}`}>
                                    {activeViewType === "self" ? (calculateItemScore(itemId, criterion.fullScore) || "-") : (item.selfEvaluation?.score ?? "-")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">自评</div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px]">
                                <div className="space-y-1 text-sm">
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">得分:</span>
                                    <span className="font-medium">{item.selfEvaluation?.score ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评级:</span>
                                    <span className="font-medium">{item.selfEvaluation?.level ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评语:</span>
                                    <span className="line-clamp-3">{item.selfEvaluation?.comment || "-"}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip open={activeViewType === "dept" ? false : undefined}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleViewTypeChange("dept")}
                                  className={`rounded-lg px-3 py-2 flex flex-col items-center justify-center transition-all cursor-pointer min-w-[72px] ${
                                    activeViewType === "dept"
                                      ? "bg-primary/10 border-2 border-primary"
                                      : "bg-muted/30 border border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <div className={`text-lg font-bold ${activeViewType === "dept" ? "text-primary" : "text-muted-foreground"}`}>
                                    {activeViewType === "dept" ? (calculateItemScore(itemId, criterion.fullScore) || "-") : (item.deptEvaluation?.score ?? "-")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">专业</div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px]">
                                <div className="space-y-1 text-sm">
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">得分:</span>
                                    <span className="font-medium">{item.deptEvaluation?.score ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评级:</span>
                                    <span className="font-medium">{item.deptEvaluation?.level ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评语:</span>
                                    <span className="line-clamp-3">{item.deptEvaluation?.comment || "-"}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip open={activeViewType === "school" ? false : undefined}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => handleViewTypeChange("school")}
                                  className={`rounded-lg px-3 py-2 flex flex-col items-center justify-center transition-all cursor-pointer min-w-[72px] ${
                                    activeViewType === "school"
                                      ? "bg-primary/10 border-2 border-primary"
                                      : "bg-muted/30 border border-border hover:border-primary/50 hover:bg-muted/50"
                                  }`}
                                >
                                  <div className={`text-lg font-bold ${activeViewType === "school" ? "text-primary" : "text-muted-foreground"}`}>
                                    {activeViewType === "school" ? (calculateItemScore(itemId, criterion.fullScore) || "-") : (item.schoolEvaluation?.score ?? "-")}
                                  </div>
                                  <div className="text-xs text-muted-foreground">院校</div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[280px]">
                                <div className="space-y-1 text-sm">
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">得分:</span>
                                    <span className="font-medium">{item.schoolEvaluation?.score ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评级:</span>
                                    <span className="font-medium">{item.schoolEvaluation?.level ?? "-"}</span>
                                  </div>
                                  <div className="flex gap-2">
                                    <span className="text-muted-foreground">评语:</span>
                                    <span className="line-clamp-3">{item.schoolEvaluation?.comment || "-"}</span>
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-12 gap-4">
                          {/* 评级 */}
                          <div className="col-span-6 space-y-3">
                            <Label className="text-sm font-semibold text-foreground">
                              评级 {canEdit && <span className="text-red-500">*</span>}
                            </Label>
                            <div className="flex gap-2">
                              {criterion.levels?.map((level: any) => (
                                <Button
                                  key={level.level}
                                  onClick={() => canEdit && handleLevelChange(itemId, level.level as "A" | "B" | "C" | "D")}
                                  variant={scores[itemId]?.level === level.level ? "default" : "outline"}
                                  className="flex-1 font-semibold"
                                  disabled={!canEdit}
                                >
                                  {level.level}
                                </Button>
                              ))}
                            </div>

                            {scores[itemId]?.level && (
                              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2" style={{ fontFamily: "'Source Han Sans CN', 'Source Han Sans', sans-serif", fontWeight: 700 }}>
                                <div className="text-base font-semibold text-foreground mb-2">等级说明</div>
                                <p className="text-base text-muted-foreground line-clamp-4">
                                  {getLevelDescription(itemId, scores[itemId].level)}
                                </p>
                                <div className="text-base text-muted-foreground pt-2 border-t border-primary/10 flex items-center justify-between">
                                  {criterion.type === "system" ? (
                                    <span className="font-semibold text-primary flex-1 text-center">
                                      {getSystemIndicatorLabel(criterion.systemIndicator)} {getOperatorLabel(criterion.levels?.find((l: any) => l.level === scores[itemId].level)?.condition?.operator)} {criterion.levels?.find((l: any) => l.level === scores[itemId].level)?.condition?.threshold || "-"}
                                    </span>
                                  ) : (
                                    <div className="flex-1" />
                                  )}
                                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                    <span className="font-semibold text-primary text-base">
                                      {formatCoefficient(criterion.levels?.find((l: any) => l.level === scores[itemId].level)?.coefficient)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* 评语 */}
                          <div className="col-span-6 flex flex-col gap-3">
                            <div className="space-y-2">
                              <Label htmlFor={`comment-${itemId}`} className="text-sm font-semibold text-foreground">
                                评语 {canEdit && <span className="text-red-500">*</span>}
                              </Label>
                              <div className="relative">
                                <Textarea
                                  id={`comment-${itemId}`}
                                  value={scores[itemId]?.comment || ""}
                                  onChange={(e) => handleCommentChange(itemId, e.target.value)}
                                  placeholder={canEdit ? "请输入评语（最多200字）" : "暂无评语"}
                                  className="text-sm resize-none flex-1 pr-14"
                                  rows={5}
                                  disabled={!canEdit}
                                />
                                {canEdit && (
                                  <span className="pointer-events-none absolute bottom-2 right-3 text-xs text-muted-foreground">
                                    {scores[itemId]?.comment.length || 0}/200
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-sm font-semibold text-foreground">支撑材料</Label>
                              <div className="rounded-lg border border-dashed border-border bg-background/60 px-3 py-2 min-h-[48px] flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap flex-1">
                                  {materialSelections[itemId]?.length ? (
                                    <>
                                      <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                        <span className="max-w-[180px] truncate">{materialSelections[itemId][0].name}</span>
                                        {activeViewType === "self" && evaluationDetail?.canSelfEvaluate && (
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSingleMaterial(itemId, materialSelections[itemId][0].id)}
                                            className="text-primary/70 hover:text-primary"
                                          >
                                            <CloseIcon className="h-3 w-3" />
                                          </button>
                                        )}
                                      </span>
                                      {materialSelections[itemId].length > 1 && (
                                        <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                                          等{materialSelections[itemId].length - 1}个
                                          {activeViewType === "self" && evaluationDetail?.canSelfEvaluate && (
                                            <button
                                              type="button"
                                              onClick={() => handleClearMaterials(itemId)}
                                              className="text-primary/70 hover:text-primary"
                                            >
                                              <CloseIcon className="h-3 w-3" />
                                            </button>
                                          )}
                                        </span>
                                      )}
                                    </>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">
                                      {activeViewType === "self" && evaluationDetail?.canSelfEvaluate ? "可附加课程资源作为评分依据" : "暂无支撑材料"}
                                    </p>
                                  )}
                                </div>
                                {activeViewType === "self" && evaluationDetail?.canSelfEvaluate && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={!courseResourceNodeId}
                                    onClick={() => handleOpenResourcePicker(itemId)}
                                    className="h-8 w-8 flex-shrink-0 text-muted-foreground transition-colors hover:bg-primary hover:text-white"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>
        ) : (
          <div className="text-center py-8 text-muted-foreground">暂无评价标准</div>
        )}

        {/* 底部操作按钮 */}
        {canEdit && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Button variant="outline" onClick={onBack} disabled={isSaving} className="gap-2 bg-transparent">
              <CloseIcon className="w-4 h-4" />
              取消
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSaving ? "保存中..." : "保存"}
            </Button>
          </div>
        )}

        <CourseResourcePickerDialog
          nodeId={courseResourceNodeId}
          open={isPickerOpen}
          onOpenChange={handlePickerOpenChange}
          selectionMode="multiple"
          onConfirm={handlePickerConfirm}
          onNavigateToResources={() => window.dispatchEvent(new CustomEvent("open-course-resources-tab"))}
        />
      </div>
  )
}
