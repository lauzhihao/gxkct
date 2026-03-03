"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion"
import { Check, Plus, Search, Trash2, Star, ArrowLeft, XCircle } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { FileUpload } from "@/shared/components/ui/file-upload"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"

interface TeachingObjectivesEditorProps {
  isOpen: boolean
  onClose: () => void
  courseGoals: CourseGoal[]
  node: TreeNode
  majorId?: string | number
  majorIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }>
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
  const [expandedGoals, setExpandedGoals] = useState<string[]>([])

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

  // 初始化expandedGoals
  useEffect(() => {
    if (isOpen && courseGoals && courseGoals.length > 0 && expandedGoals.length === 0) {
      const defaultExpanded = courseGoals
        .filter((goal) => goal.children && goal.children.length > 0)
        .map((goal) => `goal-${goal.id}`)
      if (defaultExpanded.length > 0) {
        setExpandedGoals(defaultExpanded)
      }
    }
  }, [isOpen, courseGoals, expandedGoals.length])

  // 初始化editingGoalObjectives及基线
  useEffect(() => {
    if (isOpen && courseGoals && courseGoals.length > 0) {
      const state = toEditingState(courseGoals)
      setEditingGoalObjectives(state)
      setBaselineObjectives(state)
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

  const handleAddObjectiveForGoal = (goalId: string, accordionValue: string) => {
    setExpandedGoals((prev) => {
      if (prev.includes(accordionValue)) {
        return prev
      }
      return [...prev, accordionValue]
    })

    startAddingObjectiveForGoal(goalId)
  }

  const updateGoalObjectiveInput = (goalId: string, value: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], inputValue: value },
    }))
  }

  const cancelAddingObjectiveForGoal = (goalId: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isEditing: false },
    }))
  }

  const removeGoalObjective = (goalId: string, objectiveId: string) => {
    setEditingGoalObjectives((prev) => ({
      ...prev,
      [goalId]: (prev[goalId] || []).filter((obj) => obj.id !== objectiveId),
    }))
  }

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
      const response = await courseGoalsApi.getCourseGoals(String(courseId), String(majorId))
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
  const filteredCourseGoals = useMemo(() => {
    if (!courseGoals || courseGoals.length === 0) {
      return []
    }

    if (!debouncedFilterKeyword.trim()) {
      return courseGoals
    }

    const keyword = debouncedFilterKeyword.toLowerCase()

    return courseGoals.filter((goal: any) => {
      const goalObjectivesList = editingGoalObjectives[goal.id] || []

      if (goal.description?.toLowerCase().includes(keyword)) {
        return true
      }

      if (goalObjectivesList.some((obj: any) => obj.description?.toLowerCase().includes(keyword))) {
        return true
      }

      return false
    })
  }, [courseGoals, debouncedFilterKeyword, editingGoalObjectives])

  const isObjectiveDirty = (goalId: string, objective: { id: string; description: string }): boolean => {
    const baselineList = baselineObjectives[goalId]
    if (!baselineList) return true
    const baselineObj = baselineList.find((obj) => String(obj.id) === String(objective.id))
    // 基线中找不到说明是新增的未持久化条目，始终视为 dirty
    if (!baselineObj) return true
    return objective.description !== baselineObj.description
  }

  const handleObjectiveBlur = (goal: any, objective: { id: string; description: string }) => {
    if (!isObjectiveDirty(String(goal.id), objective)) return
    const objectiveKey = getObjectiveActionKey(String(goal.id), String(objective.id))
    // 正在保存/删除中则跳过
    if (savingObjectiveKeys[objectiveKey] || deletingObjectiveKeys[objectiveKey] || isSyncingObjectives) return
    void handleSaveSingleObjective(goal, objective)
  }

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
                    <XCircle className="w-4 h-4" />
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
              <FileUpload
                buttonText="上传Excel"
                fileType="Excel文件"
                maxFileSize={10 * 1024 * 1024}
                maxFileCount={1}
                accept=".xlsx,.xls"
                onUpload={async (files) => {
                  return files.map((file) => `/uploads/${file.name}`)
                }}
                disabled={isSyncingObjectives}
              />
              <Button
                size="sm"
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

          {/* 教学目标编辑内容 */}
          <div className="w-full">
            <Accordion
              type="multiple"
              value={expandedGoals}
              onValueChange={setExpandedGoals}
              className="space-y-3"
            >
              {filteredCourseGoals?.map((goal: any, goalIdx: number) => {
                const goalObjectivesList = editingGoalObjectives[goal.id] || []
                const goalInput = goalObjectiveInputs[goal.id]
                const accordionValue = `goal-${goal.id}`

                return (
                  <AccordionItem
                    key={goal.id}
                    value={accordionValue}
                    className="rounded-lg border border-border bg-secondary/10 backdrop-blur-sm relative"
                  >
                    <div className="absolute top-3 right-3 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAddObjectiveForGoal(goal.id, accordionValue)
                        }}
                        className="inline-flex items-center justify-center h-6 w-6 p-0 text-primary hover:bg-primary/10 rounded transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <AccordionTrigger className="px-4 py-3 hover:no-underline pr-12">
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent/10 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary">
                          {goalIdx + 1}
                        </div>
                        <div className="text-left min-w-0 w-[95%]">
                          <p className="text-base font-medium text-foreground break-words">
                            {highlightKeyword(goal.description, debouncedFilterKeyword)}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-3 pb-4">
                      <div className="space-y-3 pl-12 pr-4">
                        {/* 教学目标输入框 */}
                        {goalInput?.isEditing && (
                          <div className="flex gap-2 items-start">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary mt-2">
                              {String.fromCharCode(97)}
                            </div>
                            <ExpandableTextarea
                              value={goalInput.inputValue}
                              onChange={(value) => updateGoalObjectiveInput(goal.id, value)}
                              placeholder="输入教学目标内容"
                              maxLength={500}
                              rows={4}
                              className="flex-1 px-3 py-2 text-lg"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => void handleSaveDraftObjective(goal)}
                              className="gap-1 h-8 px-2 mt-2"
                            >
                              <Check className="w-3 h-3" />
                              保存
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => cancelAddingObjectiveForGoal(goal.id)}
                              className="gap-1 h-8 px-2 mt-2"
                            >
                              <XCircle className="w-3 h-3" />
                              取消
                            </Button>
                          </div>
                        )}

                        {/* 教学目标列表 */}
                        {goalObjectivesList.length > 0 ? (
                          <div className="space-y-2">
                            {goalObjectivesList.map((objective, objIdx) => {
                              const objectiveKey = getObjectiveActionKey(String(goal.id), String(objective.id))
                              const isSavingObjective = !!savingObjectiveKeys[objectiveKey]
                              const isDeletingObjective = !!deletingObjectiveKeys[objectiveKey]
                              const dirty = isObjectiveDirty(String(goal.id), objective)
                              return (
                                <div key={objective.id} className="flex gap-2 items-start">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary mt-2">
                                    {String.fromCharCode(97 + objIdx)}
                                  </div>
                                  <ExpandableTextarea
                                    value={objective.description || ""}
                                    onChange={(value) => updateTeachingObjective(objective.id, value)}
                                    onBlur={() => handleObjectiveBlur(goal, objective)}
                                    placeholder="输入教学目标内容"
                                    maxLength={500}
                                    rows={4}
                                    className="flex-1 px-3 py-2 text-lg"
                                  />
                                  {(dirty || isSavingObjective) && (
                                    <Button
                                      size="sm"
                                      onClick={() => handleSaveSingleObjective(goal, objective)}
                                      disabled={isSavingObjective || isDeletingObjective || isSyncingObjectives}
                                      className="h-8 w-8 p-0 flex-shrink-0 mt-2"
                                      title="保存"
                                    >
                                      {isSavingObjective ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteSingleObjective(String(goal.id), String(objective.id))}
                                    disabled={isSavingObjective || isDeletingObjective || isSyncingObjectives}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0 mt-2"
                                    title="删除"
                                  >
                                    {isDeletingObjective ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                                  </Button>
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
                )
              })}

              {/* 筛选无结果提示 */}
              {debouncedFilterKeyword.trim() && filteredCourseGoals?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">暂无"{debouncedFilterKeyword}"相关的内容</p>
                </div>
              )}
            </Accordion>
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
