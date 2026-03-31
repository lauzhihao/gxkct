"use client"

/**
 * 画布教学目标编辑器组件
 * 复用系统“设置教学目标”页的展示与交互结构，仅将持久化替换为本地草稿提交
 */

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/shared/components/ui/accordion"
import { Check, Plus, Search, Trash2, ArrowLeft, X, AlertTriangle } from "lucide-react"
import { Spinner } from "@/shared/components/ui/spinner"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { ObjectiveCardData } from "./canvas-elements/types"

interface CanvasObjectiveEditorProps {
  objectives: ObjectiveCardData[]
  objectiveGroups?: CanvasObjectiveGroup[]
  ungroupedObjectiveIds?: string[]
  supportWarnings?: Record<string, string[]>
  onSave: (objectives: ObjectiveCardData[]) => void
  onClose: () => void
  isSaving?: boolean
}

export interface CanvasObjectiveIndicatorGroup {
  indicatorId: number
  indicatorCode: string
  indicatorDescription: string
  indicatorOrder: number
  objectiveIds: string[]
}

export interface CanvasObjectiveGroup {
  requirementId: number
  requirementOrder: number
  requirementDescription: string
  indicators: CanvasObjectiveIndicatorGroup[]
}

interface ObjectiveItem {
  id: string
  content: string
  originalId?: number
  supports?: ObjectiveCardData["supports"]
}

interface DraftInputState {
  inputValue: string
  isEditing: boolean
}

interface IndicatorGroupDisplay extends CanvasObjectiveIndicatorGroup {
  objectives: ObjectiveItem[]
}

interface RequirementGroupDisplay extends CanvasObjectiveGroup {
  indicators: IndicatorGroupDisplay[]
}

function toObjectiveItem(objective: ObjectiveCardData): ObjectiveItem {
  return {
    id: objective.id,
    content: objective.content,
    originalId: objective.originalId,
    supports: objective.supports,
  }
}

function toObjectiveCardData(item: ObjectiveItem, index: number): ObjectiveCardData {
  return {
    id: item.id,
    index: index + 1,
    content: item.content,
    originalId: item.originalId,
    supports: item.supports,
  }
}

function cloneObjectiveItems(items: ObjectiveItem[]): ObjectiveItem[] {
  return items.map((item) => ({
    ...item,
    supports: Array.isArray(item.supports)
      ? item.supports.map((support) => ({ ...support }))
      : item.supports,
  }))
}

function getObjectiveActionKey(goalId: string, objectiveId: string): string {
  return `${goalId}:${objectiveId}`
}

function getObjectiveLabel(index: number): string {
  return String.fromCharCode(65 + index)
}

export function CanvasObjectiveEditor({
  objectives,
  objectiveGroups = [],
  ungroupedObjectiveIds = [],
  supportWarnings = {},
  onSave,
  onClose,
  isSaving = false,
}: CanvasObjectiveEditorProps) {
  const [items, setItems] = useState<ObjectiveItem[]>(() =>
    objectives.length > 0 ? objectives.map(toObjectiveItem) : []
  )
  const [baselineItems, setBaselineItems] = useState<ObjectiveItem[]>(() =>
    objectives.length > 0 ? objectives.map(toObjectiveItem) : []
  )
  const [goalObjectiveInputs, setGoalObjectiveInputs] = useState<Record<string, DraftInputState>>({})
  const [savingObjectiveKeys, setSavingObjectiveKeys] = useState<Record<string, boolean>>({})
  const [deletingObjectiveKeys, setDeletingObjectiveKeys] = useState<Record<string, boolean>>({})
  const [teachingObjectivesFilterKeyword, setTeachingObjectivesFilterKeyword] = useState("")
  const [debouncedFilterKeyword, setDebouncedFilterKeyword] = useState("")
  const [isFilteringTeachingObjectives, setIsFilteringTeachingObjectives] = useState(false)
  const [expandedIndicators, setExpandedIndicators] = useState<string[]>([])

  const filterDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const nextItems = objectives.length > 0 ? objectives.map(toObjectiveItem) : []
    setItems(nextItems)
    setBaselineItems(nextItems)
    setGoalObjectiveInputs({})
  }, [objectives])

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

  const indicatorMetaMap = useMemo(() => {
    const nextMap = new Map<string, CanvasObjectiveIndicatorGroup>()

    objectiveGroups.forEach((group) => {
      group.indicators.forEach((indicator) => {
        nextMap.set(String(indicator.indicatorId), indicator)
      })
    })

    return nextMap
  }, [objectiveGroups])

  const groupedObjectiveIdSet = useMemo(() => {
    const nextSet = new Set<string>()

    items.forEach((item) => {
      const supports = Array.isArray(item.supports) ? item.supports : []
      supports.forEach((support) => {
        const indicatorId = typeof support?.indicatorId === "number" ? String(support.indicatorId) : ""
        if (indicatorMetaMap.has(indicatorId)) {
          nextSet.add(item.id)
        }
      })
    })

    return nextSet
  }, [indicatorMetaMap, items])

  const groupedDisplayData = useMemo(() => {
    return objectiveGroups.map<RequirementGroupDisplay>((group) => ({
      ...group,
      indicators: group.indicators.map<IndicatorGroupDisplay>((indicator) => {
        const indicatorId = String(indicator.indicatorId)
        const indicatorObjectives = items.filter((item) => {
          const supports = Array.isArray(item.supports) ? item.supports : []
          return supports.some((support) => (
            typeof support?.indicatorId === "number" && String(support.indicatorId) === indicatorId
          ))
        })

        return {
          ...indicator,
          objectives: indicatorObjectives,
        }
      }),
    }))
  }, [items, objectiveGroups])

  useEffect(() => {
    const defaultExpandedIndicators = objectiveGroups.flatMap((group) =>
      group.indicators
        .filter((indicator) => indicator.objectiveIds.length > 0)
        .map((indicator) => `indicator-${indicator.indicatorId}`)
    )

    setExpandedIndicators(defaultExpandedIndicators)
  }, [objectiveGroups, objectives])

  const resetTeachingObjectivesFilter = () => {
    if (filterDebounceTimerRef.current) {
      clearTimeout(filterDebounceTimerRef.current)
      filterDebounceTimerRef.current = null
    }

    setTeachingObjectivesFilterKeyword("")
    setDebouncedFilterKeyword("")
    setIsFilteringTeachingObjectives(false)
  }

  const startAddingObjectiveForGoal = (goalId: string) => {
    setGoalObjectiveInputs((prev) => ({
      ...prev,
      [goalId]: { inputValue: "", isEditing: true },
    }))
  }

  const handleAddObjectiveForGoal = (goalId: string) => {
    const accordionValue = `indicator-${goalId}`
    resetTeachingObjectivesFilter()
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

  const updateTeachingObjective = (objectiveId: string, content: string) => {
    setItems((prev) => prev.map((item) => (
      item.id === objectiveId ? { ...item, content } : item
    )))
  }

  const restoreObjectivesFromBaseline = () => {
    setItems(cloneObjectiveItems(baselineItems))
    setGoalObjectiveInputs({})
  }

  const commitObjectives = (nextItems: ObjectiveItem[]) => {
    const normalizedItems = cloneObjectiveItems(nextItems)
    setItems(normalizedItems)
    setBaselineItems(normalizedItems)
    setGoalObjectiveInputs({})
    onSave(
      normalizedItems
        .filter((item) => item.content.trim())
        .map((item, index) => toObjectiveCardData(item, index))
    )
  }

  const handleSaveSingleObjective = (goalId: string, objective: ObjectiveItem) => {
    const trimmedContent = objective.content.trim()
    if (!trimmedContent) {
      return
    }

    const objectiveKey = getObjectiveActionKey(goalId, objective.id)
    setSavingObjectiveKeys((prev) => ({
      ...prev,
      [objectiveKey]: true,
    }))

    const nextItems = items.map((item) => (
      item.id === objective.id ? { ...item, content: trimmedContent } : item
    ))
    commitObjectives(nextItems)

    setSavingObjectiveKeys((prev) => {
      const next = { ...prev }
      delete next[objectiveKey]
      return next
    })
  }

  const handleSaveDraftObjective = (goalId: string) => {
    const draftInput = goalObjectiveInputs[goalId]
    const draftDescription = draftInput?.inputValue?.trim()
    const indicatorMeta = indicatorMetaMap.get(goalId)

    if (!draftDescription || !indicatorMeta) {
      return
    }

    const draftObjective: ObjectiveItem = {
      id: `canvas-objective-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      content: draftDescription,
      supports: [{
        indicatorId: indicatorMeta.indicatorId,
        title: `指标点 ${indicatorMeta.indicatorCode}`,
      }],
    }

    commitObjectives([...items, draftObjective])
  }

  const handleDeleteSingleObjective = (goalId: string, objectiveId: string) => {
    const confirmed = window.confirm("确定要删除该教学目标吗？\n引用它的二级矩阵数据将立即失效，且此操作不可逆")
    if (!confirmed) {
      return
    }

    const objectiveKey = getObjectiveActionKey(goalId, objectiveId)
    setDeletingObjectiveKeys((prev) => ({
      ...prev,
      [objectiveKey]: true,
    }))

    const nextItems = items.filter((item) => item.id !== objectiveId)
    commitObjectives(nextItems)

    setDeletingObjectiveKeys((prev) => {
      const next = { ...prev }
      delete next[objectiveKey]
      return next
    })
  }

  const isObjectiveDirty = (objective: ObjectiveItem): boolean => {
    const baselineObjective = baselineItems.find((item) => item.id === objective.id)
    if (!baselineObjective) {
      return true
    }

    return objective.content !== baselineObjective.content
  }

  const filteredIndicatorGroups = useMemo(() => {
    if (!debouncedFilterKeyword.trim()) {
      return groupedDisplayData
    }

    const keyword = debouncedFilterKeyword.toLowerCase()
    return groupedDisplayData
      .map((group) => ({
        ...group,
        indicators: group.indicators.filter((indicator) => (
          indicator.indicatorDescription.toLowerCase().includes(keyword)
          || indicator.objectives.some((objective) => objective.content.toLowerCase().includes(keyword))
        )),
      }))
      .filter((group) => group.indicators.length > 0)
  }, [debouncedFilterKeyword, groupedDisplayData])

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

  const orphanObjectives = useMemo(() => {
    const explicitUngroupedIds = new Set(ungroupedObjectiveIds)
    return items.filter((item) => explicitUngroupedIds.has(item.id) || !groupedObjectiveIdSet.has(item.id))
  }, [groupedObjectiveIdSet, items, ungroupedObjectiveIds])

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      <div className="flex flex-shrink-0 items-center justify-between gap-4 px-6 py-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="gap-2 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h2 className="truncate text-2xl font-bold text-foreground">设置教学目标</h2>
        </div>
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-[240px] items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <input
              type="text"
              placeholder="筛选教学目标..."
              value={teachingObjectivesFilterKeyword}
              onChange={(event) => setTeachingObjectivesFilterKeyword(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {teachingObjectivesFilterKeyword && !isFilteringTeachingObjectives ? (
              <button
                type="button"
                onClick={resetTeachingObjectivesFilter}
                className="flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
            {isFilteringTeachingObjectives ? (
              <Spinner className="h-4 w-4 text-muted-foreground" />
            ) : null}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        <div className="w-full pr-1">
          {filteredIndicatorGroups.length > 0 ? (
            <div className="space-y-6">
              {filteredIndicatorGroups.map((requirement) => (
                <section key={requirement.requirementId} className="space-y-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-1.5 rounded-full bg-primary" />
                      <p className="text-sm font-medium text-foreground">
                        毕业要求 {requirement.requirementOrder}
                      </p>
                    </div>
                    <div className="mt-3 border-t border-dashed border-border" />
                  </div>

                  <div className="space-y-4">
                    {requirement.indicators.map((indicator) => {
                      const goalId = String(indicator.indicatorId)
                      const goalObjectivesList = indicator.objectives
                      const goalInput = goalObjectiveInputs[goalId]
                      const accordionValue = `indicator-${goalId}`

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
                                    {indicator.indicatorOrder}
                                  </span>
                                  <span className="break-words text-base font-medium text-foreground">
                                    {highlightKeyword(indicator.indicatorDescription, debouncedFilterKeyword)}
                                  </span>
                                </div>
                              </AccordionTrigger>

                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  handleAddObjectiveForGoal(goalId)
                                }}
                                disabled={goalInput?.isEditing === true || isSaving}
                                className="absolute right-4 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10"
                                title="新增教学目标"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>

                            <AccordionContent className="px-4 pb-4">
                              <div className="ml-8 space-y-3">
                                {goalInput?.isEditing ? (
                                  <div className="flex gap-2 items-start">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary mt-2">
                                      {getObjectiveLabel(goalObjectivesList.length)}
                                    </div>
                                    <div className="flex w-4/5 items-start gap-2">
                                      <ExpandableTextarea
                                        value={goalInput.inputValue}
                                        onChange={(value) => updateGoalObjectiveInput(goalId, value)}
                                        placeholder="输入教学目标内容"
                                        maxLength={500}
                                        rows={4}
                                        className="flex-1 px-3 py-2 text-lg"
                                        autoFocus
                                      />
                                      <Button
                                        size="sm"
                                        onClick={() => handleSaveDraftObjective(goalId)}
                                        disabled={isSaving}
                                        className="mt-0 h-10 w-10 p-0"
                                        title="保存"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={restoreObjectivesFromBaseline}
                                        className="mt-0 h-10 w-10 p-0 text-muted-foreground hover:text-white"
                                        title="取消"
                                        disabled={isSaving}
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : null}

                                {goalObjectivesList.length > 0 ? (
                                  <div className="space-y-2">
                                    {goalObjectivesList.map((objective, objectiveIndex) => {
                                      const objectiveKey = getObjectiveActionKey(goalId, objective.id)
                                      const isSavingObjective = Boolean(savingObjectiveKeys[objectiveKey])
                                      const isDeletingObjective = Boolean(deletingObjectiveKeys[objectiveKey])
                                      const dirty = isObjectiveDirty(objective)
                                      const showSaveAction = dirty || isSavingObjective

                                      return (
                                        <div key={`${goalId}-${objective.id}`} className="flex gap-2 items-start">
                                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-medium text-primary mt-2">
                                            {getObjectiveLabel(objectiveIndex)}
                                          </div>
                                          <div className="flex w-4/5 items-start gap-2">
                                            <div className="flex-1 space-y-2">
                                              <ExpandableTextarea
                                                value={objective.content}
                                                onChange={(value) => updateTeachingObjective(objective.id, value)}
                                                placeholder="输入教学目标内容"
                                                maxLength={500}
                                                rows={4}
                                                className="flex-1 px-3 py-2 text-lg"
                                              />
                                              {Array.isArray(supportWarnings[objective.id]) && supportWarnings[objective.id].length > 0 ? (
                                                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                                                  <div className="flex items-start gap-2">
                                                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                                                    <div className="space-y-1">
                                                      <p className="text-xs font-medium text-amber-700">归属指标点数据异常</p>
                                                      {supportWarnings[objective.id].map((warning, warningIndex) => (
                                                        <p key={`${objective.id}-${warningIndex}`} className="text-xs leading-5 text-amber-700">
                                                          {warning}
                                                        </p>
                                                      ))}
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : null}
                                            </div>
                                            {showSaveAction ? (
                                              <div className="mt-0 flex flex-shrink-0 items-start gap-2">
                                                <Button
                                                  size="sm"
                                                  onClick={() => handleSaveSingleObjective(goalId, objective)}
                                                  disabled={isSavingObjective || isDeletingObjective || isSaving}
                                                  className="h-10 w-10 p-0"
                                                  title="保存"
                                                >
                                                  {isSavingObjective ? <Spinner className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={restoreObjectivesFromBaseline}
                                                  disabled={isSavingObjective || isDeletingObjective || isSaving}
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
                                                onClick={() => handleDeleteSingleObjective(goalId, objective.id)}
                                                disabled={isSavingObjective || isDeletingObjective || isSaving}
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
                                ) : !goalInput?.isEditing ? (
                                  <div className="text-center py-3 text-muted-foreground text-base">
                                    暂无教学目标
                                  </div>
                                ) : null}
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )
                    })}
                  </div>
                </section>
              ))}

              {orphanObjectives.length > 0 ? (
                <section className="space-y-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="h-4 w-1.5 rounded-full bg-amber-500" />
                      <p className="text-sm font-medium text-foreground">未关联指标点</p>
                    </div>
                    <div className="mt-3 border-t border-dashed border-border" />
                  </div>

                  <div className="rounded-lg border border-amber-200 bg-amber-50/40 px-4 py-4">
                    <div className="mb-3 text-xs leading-5 text-amber-700">
                      当前存在未关联到有效指标点的教学目标，它们不会进入正常分组展示，请先校正其归属关系。
                    </div>
                    <div className="space-y-3">
                      {orphanObjectives.map((objective, objectiveIndex) => (
                        <div key={`orphan-${objective.id}`} className="flex gap-2 items-start">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-xs font-medium text-amber-700 mt-2">
                            {getObjectiveLabel(objectiveIndex)}
                          </div>
                          <div className="flex-1 rounded-md border border-amber-200 bg-background px-3 py-3">
                            <p className="text-sm leading-6 text-foreground">{objective.content}</p>
                            {Array.isArray(supportWarnings[objective.id]) && supportWarnings[objective.id].length > 0 ? (
                              <div className="mt-2 space-y-1">
                                {supportWarnings[objective.id].map((warning, warningIndex) => (
                                  <p key={`${objective.id}-orphan-${warningIndex}`} className="text-xs leading-5 text-amber-700">
                                    {warning}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">
                {debouncedFilterKeyword.trim() ? `暂无"${debouncedFilterKeyword}"相关的内容` : "当前课程暂无可展示的毕业要求指标点"}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center justify-center gap-2 border-t border-border px-6 py-6">
        <Button
          variant="outline"
          onClick={onClose}
          className="gap-2 bg-transparent"
          disabled={isSaving}
        >
          <ArrowLeft className="w-4 h-4" />
          退出
        </Button>
      </div>
    </div>
  )
}

export default CanvasObjectiveEditor
