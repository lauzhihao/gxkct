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
  const [goalObjectiveInputs, setGoalObjectiveInputs] = useState<Record<string, { inputValue: string; isEditing: boolean }>>({})
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
      if (isAutoSavingTeachingObjectives || !courseGoals || courseGoals.length === 0) {
        return
      }

      setIsAutoSavingTeachingObjectives(true)
      Promise.resolve().then(async () => {
        try {
          const updatedGoals = courseGoals.map((goal: any) => ({
            ...goal,
            children: editingGoalObjectives[goal.id] || goal.children || [],
          }))

          const courseId = node?.id
          if (courseId && majorId) {
            console.log("[TeachingObjectivesEditor] 教学目标自动保存:", updatedGoals)
            await courseGoalsApi.updateCourseGoals(String(courseId), String(majorId), updatedGoals)
          }
        } catch (error) {
          console.error("[TeachingObjectivesEditor] 自动保存教学目标失败:", error)
        } finally {
          setIsAutoSavingTeachingObjectives(false)
        }
      })
    }, 30000)

    return () => clearInterval(autoSaveInterval)
  }, [isOpen, isAutoSavingTeachingObjectives, courseGoals, editingGoalObjectives, node?.id, majorId])

  // 教学目标编辑函数
  const startAddingObjectiveForGoal = (goalId: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isEditing: true },
    }))
  }

  const updateGoalObjectiveInput = (goalId: string, value: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { ...prev[goalId], inputValue: value },
    }))
  }

  const finishAddingObjectiveForGoal = (goalId: string) => {
    const input = goalObjectiveInputs[goalId]
    if (!input || !input.inputValue.trim()) {
      setGoalObjectiveInputs((prev) => ({
        ...prev,
        [goalId]: { inputValue: "", isEditing: false },
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

        // 使用 node.id 作为 courseId，使用传入的 majorId
        const courseId = node?.id
        if (courseId && majorId) {
          console.log("[TeachingObjectivesEditor] 教学目标已更新:", updatedGoals)
          await courseGoalsApi.updateCourseGoals(String(courseId), String(majorId), updatedGoals)
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
                  <Spinner className="w-4 h-4 text-muted-foreground" />
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
                    <Spinner className="w-4 h-4" />
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
                              onBlur={() => finishAddingObjectiveForGoal(goal.id)}
                              placeholder="输入教学目标内容"
                              maxLength={500}
                              rows={4}
                              className="flex-1 px-3 py-2 text-lg"
                              autoFocus
                            />
                          </div>
                        )}

                        {/* 教学目标列表 */}
                        {goalObjectivesList.length > 0 ? (
                          <div className="space-y-2">
                            {goalObjectivesList.map((objective, objIdx) => {
                              return (
                                <div key={objective.id} className="flex gap-2 items-start">
                                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[0.7rem] font-medium text-primary mt-2">
                                    {String.fromCharCode(97 + objIdx)}
                                  </div>
                                  <ExpandableTextarea
                                    value={objective.description || ""}
                                    onChange={(value) => updateTeachingObjective(objective.id, value)}
                                    placeholder="输入教学目标内容"
                                    maxLength={500}
                                    rows={4}
                                    className="flex-1 px-3 py-2 text-lg"
                                  />
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeGoalObjective(goal.id, objective.id)}
                                    className="gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 h-5 px-1 flex-shrink-0 mt-2"
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
                  <Spinner className="w-4 h-4" />
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
