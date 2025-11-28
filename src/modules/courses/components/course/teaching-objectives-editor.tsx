"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog"
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion"
import { Pencil, X, Check, Loader2, Plus, BookMarked, GripVertical, Search, Settings, Trash2, Star, Flag, ArrowLeft, XCircle } from "lucide-react"
import { FileUpload } from "@/shared/components/ui/file-upload"
import { cn } from "@/shared/utils/utils"
import type { TreeNode } from "@/types"
import type { CourseGoal } from "@/lib/api/course-goals-api"
import { courseGoalsApi } from "@/modules/courses/api/courseGoalsApi"

interface TeachingObjectivesEditorProps {
  isOpen: boolean
  onClose: () => void
  courseGoals: CourseGoal[]
  node: TreeNode
  majorIndicators: Array<{ requirementId: string; indicatorIndex: number; content: string }>
  teachingObjectiveIndicatorMap: Record<string, string[]>
  isLoadingMajorIndicators: boolean
  isLoadingTeachingObjectiveIndicators: boolean
}

export function TeachingObjectivesEditor({
  isOpen,
  onClose,
  courseGoals,
  node,
  majorIndicators,
  teachingObjectiveIndicatorMap,
  isLoadingMajorIndicators,
  isLoadingTeachingObjectiveIndicators,
}: TeachingObjectivesEditorProps) {
  // 教学目标编辑状态
  const [editingGoalObjectives, setEditingGoalObjectives] = useState<Record<string, any[]>>({})
  const [goalObjectiveInputs, setGoalObjectiveInputs] = useState<Record<string, { inputValue: string; isMultiline: boolean; isEditing: boolean }>>({})
  const [goalObjectiveEditStates, setGoalObjectiveEditStates] = useState<Record<string, { isMultiline: boolean }>>({})
  const [isSavingTeachingObjectives, setIsSavingTeachingObjectives] = useState(false)
  const [isAutoSavingTeachingObjectives, setIsAutoSavingTeachingObjectives] = useState(false)
  const [teachingObjectivesFilterKeyword, setTeachingObjectivesFilterKeyword] = useState("")
  const [debouncedFilterKeyword, setDebouncedFilterKeyword] = useState("")
  const [isFilteringTeachingObjectives, setIsFilteringTeachingObjectives] = useState(false)
  const [expandedGoals, setExpandedGoals] = useState<string[]>([])

  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // 初始化editingGoalObjectives
  useEffect(() => {
    if (isOpen && courseGoals && courseGoals.length > 0) {
      const initialGoalObjectives: Record<string, any[]> = {}
      courseGoals.forEach((goal: any) => {
        const objectives: any[] = []
        if (goal.children && goal.children.length > 0) {
          goal.children.forEach((child: any) => {
            objectives.push({
              id: child.id.toString(),
              description: child.description,
            })
          })
        }
        initialGoalObjectives[goal.id] = objectives
      })
      setEditingGoalObjectives(initialGoalObjectives)
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

  // 自动保存
  useEffect(() => {
    if (!isOpen) {
      return
    }

    const autoSaveInterval = setInterval(() => {
      handleAutoSaveTeachingObjectives()
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [isOpen])

  // 教学目标编辑函数
  const startAddingObjectiveForGoal = (goalId: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isMultiline: false, isEditing: true },
    }))
  }

  const updateGoalObjectiveInput = (goalId: string, value: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], inputValue: value },
    }))
  }

  const toggleGoalObjectiveMultiline = (goalId: string, isMultiline: boolean) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], isMultiline },
    }))
  }

  const finishAddingObjectiveForGoal = (goalId: string) => {
    const input = goalObjectiveInputs[goalId]
    if (!input || !input.inputValue.trim()) {
      setGoalObjectiveInputs((prev) => ({
        ...prev,
        [goalId]: { inputValue: "", isMultiline: false, isEditing: false },
      }))
      return
    }

    const newObjective = {
      id: Date.now().toString(),
      description: input.inputValue.trim(),
      children: null,
    }

    setEditingGoalObjectives((prev) => ({
      ...prev,
      [goalId]: [...(prev[goalId] || []), newObjective],
    }))

    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isMultiline: false, isEditing: false },
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

  const toggleGoalObjectiveEditMode = (goalId: string, objectiveId: string, isMultiline: boolean) => {
    const key = `${goalId}-${objectiveId}`
    setGoalObjectiveEditStates((prev) => ({
      ...prev,
      [key]: { isMultiline },
    }))
  }

  const handleAutoSaveTeachingObjectives = async () => {
    if (isAutoSavingTeachingObjectives || !courseGoals || courseGoals.length === 0) {
      return
    }

    setIsAutoSavingTeachingObjectives(true)
    try {
      const updatedGoals = courseGoals.map((goal: any) => ({
        ...goal,
        children: editingGoalObjectives[goal.id] || goal.children || [],
      }))

      const courseId = (node?.metadata as any)?.courseId
      const parentMajorId = (node?.metadata as any)?.parentMajorId
      if (courseId && parentMajorId) {
        console.log("[TeachingObjectivesEditor] 教学目标自动保存:", updatedGoals)
        // 调用API保存教学目标
        await courseGoalsApi.updateCourseGoals(String(courseId), String(parentMajorId), updatedGoals)
      }
    } catch (error) {
      console.error("[TeachingObjectivesEditor] 自动保存教学目标失败:", error)
    } finally {
      setIsAutoSavingTeachingObjectives(false)
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

  const handleSaveTeachingObjectives = async () => {
    setIsSavingTeachingObjectives(true)
    try {
      if (courseGoals && courseGoals.length > 0) {
        const updatedGoals = courseGoals.map((goal: any) => ({
          ...goal,
          children: editingGoalObjectives[goal.id] || goal.children || [],
        }))

        const courseId = (node?.metadata as any)?.courseId
        const parentMajorId = (node?.metadata as any)?.parentMajorId
        if (courseId && parentMajorId) {
          console.log("[TeachingObjectivesEditor] 教学目标已更新:", updatedGoals)
          await courseGoalsApi.updateCourseGoals(String(courseId), String(parentMajorId), updatedGoals)
        }
      }

      onClose()
    } catch (error) {
      console.error("[TeachingObjectivesEditor] 保存教学目标失败:", error)
    } finally {
      setIsSavingTeachingObjectives(false)
    }
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
                  <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-2 bg-transparent"
                disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
              >
                <Star className="w-4 h-4" />
                AI一键生成
              </Button>
              <FileUpload
                buttonText="上传Excel"
                fileType="Excel文件"
                maxFileSize={10 * 1024 * 1024}
                maxFileCount={1}
                accept=".xlsx,.xls"
                onUpload={async (files) => {
                  return files.map((file) => `/uploads/${file.name}`)
                }}
                disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={onClose}
                className="gap-2 bg-transparent"
                disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
              >
                <ArrowLeft className="w-4 h-4" />
                退出
              </Button>
              <Button
                size="sm"
                onClick={handleSaveTeachingObjectives}
                disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
                className="gap-2"
              >
                {isSavingTeachingObjectives || isAutoSavingTeachingObjectives ? (
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
                          startAddingObjectiveForGoal(goal.id)
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
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-base font-medium text-foreground truncate">
                            {highlightKeyword(goal.description, debouncedFilterKeyword)}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="pt-0 pb-4">
                      <div className="space-y-3 pl-12 pr-4">
                        {/* 教学目标输入框 */}
                        {goalInput?.isEditing && (
                          <div className="flex gap-2 p-2 bg-card/20 rounded-md border border-border mr-2">
                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary self-center">
                              {String.fromCharCode(97)}
                            </div>
                            {goalInput.isMultiline ? (
                              <textarea
                                autoFocus
                                placeholder="输入教学目标内容"
                                value={goalInput.inputValue}
                                onChange={(e) => updateGoalObjectiveInput(goal.id, e.target.value)}
                                onBlur={() => finishAddingObjectiveForGoal(goal.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && e.ctrlKey) {
                                    finishAddingObjectiveForGoal(goal.id)
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-lg resize-none focus:outline-none bg-transparent focus:ring-0 min-h-[80px]"
                              />
                            ) : (
                              <input
                                autoFocus
                                type="text"
                                placeholder="输入教学目标内容"
                                value={goalInput.inputValue}
                                onChange={(e) => updateGoalObjectiveInput(goal.id, e.target.value)}
                                onFocus={() => toggleGoalObjectiveMultiline(goal.id, true)}
                                onBlur={() => finishAddingObjectiveForGoal(goal.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    finishAddingObjectiveForGoal(goal.id)
                                  }
                                }}
                                className="flex-1 px-3 py-2 text-lg focus:outline-none focus:ring-0 bg-transparent border-b border-transparent hover:border-border focus:border-primary"
                              />
                            )}
                          </div>
                        )}

                        {/* 教学目标列表 */}
                        {goalObjectivesList.length > 0 ? (
                          <div className="space-y-2">
                            {goalObjectivesList.map((objective, objIdx) => {
                              const editKey = `${goal.id}-${objective.id}`
                              const editState = goalObjectiveEditStates[editKey]
                              const isMultiline = editState?.isMultiline

                              return (
                                <div key={objective.id} className="flex gap-2 p-2 bg-card/20 rounded-md border border-border mr-2">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary self-center">
                                    {String.fromCharCode(97 + objIdx)}
                                  </div>
                                  {isMultiline ? (
                                    <textarea
                                      placeholder="输入教学目标内容"
                                      value={objective.description || ""}
                                      onChange={(e) => updateTeachingObjective(objective.id, e.target.value.slice(0, 500))}
                                      onBlur={() => toggleGoalObjectiveEditMode(goal.id, objective.id, false)}
                                      className="flex-1 px-3 py-2 text-lg resize-none focus:outline-none bg-transparent focus:ring-0 min-h-[80px]"
                                    />
                                  ) : (
                                    <input
                                      type="text"
                                      placeholder="输入教学目标内容"
                                      value={objective.description || ""}
                                      onChange={(e) => updateTeachingObjective(objective.id, e.target.value.slice(0, 500))}
                                      onFocus={() => toggleGoalObjectiveEditMode(goal.id, objective.id, true)}
                                      className="flex-1 text-lg text-foreground bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none px-1 py-0.5"
                                    />
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeGoalObjective(goal.id, objective.id)}
                                    className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-5 px-1 flex-shrink-0 self-center"
                                  >
                                    <Trash2 className="w-3 h-3" />
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
              disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
            >
              <ArrowLeft className="w-4 h-4" />
              退出
            </Button>
            <Button
              onClick={handleSaveTeachingObjectives}
              disabled={isSavingTeachingObjectives || isAutoSavingTeachingObjectives}
              className="gap-2"
            >
              {isSavingTeachingObjectives || isAutoSavingTeachingObjectives ? (
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
      </div>
    </div>
  )
}
