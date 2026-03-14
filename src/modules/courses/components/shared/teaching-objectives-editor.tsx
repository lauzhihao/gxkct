"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Check, Plus, Search, Trash2, ArrowLeft, X } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"
import type { TeachingObjectiveMajorIndicator } from "@/modules/courses/model/course-matrix"

interface TeachingObjectivesEditorProps {
  isOpen: boolean
  onClose: () => void
  courseGoals: CourseGoal[]
  node: TreeNode
  majorId?: string | number
  majorIndicators: TeachingObjectiveMajorIndicator[]
  teachingObjectiveIndicatorMap: Record<string, string[]>
  isLoadingMajorIndicators: boolean
  isLoadingTeachingObjectiveIndicators: boolean
}

export function TeachingObjectivesEditor(props: TeachingObjectivesEditorProps) {
  const {
    isOpen,
    onClose,
    courseGoals,
    node,
    majorId,
    majorIndicators,
  } = props
  // 教学目标编辑状态
  const [editingGoalObjectives, setEditingGoalObjectives] = useState<Record<string, any[]>>({})
  // 保存后的基线快照，用于判断内容是否发生变更
  const [baselineObjectives, setBaselineObjectives] = useState<Record<string, any[]>>({})
  const [goalObjectiveInputs, setGoalObjectiveInputs] = useState<Record<string, { inputValue: string; isEditing: boolean }>>({})
  const [savingObjectiveKeys, setSavingObjectiveKeys] = useState<Record<string, boolean>>({})
  const [deletingObjectiveKeys, setDeletingObjectiveKeys] = useState<Record<string, boolean>>({})
  const [isSyncingObjectives, setIsSyncingObjectives] = useState(false)
  const [teachingObjectivesFilterKeyword, setTeachingObjectivesFilterKeyword] = useState("")
  const [debouncedFilterKeyword, setDebouncedFilterKeyword] = useState("")
  const [isFilteringTeachingObjectives, setIsFilteringTeachingObjectives] = useState(false)
  const [expandedIndicators, setExpandedIndicators] = useState<string[]>([])

  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  const toEditingState = (goals: CourseGoal[]): Record<string, any[]> => {
    const nextEditingGoalObjectives: Record<string, any[]> = {}
    goals.forEach((goal: any) => {
      const objectives: any[] = []
      if (goal.children && goal.children.length > 0) {
        goal.children.forEach((child: any) => {
          objectives.push({
            id: child.id.toString(),
            description: child.description,
          })
        })
      }
      nextEditingGoalObjectives[goal.id] = objectives
    })
    return nextEditingGoalObjectives
  }

  const getObjectiveActionKey = (goalId: string, objectiveId: string) => `${goalId}:${objectiveId}`

  const isNumericObjectiveId = (objectiveId: string): boolean => /^\d+$/.test(objectiveId)

  // 初始化editingGoalObjectives及基线
  useEffect(() => {
    if (isOpen && courseGoals && courseGoals.length > 0) {
      const state = toEditingState(courseGoals)
      setEditingGoalObjectives(state)
      setBaselineObjectives(state)

      const defaultExpandedIndicators = courseGoals
        .filter((goal) => Array.isArray(goal.children) && goal.children.length > 0)
        .map((goal) => `indicator-${goal.id}`)
      setExpandedIndicators(defaultExpandedIndicators)
    }
  }, [isOpen, courseGoals])

  // 筛选关键字防抖
  useEffect(() => {
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current)
    }

    setIsFilteringTeachingObjectives(true)

    filterDebounceTimerRef.current = setTimeout(() => {
      setDebouncedFilterKeyword(teachingObjectivesFilterKeyword)
      setIsFilteringTeachingObjectives(false)
    }, 500)

    return () => {
      if (filterDebounceTimerRef.current) {
        clearTimeout(filterDebounceTimerRef.current)
      }
    }
  }, [teachingObjectivesFilterKeyword])

  // 教学目标编辑函数
  const startAddingObjectiveForGoal = (goalId: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isEditing: true },
    }))
  }

  const handleAddObjectiveForGoal = (goalId: string) => {
    const accordionValue = `indicator-${goalId}`
    setExpandedIndicators((prev) => (
      prev.includes(accordionValue) ? prev : [...prev, accordionValue]
    ))
    startAddingObjectiveForGoal(goalId)
  }

  const updateGoalObjectiveInput = (goalId: string, value: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], inputValue: value },
    }))
  }

  const removeGoalObjective = (goalId: string, objectiveId: string) => {
    setEditingGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter((obj) => obj.id !== objectiveId),
    }))
  }

  const restoreGoalObjective = async () => {
    await syncObjectivesFromServer()
  }

  const getObjectiveLabel = (index: number): string => String.fromCharCode(65 + index)

  const updateTeachingObjective = (objectiveId: string, content: string) => {
    setEditingGoalObjectives((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((goalId) => {
        updated[goalId] = updated[goalId].map((obj) =>
          obj.id === objectiveId ? { ...obj, description: content } : obj
        )
      })
      return updated
    })
  }

  const syncObjectivesFromServer = async () => {
    const courseId = node?.id
    if (!courseId || !majorId) {
      return
    }

    setIsSyncingObjectives(true)
    try {
      const response = await courseGoalsApi.getCourseMatrixHeaderGoals(String(courseId))
      if (response.data) {
        const state = toEditingState(response.data)
        setEditingGoalObjectives(state)
        setBaselineObjectives(state)
      }
    } catch (error) {
      console.error("[TeachingObjectivesEditor] 同步教学目标失败:", error)
    } finally {
      setIsSyncingObjectives(false)
    }
  }

  const handleSaveSingleObjective = async (
    goal: any,
    objective: { id: string; description: string }
  ) => {
    const courseId = node?.id
    if (!courseId || !majorId) {
      return
    }

    const trimmedDescription = String(objective.description || "").trim()
    if (!trimmedDescription) {
      return
    }

    const objectiveKey = getObjectiveActionKey(String(goal.id), String(objective.id))
    setSavingObjectiveKeys((prev) => ({
      ...prev,
      [objectiveKey]: true,
    }))

    try {
      const response = await courseGoalsApi.updateCourseGoals(String(courseId), String(majorId), [
        {
          ...goal,
          children: [
            {
              id: objective.id,
              description: trimmedDescription,
              children: null,
            },
          ],
        },
      ])

      if (!response.error) {
        await syncObjectivesFromServer()
      }
    } catch (error) {
      console.error("[TeachingObjectivesEditor] 单条保存教学目标失败:", error)
    } finally {
      setSavingObjectiveKeys((prev) => {
        const next = { ...prev }
        delete next[objectiveKey]
        return next
      })
    }
  }

  const handleSaveDraftObjective = async (goal: any) => {
    const goalId = String(goal.id)
    const draftInput = goalObjectiveInputs[goalId]
    const draftDescription = draftInput?.inputValue?.trim()
    if (!draftDescription) {
      return
    }

    const draftObjective = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: draftDescription,
    }

    setEditingGoalObjectives((prev) => ({
      ...prev,
      [goalId]: [...(prev[goalId] || []), draftObjective],
    }))
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isEditing: false },
    }))

    await handleSaveSingleObjective(goal, draftObjective)
  }

  const handleDeleteSingleObjective = async (goalId: string, objectiveId: string) => {
    const confirmed = window.confirm("确定要删除该教学目标吗？\n引用它的二级矩阵数据将立即失效，且此操作不可逆")
    if (!confirmed) {
      return
    }

    const objectiveKey = getObjectiveActionKey(String(goalId), String(objectiveId))
    setDeletingObjectiveKeys((prev) => ({
      ...prev,
      [objectiveKey]: true,
    }))

    try {
      if (isNumericObjectiveId(objectiveId)) {
        const response = await courseGoalsApi.deleteCourseGoal(objectiveId)
        if (!response.error) {
          await syncObjectivesFromServer()
        }
      } else {
        removeGoalObjective(goalId, objectiveId)
      }
    } catch (error) {
      console.error("[TeachingObjectivesEditor] 单条删除教学目标失败:", error)
    } finally {
      setDeletingObjectiveKeys((prev) => {
        const next = { ...prev }
        delete next[objectiveKey]
        return next
      })
    }
  }
  const isObjectiveDirty = (goalId: string, objective: { id: string; description: string }): boolean => {
    const baselineList = baselineObjectives[goalId]
    if (!baselineList) return true
    const baselineObj = baselineList.find((obj) => String(obj.id) === String(objective.id))
    // 基线中找不到说明是新增的未持久化条目，始终视为 dirty
    if (!baselineObj) return true
    return objective.description !== baselineObj.description
  }

  const filteredIndicatorGroups = useMemo(() => {
    const indicatorGoalMap = new Map(courseGoals.map((goal) => [String(goal.id), goal]))
    const requirementMap = new Map<string, {
      requirementId: string
      requirementDescription: string
      indicators: Array<TeachingObjectiveMajorIndicator & { goal: CourseGoal }>
    }>()

    majorIndicators.forEach((indicator) => {
      const matchedGoal = indicatorGoalMap.get(indicator.indicatorId)
      if (!matchedGoal) {
        return
      }

      const existing = requirementMap.get(indicator.requirementId)
      const indicatorWithGoal = {
        ...indicator,
        goal: matchedGoal,
      }

      if (existing) {
        existing.indicators.push(indicatorWithGoal)
        return
      }

      requirementMap.set(indicator.requirementId, {
        requirementId: indicator.requirementId,
        requirementDescription: indicator.requirementDescription,
        indicators: [indicatorWithGoal],
      })
    })

    const groups = Array.from(requirementMap.values())
    if (!debouncedFilterKeyword.trim()) {
      return groups
    }

    const keyword = debouncedFilterKeyword.toLowerCase()
    return groups
      .map((group) => ({
        ...group,
        indicators: group.indicators.filter((indicator) => {
          const objectiveList = editingGoalObjectives[String(indicator.goal.id)] || []
          return indicator.requirementDescription.toLowerCase().includes(keyword)
            || indicator.indicatorDescription.toLowerCase().includes(keyword)
            || objectiveList.some((objective: { description: string }) => objective.description?.toLowerCase().includes(keyword))
        }),
      }))
      .filter((group) => group.indicators.length > 0)
  }, [courseGoals, debouncedFilterKeyword, editingGoalObjectives, majorIndicators])

  const highlightKeyword = (text: string, keyword: string) => {
    if (!keyword.trim()) {
      return text
    }

    const parts = text.split(new RegExp(`(${keyword})`, "gi"))
    return parts.map((part, index) => {
      if (part.toLowerCase() === keyword.toLowerCase()) {
        return (
          <span key={index} className="bg-yellow-200 text-yellow-900 font-semibold">
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="w-full bg-background p-6">
      <div className="flex flex-col">
        <div className="w-full flex flex-col">
          {/* 顶部导航 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="ghost"
                onClick={onClose}
                className="gap-2 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                返回
              </Button>
              <h2 className="text-2xl font-bold text-foreground">设置教学目标</h2>
            </div>
            <div className="flex items-center gap-2 pr-6">
              <div className="flex items-center gap-2 px-3 py-2 border border-border rounded-md bg-background">
                <Search className="w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="筛选教学目标..."
                  value={teachingObjectivesFilterKeyword}
                  onChange={(e) => setTeachingObjectivesFilterKeyword(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                />
                {teachingObjectivesFilterKeyword && !isFilteringTeachingObjectives && (
                  <button
                    onClick={() => {
                      setTeachingObjectivesFilterKeyword("")
                      setDebouncedFilterKeyword("")
                      if (filterDebounceTimerRef.current) {
                        clearTimeout(filterDebounceTimerRef.current)
                      }
                    }}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                {isFilteringTeachingObjectives && (
                  <Spinner className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              {/* <Button
                size="sm"
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={isSyncingObjectives}
              >
                <Star className="w-4 h-4" />
                AI一键生成
              </Button> */}
            </div>
          </div>

          {/* 教学目标编辑内容 */}
          <div className="w-full">
            {props.isLoadingMajorIndicators ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                <Spinner className="w-4 h-4" />
                加载毕业要求指标点中
              </div>
            ) : filteredIndicatorGroups.length > 0 ? (
              <div className="space-y-6">
                {filteredIndicatorGroups.map((requirement, requirementIndex) => (
                  <section key={requirement.requirementId} className="space-y-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="h-4 w-1.5 rounded-full bg-primary" />
                        <p className="text-sm font-medium text-foreground">
                          毕业要求 {requirementIndex + 1}：{highlightKeyword(requirement.requirementDescription, debouncedFilterKeyword)}
                        </p>
                      </div>
                      <div className="mt-3 border-t border-dashed border-border" />
                    </div>

                    <div className="space-y-4">
                      {requirement.indicators.map((indicator, indicatorIndex) => {
                        const goal = indicator.goal
                        const goalObjectivesList = editingGoalObjectives[String(goal.id)] || []
                        const goalInput = goalObjectiveInputs[String(goal.id)]
                        const accordionValue = `indicator-${goal.id}`

                        return (
                          <Accordion
                            key={indicator.indicatorId}
                            type="multiple"
                            value={expandedIndicators}
                            onValueChange={setExpandedIndicators}
                            className="rounded-lg border border-border bg-secondary/10"
                          >
                            <AccordionItem value={accordionValue} className="border-none">
                              <div className="relative">
                                <AccordionTrigger className="px-4 py-4 pr-14 hover:no-underline">
                                  <div className="min-w-0 flex items-start gap-2 text-left">
                                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-2 text-xs font-medium text-primary">
                                      {indicatorIndex + 1}
                                    </span>
                                    <span className="text-base font-medium text-foreground break-words">
                                      {highlightKeyword(indicator.indicatorDescription, debouncedFilterKeyword)}
                                    </span>
                                  </div>
                                </AccordionTrigger>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleAddObjectiveForGoal(String(goal.id))
                                  }}
                                  className="absolute right-4 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                                  title="新增教学目标"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>

                              <AccordionContent className="px-4 pb-4">
                                <div className="ml-8 space-y-3">
                                  {goalInput?.isEditing && (
                                    <div className="flex gap-2 items-start">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary mt-2">
                                        {getObjectiveLabel(goalObjectivesList.length)}
                                      </div>
                                      <div className="flex w-4/5 items-start gap-2">
                                        <ExpandableTextarea
                                          value={goalInput.inputValue}
                                          onChange={(value) => updateGoalObjectiveInput(String(goal.id), value)}
                                          placeholder="输入教学目标内容"
                                          maxLength={500}
                                          rows={4}
                                          className="flex-1 px-3 py-2 text-lg"
                                          autoFocus
                                        />
                                        <Button
                                          size="sm"
                                          onClick={() => void handleSaveDraftObjective(goal)}
                                          disabled={isSyncingObjectives}
                                          className="mt-0 h-10 w-10 p-0"
                                          title="保存"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </Button>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => void syncObjectivesFromServer()}
                                            className="mt-0 h-10 w-10 p-0 text-muted-foreground hover:text-white"
                                            title="取消"
                                          >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  {goalObjectivesList.length > 0 ? (
                                    <div className="space-y-2">
                                      {goalObjectivesList.map((objective, objIdx) => {
                                        const objectiveKey = getObjectiveActionKey(String(goal.id), String(objective.id))
                                        const isSavingObjective = !!savingObjectiveKeys[objectiveKey]
                                        const isDeletingObjective = !!deletingObjectiveKeys[objectiveKey]
                                        const dirty = isObjectiveDirty(String(goal.id), objective)
                                        const showSaveAction = dirty || isSavingObjective

                                        return (
                                          <div key={objective.id} className="flex gap-2 items-start">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary mt-2">
                                              {getObjectiveLabel(objIdx)}
                                            </div>
                                            <div className="flex w-4/5 items-start gap-2">
                                              <ExpandableTextarea
                                                value={objective.description || ""}
                                                onChange={(value) => updateTeachingObjective(String(objective.id), value)}
                                                placeholder="输入教学目标内容"
                                                maxLength={500}
                                                rows={4}
                                                className="flex-1 px-3 py-2 text-lg"
                                              />
                                              {showSaveAction ? (
                                                <div className="mt-0 flex flex-shrink-0 items-start gap-2">
                                                  <Button
                                                    size="sm"
                                                    onClick={() => void handleSaveSingleObjective(goal, objective)}
                                                    disabled={isSavingObjective || isDeletingObjective || isSyncingObjectives}
                                                    className="h-10 w-10 p-0"
                                                    title="保存"
                                                  >
                                                    {isSavingObjective ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                                  </Button>
                                                  <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void restoreGoalObjective()}
                                                    disabled={isSavingObjective || isDeletingObjective || isSyncingObjectives}
                                                    className="h-10 w-10 p-0 text-muted-foreground hover:text-white"
                                                    title="取消"
                                                  >
                                                    <X className="w-4 h-4" />
                                                  </Button>
                                                </div>
                                              ) : (
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => void handleDeleteSingleObjective(String(goal.id), String(objective.id))}
                                                  disabled={isSavingObjective || isDeletingObjective || isSyncingObjectives}
                                                  className="mt-0 h-10 w-10 flex-shrink-0 p-0 text-red-500 hover:bg-red-50 hover:text-red-600"
                                                  title="删除"
                                                >
                                                  {isDeletingObjective ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </Button>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  ) : (
                                    !goalInput?.isEditing && (
                                      <div className="text-center py-3 text-muted-foreground text-base">
                                        暂无教学目标
                                      </div>
                                    )
                                  )}
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        )
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">
                  {debouncedFilterKeyword.trim() ? `暂无"${debouncedFilterKeyword}"相关的内容` : "当前课程暂无可展示的毕业要求指标点"}
                </p>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex items-center justify-center gap-2 mt-6 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={onClose}
              className="gap-2 bg-transparent"
              disabled={isSyncingObjectives}
            >
              <ArrowLeft className="w-4 h-4" />
              退出
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
