"use client"

/**
 * 画布项目矩阵编辑器组件
 * 用于在画布中编辑项目矩阵的详细内容
 */

import { useState, useCallback, useMemo, useEffect } from "react"
import { Button } from "@/shared/components/ui/button"
import { Loader2, Plus, Star, X, Settings, Trash2 } from "lucide-react"
import { SupportLabel } from "@/shared/components/support-label"
import type {
  ProjectMatrixData,
  ProjectMatrixRow,
  ProjectMatrixKsaItem,
  ProjectMatrixTaskObjective,
} from "./canvas-elements/types"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/shared/components/ui/tooltip"
import { findKsaByReference } from "@/shared/utils/ksa"

type AvailableKsaItem = {
  id: string
  rawId?: string
  originalId?: number
  name: string
  content: string
  category: "K" | "S" | "A"
  index: number
  description?: string
}

interface CanvasProjectMatrixEditorProps {
  /** 项目矩阵数据 */
  matrixData: ProjectMatrixData
  /** 可用的KSA列表（用于选择） */
  availableKsaItems?: AvailableKsaItem[]
  /** 保存回调 */
  onSave: (matrixData: ProjectMatrixData) => void
  /** 关闭回调 */
  onClose: () => void
  /** 是否正在保存 */
  isSaving?: boolean
}

/**
 * KSA支撑标签组件（编辑模式）
 * 与画布中项目矩阵节点的KsaLabel逻辑一致，额外支持删除和切换支撑强度
 * 通过availableKsaItems查找完整KSA数据，显示序号标签（如 K1, S2, A3）
 */
function KsaTag({
  item,
  availableKsaItems,
  onRemove,
  onToggleLevel,
}: {
  item: ProjectMatrixKsaItem
  availableKsaItems?: AvailableKsaItem[]
  onRemove: () => void
  onToggleLevel: () => void
}) {
  const isStrong = item.level === "strong"

  // 通过id从availableKsaItems中查找完整的KSA数据（与画布节点KsaLabel逻辑一致）
  const fullKsaData = findKsaByReference(availableKsaItems, item.id)

  // 生成序号标签，如 K1, S2, A3
  // 优先级：item自带 → availableKsaItems匹配 → 已有名称
  let label: string
  if (item.category && item.index != null) {
    label = `${item.category}${item.index}`
  } else if (fullKsaData) {
    label = `${fullKsaData.category}${fullKsaData.index}`
  } else if (item.name.trim().length > 0) {
    label = item.name
  } else {
    throw new Error(`KSA item is missing display label: ${item.id}`)
  }

  let tooltipContent: string
  if (
    typeof item.description === "string" &&
    item.description.trim().length > 0
  ) {
    tooltipContent = item.description
  } else if (
    typeof fullKsaData?.description === "string" &&
    fullKsaData.description.trim().length > 0
  ) {
    tooltipContent = fullKsaData.description
  } else if (item.name.trim().length > 0) {
    tooltipContent = item.name
  } else {
    tooltipContent = `${label} - ${isStrong ? "强支撑" : "弱支撑"}`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer transition-transform duration-150 ease-out origin-center hover:scale-[1.2] ${
            isStrong
              ? "bg-orange-100 border border-orange-300 text-orange-700 hover:bg-orange-200"
              : "bg-green-100 border border-green-300 text-green-700 hover:bg-green-200"
          }`}
          onClick={onToggleLevel}
        >
          <Star className={`w-3 h-3 ${isStrong ? "fill-current" : ""}`} />
          <span>{label}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="ml-1 p-0.5 hover:bg-black/10 rounded transition-colors"
            title="移除"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[300px]">
        <div className={`flex items-center gap-1.5 ${isStrong ? "text-orange-700" : "text-green-700"}`}>
          <Star className={`w-3 h-3 flex-shrink-0 ${isStrong ? "fill-current" : ""}`} />
          <span className="min-w-0 leading-relaxed">{tooltipContent}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * 任务目标管理弹窗组件
 */
function TaskObjectivesManageDialog({
  open,
  onOpenChange,
  taskObjectives,
  onUpdate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskObjectives: ProjectMatrixTaskObjective[]
  onUpdate: (objectives: ProjectMatrixTaskObjective[]) => void
}) {
  const [localObjectives, setLocalObjectives] =
    useState<ProjectMatrixTaskObjective[]>(taskObjectives)
  const [taskObjectiveSearch, setTaskObjectiveSearch] = useState("")
  const [deletingObjectiveId, setDeletingObjectiveId] = useState<string | null>(null)

  // 弹窗打开时重置本地状态
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen) {
        setLocalObjectives(taskObjectives)
        setTaskObjectiveSearch("")
        setDeletingObjectiveId(null)
      }
      onOpenChange(isOpen)
    },
    [taskObjectives, onOpenChange]
  )

  // 添加新任务目标
  const handleAdd = useCallback(() => {
    const newId = `obj_${Date.now()}`
    const newIndex = localObjectives.length + 1
    const newObjective: ProjectMatrixTaskObjective = {
      id: newId,
      index: newIndex,
      description: "",
      product: "",
    }
    setLocalObjectives((prev) => [...prev, newObjective])
    setTaskObjectiveSearch("")
  }, [localObjectives.length])

  // 更新任务目标字段
  const handleUpdateField = useCallback((
    id: string,
    field: "description" | "product",
    value: string
  ) => {
    setLocalObjectives((prev) =>
      prev.map((obj) =>
        obj.id === id ? { ...obj, [field]: value } : obj
      )
    )
  }, [])

  // 删除任务目标
  const handleDelete = useCallback((id: string) => {
    setDeletingObjectiveId(null)
    setLocalObjectives((prev) => {
      const filtered = prev.filter((obj) => obj.id !== id)
      // 重新计算索引
      return filtered.map((obj, idx) => ({ ...obj, index: idx + 1 }))
    })
  }, [])

  const filteredObjectives = useMemo(() => {
    if (taskObjectiveSearch.trim().length === 0) {
      return localObjectives
    }

    const searchLower = taskObjectiveSearch.toLowerCase()
    return localObjectives.filter((obj) => {
      const productText = typeof obj.product === "string" ? obj.product : ""
      return (
        obj.description.toLowerCase().includes(searchLower) ||
        productText.toLowerCase().includes(searchLower)
      )
    })
  }, [localObjectives, taskObjectiveSearch])

  // 确认保存
  const handleConfirm = useCallback(() => {
    // 过滤掉空描述的项目
    const validObjectives = localObjectives.filter(
      (obj) => obj.description.trim() !== ""
    )
    // 重新计算索引
    const reindexed = validObjectives.map((obj, idx) => ({
      ...obj,
      index: idx + 1,
    }))
    onUpdate(reindexed)
    onOpenChange(false)
  }, [localObjectives, onUpdate, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>教学任务目标管理</DialogTitle>
        </DialogHeader>

        {/* 顶部操作区 */}
        <div className="flex gap-2 px-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="搜索教学任务目标..."
              value={taskObjectiveSearch}
              onChange={(e) => setTaskObjectiveSearch(e.target.value)}
              className="w-full px-3 pr-9 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            {taskObjectiveSearch && (
              <button
                type="button"
                onClick={() => setTaskObjectiveSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="清空搜索"
                title="清空搜索"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button size="sm" onClick={handleAdd} className="gap-2">
            <Plus className="w-4 h-4" />
            新增
          </Button>
        </div>

        {/* 任务目标列表 */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <h4 className="text-sm font-semibold text-foreground mb-3">教学任务目标</h4>
          {localObjectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              暂无教学任务目标，点击上方&quot;新增&quot;按钮添加
            </div>
          ) : filteredObjectives.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              无匹配结果，请更换关键字
            </div>
          ) : (
            <div className="space-y-2">
              {filteredObjectives.map((obj) => {
                const productText = typeof obj.product === "string" ? obj.product : ""

                return (
                  <div
                    key={obj.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary mt-1">
                      {obj.index}
                    </div>
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">项目任务目标</div>
                        <ExpandableTextarea
                          value={obj.description}
                          onChange={(value) => handleUpdateField(obj.id, "description", value)}
                          placeholder="请输入项目任务目标的内容"
                          maxLength={500}
                          rows={3}
                        />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">学习产出及测量评价标准（可选）</div>
                        <ExpandableTextarea
                          value={productText}
                          onChange={(value) => handleUpdateField(obj.id, "product", value)}
                          placeholder="请输入学习产出及测量评价标准"
                          maxLength={500}
                          rows={3}
                        />
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 mt-1">
                      <Popover
                        open={deletingObjectiveId === obj.id}
                        onOpenChange={(isPopoverOpen) => setDeletingObjectiveId(isPopoverOpen ? obj.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="p-1.5 rounded hover:bg-secondary transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-red-600" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="w-auto p-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-foreground whitespace-nowrap">
                              确认删除{obj.description.trim().length > 0 ? `「${obj.description}」` : "此目标"}？
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDelete(obj.id)}
                              className="p-1.5 rounded hover:bg-red-100 transition-colors"
                              title="确认删除"
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingObjectiveId(null)}
                              className="p-1.5 rounded hover:bg-secondary transition-colors"
                              title="取消"
                            >
                              <X className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 px-6 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确认</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * KSA选择弹窗组件 - 样式与系统KsaDialog保持一致
 */
function KsaSelectionDialog({
  open,
  onOpenChange,
  availableKsaItems,
  currentCellKsaItems,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  availableKsaItems: AvailableKsaItem[]
  // 当前单元格中的KSA数据，用于预选中
  currentCellKsaItems: ProjectMatrixKsaItem[]
  onConfirm: (
    selections: Array<{
      id: string
      name: string
      level: "strong" | "weak"
      description?: string
      category: "K" | "S" | "A"
      index: number
    }>
  ) => void
}) {
  const [localSelections, setLocalSelections] = useState<
    Record<string, "strong" | "weak">
  >({})
  const [searchK, setSearchK] = useState("")
  const [searchS, setSearchS] = useState("")
  const [searchA, setSearchA] = useState("")

  // 使用 useEffect 监听弹窗打开状态和单元格数据变化
  // 解决：点击加号时 selectionDialog 状态更新后，currentCellKsaItems 才会更新
  useEffect(() => {
    if (open) {
      // 弹窗打开时，根据当前单元格已有数据初始化选择状态
      const initialSelections: Record<string, "strong" | "weak"> = {}
      currentCellKsaItems.forEach((item) => {
        const matchedKsa = findKsaByReference(availableKsaItems, item.id)
        const selectionId = matchedKsa ? matchedKsa.id : item.id
        initialSelections[selectionId] = item.level
      })
      setLocalSelections(initialSelections)
      setSearchK("")
      setSearchS("")
      setSearchA("")
    }
  }, [open, currentCellKsaItems, availableKsaItems])

  // 处理弹窗开关
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      onOpenChange(isOpen)
    },
    [onOpenChange]
  )

  // 切换支撑级别：点击选中，再次点击取消选中
  const handleToggleSupport = useCallback((id: string, level: "strong" | "weak") => {
    setLocalSelections((prev) => {
      const current = prev[id]
      const next = { ...prev }
      if (current === level) {
        // 再次点击同一个级别，取消选中
        delete next[id]
      } else {
        // 选中新的级别
        next[id] = level
      }
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const selections = Object.entries(localSelections).map(([id, level]) => {
      const ksa = findKsaByReference(availableKsaItems, id)

      if (ksa) {
        return {
          id: ksa.id,
          name: ksa.name,
          level,
          description: ksa.description,
          // 传递 category 和 index 用于序号标签显示
          category: ksa.category,
          index: ksa.index,
        }
      }

      const currentItem = currentCellKsaItems.find((item) => {
        const matchedKsa = findKsaByReference(availableKsaItems, item.id)
        const selectionId = matchedKsa ? matchedKsa.id : item.id
        return selectionId === id
      })
      if (!currentItem) {
        throw new Error(`KSA item not found: ${id}`)
      }
      if (!currentItem.category || currentItem.index == null) {
        throw new Error(`KSA item is missing category or index: ${id}`)
      }
      if (currentItem.name.trim().length === 0) {
        throw new Error(`KSA item is missing name: ${id}`)
      }

      return {
        id: currentItem.id,
        name: currentItem.name,
        level,
        description: currentItem.description,
        // 传递 category 和 index 用于序号标签显示
        category: currentItem.category,
        index: currentItem.index,
      }
    })
    onConfirm(selections)
    onOpenChange(false)
  }, [
    localSelections,
    availableKsaItems,
    currentCellKsaItems,
    onConfirm,
    onOpenChange,
  ])

  // 按类别分组并过滤（不再过滤已选中的，显示所有可用KSA）
  const groupedKsaItems = useMemo(() => {
    return {
      K: availableKsaItems.filter(
        (k) =>
          k.category === "K" &&
          (!searchK ||
            k.name.toLowerCase().includes(searchK.toLowerCase()) ||
            k.description?.toLowerCase().includes(searchK.toLowerCase()))
      ),
      S: availableKsaItems.filter(
        (k) =>
          k.category === "S" &&
          (!searchS ||
            k.name.toLowerCase().includes(searchS.toLowerCase()) ||
            k.description?.toLowerCase().includes(searchS.toLowerCase()))
      ),
      A: availableKsaItems.filter(
        (k) =>
          k.category === "A" &&
          (!searchA ||
            k.name.toLowerCase().includes(searchA.toLowerCase()) ||
            k.description?.toLowerCase().includes(searchA.toLowerCase()))
      ),
    }
  }, [availableKsaItems, searchK, searchS, searchA])

  // 渲染单个类别列
  const renderKsaColumn = (
    category: "K" | "S" | "A",
    title: string,
    items: typeof availableKsaItems,
    searchValue: string,
    onSearchChange: (v: string) => void,
    colorClass: string,
    bgClass: string,
    borderClass: string
  ) => (
    <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
      {/* 列头 */}
      <div className={`px-4 py-3 ${bgClass} border-b ${borderClass}`}>
        <h4 className={`text-sm font-semibold ${colorClass}`}>
          {title} ({availableKsaItems.filter((k) => k.category === category).length})
        </h4>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-2 flex-shrink-0 bg-background">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`搜索${title.split("（")[0]}...`}
          className="w-full px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* 列表 */}
      <div className="flex-1 overflow-y-auto min-h-0 bg-background">
        <div className="p-3 space-y-2">
          {items.length > 0 ? (
            items.map((ksa) => {
              const support = localSelections[ksa.id]
              return (
                <div
                  key={ksa.id}
                  className={`p-2 rounded-lg border transition-all ${
                    support
                      ? `${borderClass} ${bgClass}`
                      : "border-border bg-background"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {/* 序号标签（如 K1, S2, A3） */}
                      <div className={`text-xs font-medium mb-1 ${colorClass}`}>
                        {ksa.category}{ksa.index}
                      </div>
                      {/* 显示完整描述内容 */}
                      {ksa.description && (
                        <div className="text-sm text-foreground leading-relaxed break-words">
                          {ksa.description}
                        </div>
                      )}
                    </div>
                    {/* 强支撑和弱支撑按钮，配色与KSA标签一致 */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleToggleSupport(ksa.id, "strong")}
                        className={`px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap ${
                          support === "strong"
                            ? "border-orange-300 bg-orange-100 text-orange-700 font-medium"
                            : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                        title="强支撑"
                      >
                        强支撑
                      </button>
                      <button
                        onClick={() => handleToggleSupport(ksa.id, "weak")}
                        className={`px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap ${
                          support === "weak"
                            ? "border-green-300 bg-green-100 text-green-700 font-medium"
                            : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                        }`}
                        title="弱支撑"
                      >
                        弱支撑
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {searchValue ? "无匹配结果" : "暂无KSA数据"}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="h-[85vh] flex flex-col"
        style={{ width: "75vw", maxWidth: "75vw" }}
      >
        <DialogHeader>
          <DialogTitle>设置KSA支撑关系</DialogTitle>
        </DialogHeader>

        {availableKsaItems.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">暂无KSA数据</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 py-4 px-4">
            {/* 三列布局 */}
            <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
              {renderKsaColumn(
                "K",
                "知识（Knowledge）",
                groupedKsaItems.K,
                searchK,
                setSearchK,
                "text-amber-700",
                "bg-amber-100",
                "border-amber-200"
              )}
              {renderKsaColumn(
                "S",
                "技能（Skills）",
                groupedKsaItems.S,
                searchS,
                setSearchS,
                "text-cyan-700",
                "bg-cyan-100",
                "border-cyan-200"
              )}
              {renderKsaColumn(
                "A",
                "态度（Attitude）",
                groupedKsaItems.A,
                searchA,
                setSearchA,
                "text-rose-700",
                "bg-rose-100",
                "border-rose-200"
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleConfirm}>确认</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * 画布项目矩阵编辑器组件
 */
export function CanvasProjectMatrixEditor({
  matrixData,
  availableKsaItems = [],
  onSave,
  onClose,
  isSaving = false,
}: CanvasProjectMatrixEditorProps) {
  // 本地编辑状态
  const [localMatrixData, setLocalMatrixData] =
    useState<ProjectMatrixData>(matrixData)

  // KSA选择弹窗状态
  const [selectionDialog, setSelectionDialog] = useState<{
    open: boolean
    coursePointId: string
    taskObjectiveId: string
  }>({
    open: false,
    coursePointId: "",
    taskObjectiveId: "",
  })

  // 任务目标管理弹窗状态
  const [taskObjectivesDialogOpen, setTaskObjectivesDialogOpen] = useState(false)

  // 获取单元格的KSA列表
  const getCellKsaItems = useCallback(
    (
      coursePointId: string,
      taskObjectiveId: string
    ): ProjectMatrixKsaItem[] => {
      const row = localMatrixData.rows.find(
        (r) => r.course_point_id === coursePointId
      )
      if (!row) return []
      const support = row.objective_supports?.find(
        (s) => s.task_objective_id === taskObjectiveId
      )
      if (!support) {
        return []
      }
      return support.ksa_items
    },
    [localMatrixData]
  )

  // 打开KSA选择弹窗
  const handleOpenSelection = useCallback(
    (coursePointId: string, taskObjectiveId: string) => {
      setSelectionDialog({
        open: true,
        coursePointId,
        taskObjectiveId,
      })
    },
    []
  )

  // 设置单元格的KSA数据（替换模式，而非追加）
  const handleSetKsaItems = useCallback(
    (
      selections: Array<{
        id: string
        name: string
        level: "strong" | "weak"
        description?: string
        category: "K" | "S" | "A"
        index: number
      }>
    ) => {
      const { coursePointId, taskObjectiveId } = selectionDialog
      setLocalMatrixData((prev) => {
        const newRows = prev.rows.map((row) => {
          if (row.course_point_id !== coursePointId) return row

          const existingSupports = row.objective_supports
          const supportIndex = existingSupports.findIndex(
            (s) => s.task_objective_id === taskObjectiveId
          )

          // 将选择转换为KSA项目，包含 category 和 index 用于序号标签显示
          const ksaItems = selections.map((s) => ({
            id: s.id,
            name: s.name,
            level: s.level,
            description: s.description,
            category: s.category,
            index: s.index,
          }))

          if (supportIndex >= 0) {
            // 替换现有支撑的KSA数据
            const newSupports = [...existingSupports]
            newSupports[supportIndex] = {
              ...newSupports[supportIndex],
              ksa_items: ksaItems,
            }
            return { ...row, objective_supports: newSupports }
          } else if (selections.length > 0) {
            // 仅当有选择时才创建新支撑
            return {
              ...row,
              objective_supports: [
                ...existingSupports,
                {
                  task_objective_id: taskObjectiveId,
                  ksa_items: ksaItems,
                },
              ],
            }
          }
          return row
        })
        return { ...prev, rows: newRows }
      })
    },
    [selectionDialog]
  )

  // 移除单元格中的KSA
  const handleRemoveKsaItem = useCallback(
    (coursePointId: string, taskObjectiveId: string, ksaId: string) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        rows: prev.rows.map((row) => {
          if (row.course_point_id !== coursePointId) return row
          return {
            ...row,
            objective_supports: row.objective_supports.map((support) => {
              if (support.task_objective_id !== taskObjectiveId) return support
              return {
                ...support,
                ksa_items: support.ksa_items.filter((k) => k.id !== ksaId),
              }
            }),
          }
        }),
      }))
    },
    []
  )

  // 切换KSA支撑强度
  const handleToggleKsaLevel = useCallback(
    (coursePointId: string, taskObjectiveId: string, ksaId: string) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        rows: prev.rows.map((row) => {
          if (row.course_point_id !== coursePointId) return row
          return {
            ...row,
            objective_supports: row.objective_supports.map((support) => {
              if (support.task_objective_id !== taskObjectiveId) return support
              return {
                ...support,
                ksa_items: support.ksa_items.map((k) => {
                  if (k.id !== ksaId) return k
                  return {
                    ...k,
                    level: k.level === "strong" ? "weak" : "strong",
                  }
                }),
              }
            }),
          }
        }),
      }))
    },
    []
  )

  // 更新行字段
  const handleUpdateRowField = useCallback(
    (
      coursePointId: string,
      field: keyof ProjectMatrixRow,
      value: string | number
    ) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        rows: prev.rows.map((row) => {
          if (row.course_point_id !== coursePointId) return row
          return { ...row, [field]: value }
        }),
      }))
    },
    []
  )

  const handleUpdateNonNegativeNumberField = useCallback(
    (
      coursePointId: string,
      field: "theory_hours" | "practice_hours",
      inputValue: string
    ) => {
      if (inputValue.trim() === "") {
        return
      }

      const parsedValue = Number(inputValue)
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return
      }

      handleUpdateRowField(coursePointId, field, parsedValue)
    },
    [handleUpdateRowField]
  )

  const handleUpdateOptionalWeek = useCallback(
    (coursePointId: string, inputValue: string) => {
      if (inputValue.trim() === "") {
        return
      }

      const parsedValue = Number.parseInt(inputValue, 10)
      if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return
      }

      handleUpdateRowField(coursePointId, "week", parsedValue)
    },
    [handleUpdateRowField]
  )

  // 更新任务目标
  const handleUpdateTaskObjectives = useCallback(
    (objectives: ProjectMatrixTaskObjective[]) => {
      setLocalMatrixData((prev) => ({
        ...prev,
        task_objectives: objectives,
      }))
    },
    []
  )

  // 保存
  const handleSave = useCallback(() => {
    onSave(localMatrixData)
  }, [localMatrixData, onSave])

  // 获取当前单元格的KSA数据
  const currentCellKsaItems = useMemo(() => {
    const { coursePointId, taskObjectiveId } = selectionDialog
    return getCellKsaItems(coursePointId, taskObjectiveId)
  }, [selectionDialog, getCellKsaItems])

  const taskObjectives = localMatrixData.task_objectives
  const matrixTableMinWidth =
    120 + taskObjectives.length * 140 + 100 + 120 + 160 + 70 + 70 + 70

  return (
    <div className="flex flex-col h-full">
      {/* 标题栏 */}
      <div className="px-6 py-4 flex-shrink-0 bg-teal-50 border-b border-teal-100">
        <h3 className="text-lg font-medium text-teal-700">
          第{localMatrixData.chapter_index}章 项目矩阵 -{" "}
          {localMatrixData.chapter_name}
        </h3>
        <p className="text-sm text-teal-600 mt-1">
          点击单元格中的加号添加KSA支撑，点击标签切换支撑强度，可直接编辑文本字段
        </p>
      </div>

      {/* 矩阵表格 */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-max p-4">
          <table
            className="min-w-full border-collapse text-sm table-fixed"
            style={{ minWidth: `${matrixTableMinWidth}px` }}
          >
            <colgroup>
              <col className="w-[120px]" />
              {taskObjectives.map((obj) => (
                <col key={`task-objective-column-${obj.id}`} className="w-[140px]" />
              ))}
              <col className="w-[100px]" />
              <col className="w-[120px]" />
              <col className="w-[160px]" />
              <col className="w-[70px]" />
              <col className="w-[70px]" />
              <col className="w-[70px]" />
            </colgroup>
            <thead className="bg-gray-100">
              <tr>
                {/* 课点列 */}
                <th className="sticky top-0 z-20 px-3 py-3 text-left font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  课点
                </th>
                {/* 动态任务目标列 */}
                {taskObjectives.map((obj) => (
                  <th
                    key={obj.id}
                    className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100"
                  >
                    <div className="text-teal-600 text-xs leading-tight line-clamp-2">
                      {obj.description}
                    </div>
                  </th>
                ))}
                {/* 固定列 */}
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  学法
                </th>
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  教法
                </th>
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  学习产出
                </th>
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  周次
                </th>
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  理论
                </th>
                <th className="sticky top-0 z-20 px-3 py-3 text-center font-medium text-gray-600 border border-gray-200 bg-gray-100">
                  实践
                </th>
              </tr>
            </thead>
            <tbody>
              {localMatrixData.rows.map((row) => (
                <tr key={row.course_point_id} className="hover:bg-gray-50">
                  {/* 课点名称 */}
                  <td className="px-3 py-3 text-gray-700 border border-gray-200 bg-white font-medium">
                    <SupportLabel
                      title={row.course_point_name}
                      desc={row.course_point_description}
                      type="strong"
                      size="sm"
                      tipsPosition="right"
                    />
                  </td>
                  {/* 任务目标交叉单元格 */}
                  {taskObjectives.map((obj) => {
                    const ksaItems = getCellKsaItems(row.course_point_id, obj.id)
                    return (
                      <td
                        key={obj.id}
                        className="px-2 py-2 border border-gray-200 bg-white align-middle"
                      >
                        <div className="flex flex-wrap gap-1.5 justify-center items-center">
                          {ksaItems.map((ksa) => (
                            <KsaTag
                              key={ksa.id}
                              item={ksa}
                              availableKsaItems={availableKsaItems}
                              onRemove={() =>
                                handleRemoveKsaItem(
                                  row.course_point_id,
                                  obj.id,
                                  ksa.id
                                )
                              }
                              onToggleLevel={() =>
                                handleToggleKsaLevel(
                                  row.course_point_id,
                                  obj.id,
                                  ksa.id
                                )
                              }
                            />
                          ))}
                          <button
                            onClick={() =>
                              handleOpenSelection(row.course_point_id, obj.id)
                            }
                            className="w-6 h-6 flex-shrink-0 rounded-full border-2 border-dashed border-teal-300 hover:border-teal-500 hover:bg-teal-50 flex items-center justify-center transition-all group"
                            title="添加KSA"
                          >
                            <Plus className="w-3 h-3 text-teal-400 group-hover:text-teal-600" />
                          </button>
                        </div>
                      </td>
                    )
                  })}
                  {/* 学法 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white align-top">
                    <ExpandableTextarea
                      value={
                        typeof row.learning_method === "string"
                          ? row.learning_method
                          : ""
                      }
                      onChange={(value) =>
                        handleUpdateRowField(
                          row.course_point_id,
                          "learning_method",
                          value
                        )
                      }
                      placeholder="输入学法"
                      rows={1}
                      maxLength={200}
                    />
                  </td>
                  {/* 教法 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white align-top">
                    <ExpandableTextarea
                      value={
                        typeof row.teaching_method === "string"
                          ? row.teaching_method
                          : ""
                      }
                      onChange={(value) =>
                        handleUpdateRowField(
                          row.course_point_id,
                          "teaching_method",
                          value
                        )
                      }
                      placeholder="输入教法"
                      rows={1}
                      maxLength={200}
                    />
                  </td>
                  {/* 学习产出 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white align-top">
                    <ExpandableTextarea
                      value={
                        typeof row.learning_output === "string"
                          ? row.learning_output
                          : ""
                      }
                      onChange={(value) =>
                        handleUpdateRowField(
                          row.course_point_id,
                          "learning_output",
                          value
                        )
                      }
                      placeholder="输入学习产出"
                      rows={2}
                      maxLength={500}
                    />
                  </td>
                  {/* 周次 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white">
                    <input
                      type="number"
                      value={typeof row.week === "number" ? row.week : ""}
                      onChange={(e) =>
                        handleUpdateOptionalWeek(
                          row.course_point_id,
                          e.target.value
                        )
                      }
                      className="w-full px-1 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 text-center"
                      placeholder="周"
                    />
                  </td>
                  {/* 理论学时 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={
                        typeof row.theory_hours === "number"
                          ? row.theory_hours
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdateNonNegativeNumberField(
                          row.course_point_id,
                          "theory_hours",
                          e.target.value
                        )
                      }
                      className="w-full px-1 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 text-center"
                      placeholder="学时"
                    />
                  </td>
                  {/* 实践学时 */}
                  <td className="px-2 py-2 border border-gray-200 bg-white">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={
                        typeof row.practice_hours === "number"
                          ? row.practice_hours
                          : ""
                      }
                      onChange={(e) =>
                        handleUpdateNonNegativeNumberField(
                          row.course_point_id,
                          "practice_hours",
                          e.target.value
                        )
                      }
                      className="w-full px-1 py-1 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-teal-500/50 text-center"
                      placeholder="学时"
                    />
                  </td>
                </tr>
              ))}
              <tr className="bg-teal-50/60 font-medium">
                <td className="px-3 py-4 text-left align-top text-gray-700 border border-gray-200 bg-teal-50">
                  <span>教学目标的学习产出</span>
                  <br />
                  <span>及测量评价标准</span>
                </td>
                {taskObjectives.map((obj) => {
                  const productText =
                    typeof obj.product === "string" ? obj.product : ""

                  return (
                    <td
                      key={`task-objective-product-${obj.id}`}
                      className="px-3 py-4 text-left align-top text-gray-700 border border-gray-200 bg-teal-50/60"
                    >
                      <div className="whitespace-normal break-words leading-relaxed [overflow-wrap:anywhere]">
                        {productText}
                      </div>
                    </td>
                  )
                })}
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
                <td className="px-3 py-4 border border-gray-200 bg-teal-50/60" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-between bg-background">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTaskObjectivesDialogOpen(true)}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          任务目标
        </Button>
        <div className="flex gap-3">
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
      </div>

      {/* KSA选择弹窗 */}
      <KsaSelectionDialog
        open={selectionDialog.open}
        onOpenChange={(open) =>
          setSelectionDialog((prev) => ({ ...prev, open }))
        }
        availableKsaItems={availableKsaItems}
        currentCellKsaItems={currentCellKsaItems}
        onConfirm={handleSetKsaItems}
      />

      {/* 任务目标管理弹窗 */}
      <TaskObjectivesManageDialog
        open={taskObjectivesDialogOpen}
        onOpenChange={setTaskObjectivesDialogOpen}
        taskObjectives={taskObjectives}
        onUpdate={handleUpdateTaskObjectives}
      />
    </div>
  )
}

export default CanvasProjectMatrixEditor
