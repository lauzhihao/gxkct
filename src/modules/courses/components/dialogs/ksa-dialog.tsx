/**
 * KSA对话框组件
 * 负责显示和管理KSA支撑关系
 */

import { useEffect, useRef, useState } from "react"
import { Plus, Check, X, Edit, Trash2, Eraser } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Spinner } from "@/shared/components/ui/spinner"
import { cn } from "@/shared/utils/utils"
import { showError } from "@/shared/utils/toast-utils"
import type { KsaItem } from "@/modules/courses/hooks/use-project-matrix"
import type { KsaCellData } from "@/modules/courses/hooks/use-ksa-management"
import { projectMatrixApi } from "@/modules/courses/api/projectMatrixApi"

type KsaTitle = KsaItem["title"]

interface KsaMutationItem {
  id: number
  title: string
  description: string
  level: number
}

type RawKsaListItem = Omit<KsaItem, "title"> & { title: string }

interface NormalizedKsaMutationItem extends KsaMutationItem {
  title: KsaTitle
}

interface KsaSummaryState {
  total: number
  added: number
  duplicate: number
  delta: number
}

const KSA_TITLES: readonly KsaTitle[] = ["K", "S", "A"]
const KSA_TITLE_ORDER: Record<KsaTitle, number> = { K: 0, S: 1, A: 2 }

function isKsaTitle(value: string): value is KsaTitle {
  return KSA_TITLES.includes(value as KsaTitle)
}

function buildKsaNormalizationContext<T extends KsaMutationItem>(items: readonly T[]) {
  const indexedItems = items.map((item, originalIndex) => ({
    ...item,
    originalIndex,
    normalizedTitle: item.title.trim().toUpperCase(),
  }))

  const nextLevelByIndex = new Map<number, number>()

  for (const ksaTitle of KSA_TITLES) {
    const itemsInCategory = indexedItems
      .filter((item) => item.id >= 0 && item.normalizedTitle === ksaTitle)
      .sort((left, right) => {
        if (left.level !== right.level) {
          return left.level - right.level
        }

        const leftIsNewItem = left.id <= 0
        const rightIsNewItem = right.id <= 0
        if (leftIsNewItem !== rightIsNewItem) {
          return leftIsNewItem ? 1 : -1
        }

        if (left.id > 0 && right.id > 0 && left.id !== right.id) {
          return left.id - right.id
        }

        return left.originalIndex - right.originalIndex
      })

    itemsInCategory.forEach((item, index) => {
      nextLevelByIndex.set(item.originalIndex, index + 1)
    })
  }

  return {
    indexedItems,
    nextLevelByIndex,
  }
}

function sortKsaItemsForDisplay<T extends KsaMutationItem>(items: readonly T[]): T[] {
  return items
    .map((item, originalIndex) => ({
      ...item,
      originalIndex,
      normalizedTitle: item.title.trim().toUpperCase(),
    }))
    .sort((left, right) => {
      if (!isKsaTitle(left.normalizedTitle) || !isKsaTitle(right.normalizedTitle)) {
        throw new Error("Invalid KSA title encountered while sorting")
      }

      if (left.normalizedTitle !== right.normalizedTitle) {
        return KSA_TITLE_ORDER[left.normalizedTitle] - KSA_TITLE_ORDER[right.normalizedTitle]
      }

      if (left.level !== right.level) {
        return left.level - right.level
      }

      const leftIsNewItem = left.id <= 0
      const rightIsNewItem = right.id <= 0
      if (leftIsNewItem !== rightIsNewItem) {
        return leftIsNewItem ? 1 : -1
      }

      if (left.id > 0 && right.id > 0 && left.id !== right.id) {
        return left.id - right.id
      }

      return left.originalIndex - right.originalIndex
    })
    .map((sortableItem) => {
      const { originalIndex, normalizedTitle, ...item } = sortableItem
      void originalIndex
      void normalizedTitle
      return item
    })
}

function normalizeKsaMutationItems(items: readonly KsaMutationItem[]): NormalizedKsaMutationItem[] {
  const { indexedItems, nextLevelByIndex } = buildKsaNormalizationContext(items)

  return indexedItems.map(({ originalIndex, normalizedTitle, ...item }) => {
    if (!isKsaTitle(normalizedTitle)) {
      throw new Error(`Invalid KSA title: ${item.title}`)
    }

    if (item.id < 0) {
      return {
        ...item,
        title: normalizedTitle,
      }
    }

    const nextLevel = nextLevelByIndex.get(originalIndex)
    if (nextLevel === undefined) {
      throw new Error(`KSA level normalization failed for index ${originalIndex}`)
    }

    return {
      ...item,
      title: normalizedTitle,
      level: nextLevel,
    }
  })
}

function normalizeKsaListItems(items: readonly RawKsaListItem[]): KsaItem[] {
  const { indexedItems, nextLevelByIndex } = buildKsaNormalizationContext(items)

  const normalizedItems = indexedItems.map(({ originalIndex, normalizedTitle, ...item }) => {
    if (!isKsaTitle(normalizedTitle)) {
      throw new Error(`Invalid KSA title: ${item.title}`)
    }

    if (item.id < 0) {
      return {
        ...item,
        title: normalizedTitle,
      }
    }

    const nextLevel = nextLevelByIndex.get(originalIndex)
    if (nextLevel === undefined) {
      throw new Error(`KSA level normalization failed for index ${originalIndex}`)
    }

    return {
      ...item,
      title: normalizedTitle,
      level: nextLevel,
    }
  })

  return sortKsaItemsForDisplay(normalizedItems)
}

function matchesKsaSearch(item: KsaItem, searchValue: string): boolean {
  const normalizedSearch = searchValue.trim().toLowerCase()
  if (!normalizedSearch) {
    return true
  }

  const displayCode = `${item.title}${item.level}`.toLowerCase()
  const levelText = String(item.level)
  const descriptionText = item.description.trim().toLowerCase()

  return (
    displayCode.startsWith(normalizedSearch) ||
    levelText.startsWith(normalizedSearch) ||
    descriptionText.includes(normalizedSearch)
  )
}

interface KsaDialogProps {
  ksaDialogOpen: boolean
  selectedKsaCell: KsaCellData | null
  selectedKsaSupport: Record<string, "strong" | "weak">
  ksaListData: KsaItem[]
  ksaSearchK: string
  ksaSearchS: string
  ksaSearchA: string
  newRowKsaType: string | null
  newRowDescription: string
  editingKsaId: number | null
  editingDescription: string
  setKsaDialogOpen: (value: boolean) => void
  setKsaSearchK: (value: string) => void
  setKsaSearchS: (value: string) => void
  setKsaSearchA: (value: string) => void
  setNewRowKsaType: (value: string | null) => void
  setNewRowDescription: (value: string) => void
  setEditingKsaId: (value: number | null) => void
  setEditingDescription: (value: string) => void
  setKsaListData: (data: KsaItem[]) => void
  setKsaSupportLevel: (ksaId: number, level: "strong" | "weak") => void
  saveKsaSelection: () => void
  closeKsaDialog: () => void
  courseId?: string
  majorId?: string | number
}

export function KsaDialog({
  ksaDialogOpen,
  selectedKsaCell,
  selectedKsaSupport,
  ksaListData,
  ksaSearchK,
  ksaSearchS,
  ksaSearchA,
  newRowKsaType,
  editingKsaId,
  editingDescription,
  setKsaDialogOpen,
  setKsaSearchK,
  setKsaSearchS,
  setKsaSearchA,
  setEditingKsaId,
  setEditingDescription,
  setKsaListData,
  setKsaSupportLevel,
  saveKsaSelection,
  closeKsaDialog,
  courseId,
  majorId,
}: KsaDialogProps) {
  const normalizedKsaListData = normalizeKsaListItems(ksaListData)

  // Group KSA list data by type
  const knowledgePoints = normalizedKsaListData.filter((ksa) => ksa.title === "K")
  const skillPoints = normalizedKsaListData.filter((ksa) => ksa.title === "S")
  const attitudePoints = normalizedKsaListData.filter((ksa) => ksa.title === "A")

  // Filter by search and sort by level
  const filteredKnowledgePoints = knowledgePoints
    .filter((p) => matchesKsaSearch(p, ksaSearchK))
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level
      }

      return a.id - b.id
    })

  const filteredSkillPoints = skillPoints
    .filter((p) => matchesKsaSearch(p, ksaSearchS))
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level
      }

      return a.id - b.id
    })

  const filteredAttitudePoints = attitudePoints
    .filter((p) => matchesKsaSearch(p, ksaSearchA))
    .sort((a, b) => {
      if (a.level !== b.level) {
        return a.level - b.level
      }

      return a.id - b.id
    })

  // 批量新增状态
  const [batchAddType, setBatchAddType] = useState<KsaTitle | null>(null)
  const [batchAddInput, setBatchAddInput] = useState("")
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [batchSummary, setBatchSummary] = useState<Partial<Record<KsaTitle, KsaSummaryState>>>({})
  const [visibleBatchSummary, setVisibleBatchSummary] = useState<Record<KsaTitle, boolean>>({
    K: false,
    S: false,
    A: false,
  })
  const [clearingKsaType, setClearingKsaType] = useState<KsaTitle | null>(null)
  const [deletingKsaId, setDeletingKsaId] = useState<number | null>(null)
  const batchSummaryTimerRef = useRef<Partial<Record<KsaTitle, ReturnType<typeof setTimeout>>>>({})

  const getNextKsaLevel = (ksaType: KsaTitle) => {
    const sameTypeItems = normalizedKsaListData.filter((item) => item.title === ksaType)
    if (sameTypeItems.length === 0) {
      return 1
    }

    return sameTypeItems[sameTypeItems.length - 1].level + 1
  }

  useEffect(() => {
    const activeTimers = batchSummaryTimerRef.current

    return () => {
      for (const timer of Object.values(activeTimers)) {
        if (timer) {
          clearTimeout(timer)
        }
      }
    }
  }, [])

  const showBatchSummary = (ksaType: KsaTitle) => {
    const activeTimer = batchSummaryTimerRef.current[ksaType]
    if (activeTimer) {
      clearTimeout(activeTimer)
    }

    setVisibleBatchSummary((prev) => ({ ...prev, [ksaType]: true }))
    batchSummaryTimerRef.current[ksaType] = setTimeout(() => {
      setVisibleBatchSummary((prev) => ({ ...prev, [ksaType]: false }))
      delete batchSummaryTimerRef.current[ksaType]
    }, 10000)
  }

  // 批量新增 KSA
  const handleBatchAddKsa = async (ksaType: KsaTitle) => {
    const normalizedItems = batchAddInput
      .split(/[\n;]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "")

    if (normalizedItems.length === 0) {
      setBatchSummary((prev) => ({ ...prev, [ksaType]: { total: 0, added: 0, duplicate: 0, delta: 0 } }))
      showBatchSummary(ksaType)
      return
    }

    // 获取该类型已有项的 description 集合，用于去重
    const existingDescriptions = new Set(
      normalizedKsaListData
        .filter((k) => k.title === ksaType)
        .map((k) => k.description?.trim())
        .filter((d) => d !== "")
    )

    const seenDescriptions = new Set<string>()
    const uniqueNewDescriptions: string[] = []
    for (const desc of normalizedItems) {
      if (seenDescriptions.has(desc) || existingDescriptions.has(desc)) continue
      seenDescriptions.add(desc)
      uniqueNewDescriptions.push(desc)
    }

    const total = normalizedItems.length
    const added = uniqueNewDescriptions.length
    const duplicate = total - added

    if (added === 0) {
      setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added, duplicate, delta: 0 } }))
      showBatchSummary(ksaType)
      setBatchAddInput("")
      setBatchAddType(null)
      return
    }

    const nextLevelStart = getNextKsaLevel(ksaType)

    const payload = [
      ...normalizedKsaListData.map((k) => ({ id: k.id, title: k.title, description: k.description, level: k.level })),
      ...uniqueNewDescriptions.map((desc, index) => ({
        id: 0,
        title: ksaType,
        description: desc,
        // 新增项从当前类别最大编号后续接续，避免保存后重新打开时插入到中间位置。
        level: nextLevelStart + index,
      })),
    ]

    setIsBatchAdding(true)
    try {
      const error = await saveAndReload(payload)
      if (error) {
        showError("批量新增失败: " + error)
        setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added: 0, duplicate: 0, delta: 0 } }))
      } else {
        setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added, duplicate, delta: added } }))
        showBatchSummary(ksaType)
        setBatchAddInput("")
        setBatchAddType(null)
      }
    } finally {
      setIsBatchAdding(false)
    }
  }

  // 保存完整 KSA 列表到后端并重新加载
  const saveAndReload = async (ksas: KsaMutationItem[]) => {
    let normalizedKsas: NormalizedKsaMutationItem[]

    try {
      normalizedKsas = normalizeKsaMutationItems(ksas)
    } catch (error) {
      return error instanceof Error ? error.message : "KSA 编号规范化失败"
    }

    const majorIdText = String(majorId).trim()
    const courseIdText = String(courseId).trim()
    const majorIdNum = Number.parseInt(majorIdText, 10)
    const courseIdNum = Number.parseInt(courseIdText, 10)

    if (!Number.isInteger(majorIdNum) || majorIdNum <= 0) {
      return "缺少有效的 majorId"
    }

    if (!Number.isInteger(courseIdNum) || courseIdNum <= 0) {
      return "缺少有效的 courseId"
    }

    const result = await projectMatrixApi.saveKsaList({
      majorId: majorIdNum,
      courseId: courseIdNum,
      ksas: normalizedKsas,
      upload: false,
    })

    if (result.error) {
      return result.error
    }

    // 保存成功后重新从服务端拉取列表，获取真实 ID
    const listResult = await projectMatrixApi.getKsaList(String(majorIdNum), String(courseIdNum))
    if (listResult.data) {
      const ksaArray = Array.isArray(listResult.data) ? listResult.data : []
      setKsaListData(normalizeKsaListItems(ksaArray))
    }

    return null
  }

  const handleUpdateKsa = async (ksaId: number) => {
    if (!editingDescription) {
      showError("请填写描述")
      return
    }

    // 构建完整列表: 更新目标项的 description
    const payload = normalizedKsaListData.map((k) => ({
      id: k.id,
      title: k.title,
      description: k.id === ksaId ? editingDescription : k.description,
      level: k.level,
    }))

    const error = await saveAndReload(payload)
    if (error) {
      showError("更新失败: " + error)
    } else {
      setEditingKsaId(null)
      setEditingDescription("")
    }
  }

  const handleDeleteKsa = async (ksaId: number) => {
    const targetKsa = normalizedKsaListData.find((item) => item.id === ksaId)
    if (!targetKsa) {
      showError("未找到要删除的KSA项")
      return
    }

    // 构建完整列表: 将被删除项的 id 取负值
    const payload = normalizedKsaListData.map((k) => ({
      id: k.id === ksaId ? -Math.abs(k.id) : k.id,
      title: k.title,
      description: k.description,
      level: k.level,
    }))

    const error = await saveAndReload(payload)
    if (error) {
      showError("删除失败: " + error)
    } else {
      setBatchSummary((prev) => ({ ...prev, [targetKsa.title]: { total: 1, added: 0, duplicate: 0, delta: -1 } }))
      showBatchSummary(targetKsa.title)
    }

    setDeletingKsaId(null)
  }

  const handleClearKsaType = async (ksaType: KsaTitle) => {
    const pointsToClear = normalizedKsaListData.filter((item) => item.title === ksaType)
    const clearCount = pointsToClear.length

    const payload = normalizedKsaListData.map((item) => ({
      id: item.title === ksaType ? -Math.abs(item.id) : item.id,
      title: item.title,
      description: item.description,
      level: item.level,
    }))

    const error = await saveAndReload(payload)
    if (error) {
      showError("清除失败: " + error)
    } else {
      setBatchSummary((prev) => ({ ...prev, [ksaType]: { total: clearCount, added: 0, duplicate: 0, delta: -clearCount } }))
      showBatchSummary(ksaType)
      setClearingKsaType(null)
      if (batchAddType === ksaType) {
        setBatchAddInput("")
        setBatchAddType(null)
      }
    }
  }

  const renderInfoPointList = (
    englishTitle: string,
    chineseTitle: string,
    points: KsaItem[],
    filteredPoints: KsaItem[],
    searchValue: string,
    onSearchChange: (value: string) => void,
    colorClass: string,
    bgClass: string,
    hoverBgClass: string,
    borderClass: string,
    ksaType: KsaTitle
  ) => {
    const summary = visibleBatchSummary[ksaType] ? batchSummary[ksaType] : undefined
    const summaryText = summary ? `${summary.delta >= 0 ? "+" : ""}${summary.delta}` : null

    return (
    <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className={`px-4 py-3 ${bgClass} ${borderClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <h4 className={`text-[1.2rem] font-bold tracking-wide ${colorClass} whitespace-nowrap`}>
              {englishTitle}
            </h4>
            <div
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                borderClass,
                bgClass,
                colorClass
              )}
            >
              {chineseTitle}
            </div>
            <div
              className={cn(
                "rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                borderClass,
                bgClass,
                colorClass
              )}
            >
              {points.length}
            </div>
          </div>
          {summaryText ? (
            <div
              className={cn(
                "max-w-full rounded-none border px-2 py-1 text-xs font-medium whitespace-nowrap text-right",
                borderClass,
                bgClass,
                colorClass
              )}
            >
              {summaryText}
            </div>
          ) : null}
        </div>
      </div>

      {/* Search - Fixed */}
      <div className="px-3 py-2 flex-shrink-0 bg-background flex items-center gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`搜索${chineseTitle}...`}
          disabled={editingKsaId !== null || batchAddType === ksaType}
          className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="relative flex flex-shrink-0 items-center gap-2">
          <button
            onClick={() => {
              setBatchAddType(batchAddType === ksaType ? null : ksaType)
              setBatchAddInput("")
              setClearingKsaType(null)
            }}
            disabled={editingKsaId !== null || isBatchAdding || clearingKsaType !== null}
            className={`h-8 w-8 flex-shrink-0 rounded-md ${bgClass} hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            title="批量新增"
          >
            <Plus className={`mx-auto h-4 w-4 ${colorClass}`} />
          </button>
          <button
            onClick={() => setClearingKsaType(clearingKsaType === ksaType ? null : ksaType)}
            disabled={editingKsaId !== null || isBatchAdding || batchAddType !== null || deletingKsaId !== null}
            className="h-8 w-8 flex-shrink-0 rounded-md bg-red-50 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`清除全部${ksaType}`}
          >
            <Eraser className="mx-auto h-4 w-4 text-red-600" />
          </button>
          {clearingKsaType === ksaType ? (
            <>
              <div className="fixed inset-0 z-[9]" onClick={() => setClearingKsaType(null)} />
              <div className="absolute right-0 top-full z-[12] mt-2 flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-white px-2 py-1 shadow-lg">
                <span className="text-xs text-muted-foreground">确认清除全部{ksaType}?</span>
                <button
                  onClick={() => handleClearKsaType(ksaType)}
                  className="rounded p-0.5 transition-colors hover:bg-red-100"
                >
                  <Check className="h-3.5 w-3.5 text-red-600" />
                </button>
                <button
                  onClick={() => setClearingKsaType(null)}
                  className="rounded p-0.5 transition-colors hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5 text-gray-500" />
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Batch Add Area */}
      {batchAddType === ksaType ? (
        <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 gap-2">
          <Textarea
            value={batchAddInput}
            onChange={(e) => setBatchAddInput(e.target.value)}
            placeholder={`请输入${chineseTitle}描述，每行一个；支持换行符或英文分号分隔。`}
            className="flex-1 resize-none text-xs border-0 shadow-none focus-visible:ring-0 p-0"
            disabled={isBatchAdding}
          />
          <div className="flex items-center justify-end gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setBatchAddInput("")
                setBatchAddType(null)
              }}
              disabled={isBatchAdding}
            >
              返回列表
            </Button>
            <Button
              size="sm"
              onClick={() => handleBatchAddKsa(ksaType)}
              disabled={isBatchAdding || !batchAddInput.trim()}
              >
                {isBatchAdding ? <Spinner className="w-4 h-4" /> : null}
                解析并新增
              </Button>
            </div>
        </div>
      ) : (
      /* List - Scrollable */
      <div className="flex-1 overflow-y-auto min-h-0 bg-background">
        <div className="p-3 space-y-2">
          {/* KSA points */}
          {filteredPoints.length > 0 ? (
            filteredPoints.map((point) => {
              const support = selectedKsaSupport[point.id]
              const isEditing = editingKsaId === point.id

              return (
                <div
                  key={point.id}
                  className={cn(
                    "cursor-pointer p-2 rounded-lg border transition-all duration-200 ease-out hover:scale-[1.015] hover:shadow-md hover:shadow-black/5",
                    isEditing && "border-blue-300 bg-blue-50",
                    !isEditing && support ? `${borderClass} ${bgClass}` : !isEditing && "border-border bg-background"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <textarea
                          value={editingDescription}
                          onChange={(e) => setEditingDescription(e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                          rows={2}
                        />
                      ) : (
                        <>
                          <div className={`text-xs font-medium mb-1 ${colorClass}`}>
                            {point.title}
                            {point.level}
                          </div>
                          <div className="text-sm text-foreground leading-relaxed break-words">{point.description}</div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      {selectedKsaCell?.chapterId === "global" ? (
                        isEditing ? (
                          <div className="flex flex-col gap-1">
                            <button
                              onClick={() => handleUpdateKsa(point.id)}
                              className="p-1 rounded hover:bg-green-200 transition-colors"
                              title="保存"
                            >
                              <Check className="w-4 h-4 text-green-600" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingKsaId(null)
                                setEditingDescription("")
                              }}
                              className="p-1 rounded hover:bg-gray-200 transition-colors"
                              title="取消"
                            >
                              <X className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => {
                                setEditingKsaId(point.id)
                                setEditingDescription(point.description)
                              }}
                              disabled={editingKsaId !== null || newRowKsaType !== null}
                              className={cn(
                                "p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                hoverBgClass
                              )}
                              title="编辑"
                            >
                              <Edit className={cn("w-4 h-4", colorClass)} />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => setDeletingKsaId(point.id)}
                                disabled={editingKsaId !== null || newRowKsaType !== null || deletingKsaId !== null}
                                className="p-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                              {deletingKsaId === point.id && (
                                <>
                                  <div className="fixed inset-0 z-[9]" onClick={() => setDeletingKsaId(null)} />
                                  <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 flex items-center gap-1 bg-white border border-border rounded-md shadow-md px-2 py-1 whitespace-nowrap z-10">
                                  <span className="text-xs text-muted-foreground mr-1">确认删除{point.title}{point.level}?</span>
                                  <button
                                    onClick={() => handleDeleteKsa(point.id)}
                                    className="p-0.5 rounded hover:bg-red-100 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingKsaId(null)}
                                    className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5 text-gray-500" />
                                  </button>
                                </div>
                                </>
                              )}
                            </div>
                          </>
                        )
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setKsaSupportLevel(point.id, "strong")}
                            disabled={editingKsaId !== null || newRowKsaType !== null}
                            className={cn(
                              "px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
                              support === "strong"
                                ? "border-orange-300 bg-orange-100 text-orange-700 font-medium"
                                : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                          >
                            强支撑
                          </button>
                          <button
                            onClick={() => setKsaSupportLevel(point.id, "weak")}
                            disabled={editingKsaId !== null || newRowKsaType !== null}
                            className={cn(
                              "px-2 py-0.5 text-xs rounded border transition-all whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed",
                              support === "weak"
                                ? "border-green-300 bg-green-100 text-green-700 font-medium"
                                : "border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100"
                            )}
                          >
                            弱支撑
                          </button>
                        </div>
                      )}
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
      )}
    </div>
  )
  }

  if (!selectedKsaCell) {
    return null
  }

  return (
    <Dialog open={ksaDialogOpen} onOpenChange={setKsaDialogOpen}>
      <DialogContent className="h-[85vh] flex flex-col" style={{ width: "75vw", maxWidth: "75vw" }}>
        <DialogHeader>
          <DialogTitle>{selectedKsaCell?.chapterId === "global" ? "KSA库管理" : "设置KSA支撑关系"}</DialogTitle>
          <DialogDescription>
            {selectedKsaCell?.chapterId === "global" ? "查看和管理课程的KSA数据" : "选择KSA项目并设置支撑强度"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 space-y-4 py-4 px-4">
          {/* KSA Lists */}
          <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
            {renderInfoPointList(
              "Knowledge",
              "知识",
              knowledgePoints,
              filteredKnowledgePoints,
              ksaSearchK,
              setKsaSearchK,
              "text-blue-700",
              "bg-blue-50",
              "hover:bg-blue-50",
              "border-blue-300",
              "K"
            )}
            {renderInfoPointList(
              "Skills",
              "技能",
              skillPoints,
              filteredSkillPoints,
              ksaSearchS,
              setKsaSearchS,
              "text-green-700",
              "bg-green-50",
              "hover:bg-green-50",
              "border-green-300",
              "S"
            )}
            {renderInfoPointList(
              "Attitude",
              "态度",
              attitudePoints,
              filteredAttitudePoints,
              ksaSearchA,
              setKsaSearchA,
              "text-purple-700",
              "bg-purple-50",
              "hover:bg-purple-50",
              "border-purple-300",
              "A"
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={closeKsaDialog}>
            {selectedKsaCell?.chapterId === "global" ? "关闭" : "取消"}
          </Button>
          {selectedKsaCell?.chapterId !== "global" && <Button onClick={saveKsaSelection}>确认</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
