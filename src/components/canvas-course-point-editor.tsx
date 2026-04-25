"use client"

/**
 * 画布课点编辑器组件
 * 直接编辑模式，无需点击行内编辑按钮
 */

import { useState, useMemo, useCallback, useEffect, useRef, type SetStateAction } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { SortableOrderTag } from "@/shared/components/ui/sortable-order-tag"
import { useSortableRowReorder } from "@/shared/hooks/use-sortable-row-reorder"
import { cn } from "@/shared/utils/utils"
import { Check, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import type { CoursePointCardData } from "./canvas-elements/types"

interface CanvasCoursePointEditorProps {
  /** 课点列表数据 */
  coursePoints: CoursePointCardData[]
  /** 打开抽屉后需要定位并聚焦的课点ID */
  focusPointId?: string | null
  /** 打开抽屉后需要定位并聚焦的课点序号 */
  focusPointIndex?: number | null
  /** 保存回调 */
  onSave: (coursePoints: CoursePointCardData[]) => Promise<void> | void
  /** 关闭回调 */
  onClose: () => void
  /** 是否正在保存 */
  isSaving?: boolean
}

function renameCoursePointNames(coursePoints: CoursePointCardData[]): CoursePointCardData[] {
  return coursePoints.map((coursePoint, index) => ({
    ...coursePoint,
    index: index + 1,
    name: `课点${index + 1}`,
  }))
}

function normalizeCoursePointsForSave(coursePoints: CoursePointCardData[]): CoursePointCardData[] {
  return renameCoursePointNames(
    coursePoints.map((coursePoint) => ({
      ...coursePoint,
      description: typeof coursePoint.description === "string" ? coursePoint.description.trim() : undefined,
    }))
  )
}

function createCoursePointsSnapshot(coursePoints: CoursePointCardData[]): string {
  return JSON.stringify(
    normalizeCoursePointsForSave(coursePoints).map((coursePoint) => ({
      id: coursePoint.id,
      originalId: coursePoint.originalId,
      index: coursePoint.index,
      name: coursePoint.name,
      description: coursePoint.description,
    }))
  )
}

function getMaxCoursePointIndex(coursePoints: CoursePointCardData[]): number {
  return coursePoints.reduce((maxValue, coursePoint) => {
    const indexValue = Number(coursePoint.index)

    if (!Number.isFinite(indexValue)) {
      return maxValue
    }

    return indexValue > maxValue ? indexValue : maxValue
  }, 0)
}

function createDraftCoursePoint(id: string, index: number): CoursePointCardData {
  return {
    id,
    index,
    name: `课点${index}`,
    description: "",
  }
}

function focusFieldAtEnd(field: HTMLInputElement | HTMLTextAreaElement): void {
  field.scrollIntoView({ behavior: "smooth", block: "center" })
  field.focus()
  const valueLength = field.value.length
  field.setSelectionRange(valueLength, valueLength)
}

/**
 * 画布课点编辑器组件
 * 用于在画布中编辑课点面板内的课点列表
 */
export function CanvasCoursePointEditor({
  coursePoints,
  focusPointId = null,
  focusPointIndex = null,
  onSave,
  onClose,
  isSaving = false,
}: CanvasCoursePointEditorProps) {
  const initialSnapshotRef = useRef(createCoursePointsSnapshot(coursePoints))
  // 本地编辑状态
  const [localCoursePoints, setLocalCoursePoints] = useState<CoursePointCardData[]>(() =>
    renameCoursePointNames(coursePoints)
  )
  const [draftCoursePoint, setDraftCoursePoint] = useState<CoursePointCardData | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState("")
  const descriptionInputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  const draftDescriptionInputRef = useRef<HTMLTextAreaElement | null>(null)
  const draftCoursePointId = draftCoursePoint ? draftCoursePoint.id : null

  const setDescriptionInputRef = useCallback(
    (pointId: string) => (element: HTMLTextAreaElement | null) => {
      descriptionInputRefs.current[pointId] = element
    },
    []
  )

  const setDraftDescriptionRef = useCallback((element: HTMLTextAreaElement | null) => {
    draftDescriptionInputRef.current = element
  }, [])

  useEffect(() => {
    initialSnapshotRef.current = createCoursePointsSnapshot(coursePoints)
    setLocalCoursePoints(renameCoursePointNames(coursePoints))
    setDraftCoursePoint(null)
    setHasChanges(false)
  }, [coursePoints])

  const setLocalCoursePointsWithSnapshot = useCallback((value: SetStateAction<CoursePointCardData[]>) => {
    setLocalCoursePoints((prevCoursePoints) => {
      const nextCoursePoints = typeof value === "function"
        ? value(prevCoursePoints)
        : value

      setHasChanges(createCoursePointsSnapshot(nextCoursePoints) !== initialSnapshotRef.current)
      return nextCoursePoints
    })
  }, [])

  useEffect(() => {
    // [MOD] 显式判空：当 draftCoursePoint 尚未生成时直接退出，避免空引用
    if (draftCoursePointId === null || draftCoursePoint === null) {
      return
    }

    const nextIndex = getMaxCoursePointIndex(localCoursePoints) + 1

    if (draftCoursePoint.index === nextIndex && draftCoursePoint.name === `课点${nextIndex}`) {
      return
    }

    setDraftCoursePoint((prevDraft) => {
      if (prevDraft === null) {
        return prevDraft
      }

      return {
        ...prevDraft,
        index: nextIndex,
        name: `课点${nextIndex}`,
      }
    })
  }, [draftCoursePoint, draftCoursePointId, localCoursePoints])

  useEffect(() => {
    if (draftCoursePointId === null) {
      return
    }

    const frameId = requestAnimationFrame(() => {
      const targetInput = draftDescriptionInputRef.current

      if (!targetInput) {
        return
      }

      focusFieldAtEnd(targetInput)
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [draftCoursePointId])

  useEffect(() => {
    if (!focusPointId && focusPointIndex == null) {
      return
    }

    setSearchKeyword("")

    const frameId = requestAnimationFrame(() => {
      let targetInput: HTMLTextAreaElement | null = null

      if (focusPointId) {
        targetInput = descriptionInputRefs.current[focusPointId] || null
      }

      if (!targetInput && focusPointIndex != null) {
        const point = localCoursePoints.find(cp => cp.index === focusPointIndex)
        if (point) {
          targetInput = descriptionInputRefs.current[point.id] || null
        }
      }

      if (!targetInput) {
        return
      }

      focusFieldAtEnd(targetInput)
    })

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [focusPointId, focusPointIndex, localCoursePoints])

  // 过滤后的课点列表
  const filteredCoursePoints = useMemo(() => {
    if (!searchKeyword.trim()) return localCoursePoints
    const keyword = searchKeyword.toLowerCase()
    return localCoursePoints.filter(
      (cp) =>
        (cp.name || "").toLowerCase().includes(keyword) ||
        (typeof cp.description === 'string' && cp.description.toLowerCase().includes(keyword))
    )
  }, [localCoursePoints, searchKeyword])

  // 生成唯一 ID
  const generateId = useCallback(() => {
    return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }, [])

  // 添加新课点
  const handleAddNew = useCallback(() => {
    if (draftCoursePoint !== null) {
      const targetInput = draftDescriptionInputRef.current

      if (targetInput) {
        focusFieldAtEnd(targetInput)
      }

      return
    }

    const nextIndex = getMaxCoursePointIndex(localCoursePoints) + 1
    setDraftCoursePoint(createDraftCoursePoint(generateId(), nextIndex))
  }, [draftCoursePoint, generateId, localCoursePoints])

  // 更新课点字段
  const handleUpdateField = useCallback((id: string, field: keyof CoursePointCardData, value: string | number) => {
    setLocalCoursePointsWithSnapshot((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, [field]: value } : cp))
    )
  }, [setLocalCoursePointsWithSnapshot])

  const handleUpdateDraftDescription = useCallback((value: string) => {
    setDraftCoursePoint((prevDraft) => {
      if (prevDraft === null) {
        return prevDraft
      }

      return {
        ...prevDraft,
        description: value,
      }
    })
  }, [])

  const handleConfirmDraftCoursePoint = useCallback(() => {
    if (draftCoursePoint === null) {
      return
    }

    setLocalCoursePointsWithSnapshot((prev) => renameCoursePointNames([...prev, draftCoursePoint]))
    setDraftCoursePoint(null)
  }, [draftCoursePoint, setLocalCoursePointsWithSnapshot])

  const handleCancelDraftCoursePoint = useCallback(() => {
    setDraftCoursePoint(null)
  }, [])

  // 删除课点
  const handleDelete = useCallback((id: string) => {
    setLocalCoursePointsWithSnapshot((prev) => renameCoursePointNames(prev.filter((cp) => cp.id !== id)))
  }, [setLocalCoursePointsWithSnapshot])
  const hasDraftCoursePoint = draftCoursePoint !== null
  const canReorder = localCoursePoints.length > 1 && !isSaving && searchKeyword.trim().length === 0 && !hasDraftCoursePoint
  const reorderTitle = searchKeyword.trim().length > 0
    ? "搜索结果中不可拖动排序"
    : hasDraftCoursePoint
      ? "请先确认或取消新增课点"
      : undefined
  const {
    draggedItemId,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useSortableRowReorder<CoursePointCardData>({
    items: localCoursePoints,
    setItems: setLocalCoursePointsWithSnapshot,
    getItemId: (coursePoint) => coursePoint.id,
    enabled: canReorder,
    onReorderComplete: renameCoursePointNames,
  })

  // 保存并关闭
  const handleSave = useCallback(async () => {
    if (!hasChanges) {
      onClose()
      return
    }

    const currentSnapshot = createCoursePointsSnapshot(localCoursePoints)

    if (currentSnapshot === initialSnapshotRef.current) {
      setHasChanges(false)
      onClose()
      return
    }

    const normalizedPoints = normalizeCoursePointsForSave(localCoursePoints)

    await onSave(normalizedPoints)
  }, [hasChanges, localCoursePoints, onClose, onSave])

  return (
    <div className="flex flex-col h-full">
      {/* 搜索和新增栏 */}
      <div className="px-6 py-3 flex-shrink-0 bg-background border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="搜索课点..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-2 flex-shrink-0"
            onClick={handleAddNew}
          >
            <Plus className="w-4 h-4" />
            新增
          </Button>
        </div>
      </div>

      {/* 课点列表 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex flex-col overflow-hidden flex-1">
          {/* 表头 */}
          <div className="overflow-x-auto border-b border-border flex-shrink-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-16">
                    序号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground w-[200px]">
                    课点名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-foreground">
                    课点描述
                  </th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-foreground w-16">
                    操作
                  </th>
                </tr>
              </thead>
            </table>
          </div>
          {/* 表格内容 */}
          <div className="overflow-y-auto flex-1">
            {draftCoursePoint === null && filteredCoursePoints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无课点数据
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {draftCoursePoint ? (
                    <tr className="border-b border-primary/20 bg-primary/5">
                      <td className="px-4 py-3 text-center text-sm font-medium text-primary w-16">
                        <div className="flex items-center justify-center">
                          <span className="inline-flex min-w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary tabular-nums shadow-sm">
                            {draftCoursePoint.index}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 w-[200px]">
                        <Input
                          value={draftCoursePoint.name}
                          className="text-sm bg-secondary/20"
                          readOnly
                          tabIndex={-1}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ExpandableTextarea
                          ref={setDraftDescriptionRef}
                          value={typeof draftCoursePoint.description === "string" ? draftCoursePoint.description : ""}
                          onChange={handleUpdateDraftDescription}
                          className="text-sm"
                          placeholder="请输入课点描述（可选）"
                          rows={2}
                          hideCounter
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-3 text-center w-16">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="sm"
                            onClick={handleConfirmDraftCoursePoint}
                            disabled={isSaving}
                            className="h-8 w-8 p-0"
                            title="确认新增"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleCancelDraftCoursePoint}
                            disabled={isSaving}
                            className="h-8 w-8 p-0 text-muted-foreground"
                            title="取消新增"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {filteredCoursePoints.map((coursePoint, index) => (
                    <tr
                      key={coursePoint.id}
                      onDragOver={(event) => handleDragOver(event, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(event) => handleDrop(event, index)}
                      className={cn(
                        "border-b border-border transition-colors hover:bg-secondary/20",
                        dragOverIndex === index && draggedItemId !== null ? "bg-primary/10" : "",
                      )}
                    >
                      <td className="px-4 py-3 text-center text-sm font-medium text-green-600 w-16">
                        <div className="flex items-center justify-center">
                          <SortableOrderTag
                            order={index + 1}
                            draggable={canReorder}
                            isDragging={draggedItemId === coursePoint.id}
                            onDragStart={(event) => handleDragStart(event, coursePoint.id)}
                            onDragEnd={handleDragEnd}
                            aria-label={`拖动调整第 ${index + 1} 行课点顺序`}
                            title={reorderTitle}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 w-[200px]">
                        <Input
                          value={coursePoint.name}
                          className="text-sm bg-secondary/20"
                          readOnly
                          tabIndex={-1}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <ExpandableTextarea
                          ref={setDescriptionInputRef(coursePoint.id)}
                          value={typeof coursePoint.description === 'string' ? coursePoint.description : ""}
                          onChange={(value) => handleUpdateField(coursePoint.id, "description", value)}
                          className="text-sm"
                          placeholder="请输入课点描述（可选）"
                          rows={2}
                          hideCounter
                          disabled={isSaving}
                        />
                      </td>
                      <td className="px-4 py-3 text-center w-16">
                        {localCoursePoints.length > 0 && (
                          <button
                            onClick={() => handleDelete(coursePoint.id)}
                            className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving || hasDraftCoursePoint}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "保存"
          )}
        </Button>
      </div>
    </div>
  )
}

export default CanvasCoursePointEditor
