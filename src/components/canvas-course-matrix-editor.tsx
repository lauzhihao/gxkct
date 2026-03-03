"use client"

/**
 * 画布课程矩阵编辑器组件
 * 用于在画布中编辑课程矩阵的支撑关系
 */

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Plus, X } from "lucide-react"
import type { CourseMatrixData, CourseMatrixCoursePoint } from "./canvas-elements/types"
import { SupportLabel } from "@/shared/components/support-label"
import { buildSupportLabelDisplay } from "@/shared/utils/support-label-display"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"

interface CanvasCourseMatrixEditorProps {
  /** 课程矩阵数据 */
  matrixData: CourseMatrixData
  /** 可用的课点列表（用于选择） */
  availableCoursePoints?: Array<{ id: string; name: string; description?: string }>
  /** 保存回调 */
  onSave: (matrixData: CourseMatrixData) => void
  /** 关闭回调 */
  onClose: () => void
  /** 是否正在保存 */
  isSaving?: boolean
}

/**
 * 课点支撑标签组件（编辑模式）
 * 使用 Tooltip 快速显示课点描述内容
 */
function CoursePointTag({
  item,
  description,
  onRemove,
  onToggleLevel,
}: {
  item: CourseMatrixCoursePoint
  description?: string
  onRemove: () => void
  onToggleLevel: () => void
}) {
  const display = buildSupportLabelDisplay({
    title: item.name,
    description,
  })

  return (
    <div className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={onToggleLevel}
        className="inline-flex"
        title="点击切换支撑强度"
      >
        <SupportLabel
          title={display.title}
          desc={display.desc}
          type={item.level}
          size="sm"
          tipsPosition="top"
        />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 p-0.5 hover:bg-black/10 rounded transition-colors"
        title="移除"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

/**
 * 课点选择弹窗组件
 */
function CoursePointSelectionDialog({
  open,
  onOpenChange,
  availableCoursePoints,
  selectedIds,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableCoursePoints: Array<{ id: string; name: string; description?: string }>
  selectedIds: Set<string>
  onConfirm: (selections: Array<{ id: string; name: string; level: "strong" | "weak"; description?: string }>) => void
}) {
  const [localSelections, setLocalSelections] = useState<Record<string, "strong" | "weak">>({})

  // 初始化已选中的课点
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // 打开时重置选择状态
      setLocalSelections({})
    }
    onOpenChange(isOpen)
  }, [onOpenChange])

  const handleToggle = useCallback((id: string, level: "strong" | "weak") => {
    setLocalSelections((prev) => {
      if (prev[id] === level) {
        // 取消选择
        const next = { ...prev }
        delete next[id]
        return next
      }
      return { ...prev, [id]: level }
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const selections = Object.entries(localSelections).map(([id, level]) => {
      const cp = availableCoursePoints.find((p) => p.id === id)
      return { id, name: cp?.name || id, level, description: cp?.description }
    })
    onConfirm(selections)
    onOpenChange(false)
  }, [localSelections, availableCoursePoints, onConfirm, onOpenChange])

  // 过滤掉已选中的课点
  const filteredCoursePoints = useMemo(() => {
    return availableCoursePoints.filter((cp) => !selectedIds.has(cp.id))
  }, [availableCoursePoints, selectedIds])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>选择课点</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto py-4">
          {filteredCoursePoints.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              暂无可选课点
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCoursePoints.map((cp) => (
                <div
                  key={cp.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{cp.name}</div>
                    {cp.description && (
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {cp.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleToggle(cp.id, "strong")}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        localSelections[cp.id] === "strong"
                          ? "bg-orange-500 text-white"
                          : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                      }`}
                    >
                      强支撑
                    </button>
                    <button
                      onClick={() => handleToggle(cp.id, "weak")}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        localSelections[cp.id] === "weak"
                          ? "bg-green-500 text-white"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      弱支撑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={Object.keys(localSelections).length === 0}
          >
            确认添加
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 画布课程矩阵编辑器组件
 */
export function CanvasCourseMatrixEditor({
  matrixData,
  availableCoursePoints = [],
  onSave,
  onClose,
  isSaving = false,
}: CanvasCourseMatrixEditorProps) {
  // 本地编辑状态
  const [localMatrixData, setLocalMatrixData] = useState<CourseMatrixData>(matrixData)

  // 课点选择弹窗状态
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean
    chapterId: string
    objectiveId: string
  }>({
    open: false,
    chapterId: "",
    objectiveId: "",
  })

  // 获取单元格的课点列表
  const getCellCoursePoints = useCallback(
    (chapterId: string, objectiveId: string): CourseMatrixCoursePoint[] => {
      const row = localMatrixData.rows.find((r) => r.chapter_id === chapterId)
      if (!row) return []
      const support = row.supports.find((s) => s.objective_id === objectiveId)
      return support?.course_points || []
    },
    [localMatrixData]
  )

  // 打开课点选择弹窗
  const handleOpenSelection = useCallback((chapterId: string, objectiveId: string) => {
    setSelectionDialog({
      open: true,
      chapterId,
      objectiveId,
    })
  }, [])

  // 添加课点到单元格
  const handleAddCoursePoints = useCallback(
    (selections: Array<{ id: string; name: string; level: "strong" | "weak"; description?: string }>) => {
      const { chapterId, objectiveId } = selectionDialog
      setLocalMatrixData((prev) => {
        const newRows = prev.rows.map((row) => {
          if (row.chapter_id !== chapterId) return row

          const newSupports = row.supports.map((support) => {
            if (support.objective_id !== objectiveId) return support

            const existingIds = new Set(support.course_points.map((cp) => cp.id))
            const newCoursePoints = selections
              .filter((s) => !existingIds.has(s.id))
              .map((s) => ({ id: s.id, name: s.name, level: s.level, description: s.description }))

            return {
              ...support,
              course_points: [...support.course_points, ...newCoursePoints],
            }
          })

          // 如果目标不存在，创建新的支撑
          const hasObjective = row.supports.some((s) => s.objective_id === objectiveId)
          if (!hasObjective) {
            const objective = prev.objectives.find((o) => o.id === objectiveId)
            newSupports.push({
              objective_id: objectiveId,
              objective_index: objective?.index || 0,
              course_points: selections.map((s) => ({ id: s.id, name: s.name, level: s.level, description: s.description })),
            })
          }

          return { ...row, supports: newSupports }
        })

        return { ...prev, rows: newRows }
      })
    },
    [selectionDialog]
  )

  // 移除单元格中的课点
  const handleRemoveCoursePoint = useCallback(
    (chapterId: string, objectiveId: string, coursePointId: string) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        rows: prev.rows.map((row) => {
          if (row.chapter_id !== chapterId) return row
          return {
            ...row,
            supports: row.supports.map((support) => {
              if (support.objective_id !== objectiveId) return support
              return {
                ...support,
                course_points: support.course_points.filter((cp) => cp.id !== coursePointId),
              }
            }),
          }
        }),
      }))
    },
    []
  )

  // 切换课点支撑强度
  const handleToggleCoursePointLevel = useCallback(
    (chapterId: string, objectiveId: string, coursePointId: string) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        rows: prev.rows.map((row) => {
          if (row.chapter_id !== chapterId) return row
          return {
            ...row,
            supports: row.supports.map((support) => {
              if (support.objective_id !== objectiveId) return support
              return {
                ...support,
                course_points: support.course_points.map((cp) => {
                  if (cp.id !== coursePointId) return cp
                  return { ...cp, level: cp.level === "strong" ? "weak" : "strong" }
                }),
              }
            }),
          }
        }),
      }))
    },
    []
  )

  // 保存
  const handleSave = useCallback(() => {
    onSave(localMatrixData)
  }, [localMatrixData, onSave])

  // 计算当前单元格已选中的课点ID
  const selectedCoursePointIds = useMemo(() => {
    const { chapterId, objectiveId } = selectionDialog
    const coursePoints = getCellCoursePoints(chapterId, objectiveId)
    return new Set(coursePoints.map((cp) => cp.id))
  }, [selectionDialog, getCellCoursePoints])

  const availableCoursePointMap = useMemo(() => {
    const map = new Map<string, { name: string; description?: string }>()
    for (const point of availableCoursePoints) {
      map.set(point.id, {
        name: point.name,
        description: point.description,
      })
    }
    return map
  }, [availableCoursePoints])

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-6 py-4 flex-shrink-0 bg-indigo-50 border-b border-indigo-100">
        <h3 className="text-lg font-medium text-indigo-700">
          课程矩阵 - {localMatrixData.course_name}
        </h3>
        <p className="text-sm text-indigo-600 mt-1">
          点击单元格中的加号添加课点，点击课点标签切换支撑强度
        </p>
      </div>

      {/* 矩阵表格 */}
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 border border-gray-200 bg-gray-100 min-w-[150px]">
                章节
              </th>
              {localMatrixData.objectives.map((obj) => (
                <th
                  key={obj.id}
                  className="px-4 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100 min-w-[200px]"
                >
                  <div className="text-indigo-600">目标{obj.index}</div>
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {obj.content}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {localMatrixData.rows.map((row) => (
              <tr key={row.chapter_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-700 border border-gray-200 bg-white font-medium">
                  {row.chapter_index}. {row.chapter_name}
                </td>
                {localMatrixData.objectives.map((obj) => {
                  const coursePoints = getCellCoursePoints(row.chapter_id, obj.id)
                  return (
                    <td
                      key={obj.id}
                      className="px-3 py-3 border border-gray-200 bg-white align-top"
                    >
                      {/* 标签和添加按钮在同一个 flex-wrap 容器内，加号跟随最后一个标签 */}
                      <div className="flex flex-wrap gap-1.5 justify-center items-center">
                        {coursePoints.map((cp) => (
                          // SSE 生成的课程矩阵可能只有 id/name/level，没有 description
                          // 这里从可用课点数据回填 description，确保 SupportLabel tooltip 可展示完整信息
                          <CoursePointTag
                            key={cp.id}
                            item={cp}
                            description={cp.description || availableCoursePointMap.get(cp.id)?.description}
                            onRemove={() =>
                              handleRemoveCoursePoint(row.chapter_id, obj.id, cp.id)
                            }
                            onToggleLevel={() =>
                              handleToggleCoursePointLevel(row.chapter_id, obj.id, cp.id)
                            }
                          />
                        ))}
                        {/* 添加按钮 - 始终跟随在最后一个标签右侧 */}
                        <button
                          onClick={() => handleOpenSelection(row.chapter_id, obj.id)}
                          className="w-6 h-6 flex-shrink-0 rounded-full border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 flex items-center justify-center transition-all group"
                          title="添加课点"
                        >
                          <Plus className="w-3 h-3 text-indigo-400 group-hover:text-indigo-600" />
                        </button>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3 bg-background">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
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

      {/* 课点选择弹窗 */}
      <CoursePointSelectionDialog
        open={selectionDialog.open}
        onOpenChange={(open) => setSelectionDialog((prev) => ({ ...prev, open }))}
        availableCoursePoints={availableCoursePoints}
        selectedIds={selectedCoursePointIds}
        onConfirm={handleAddCoursePoints}
      />
    </div>
  )
}

export default CanvasCourseMatrixEditor
