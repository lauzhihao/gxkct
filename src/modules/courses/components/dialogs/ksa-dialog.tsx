/**
 * KSA对话框组件
 * 负责显示和管理KSA支撑关系
 */

import { useEffect, useRef, useState } from "react"
import { Plus, Check, X, Trash2, Eraser, Sparkles } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { Spinner } from "@/shared/components/ui/spinner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip"
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

interface KsaDraftItem {
  rowKey: string
  id: number
  title: KsaTitle
  level: number
  description: string
  initialDescription: string
  isTemporary: boolean
}

interface IconTooltipButtonProps {
  label: string
  children: React.ReactNode
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
    .map((sortableItem): T => {
      const { originalIndex, normalizedTitle, ...item } = sortableItem
      void originalIndex
      void normalizedTitle
      // [MOD] TS 无法对带泛型的 Omit 收敛回 T，这里显式断言（运行时形状一致）
      return item as unknown as T
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

function matchesKsaSearch(item: Pick<KsaItem, "title" | "level" | "description">, searchValue: string): boolean {
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

function IconTooltipButton({ label, children }: IconTooltipButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top">{label}</TooltipContent>
    </Tooltip>
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
  setKsaDialogOpen: (value: boolean) => void
  setKsaSearchK: (value: string) => void
  setKsaSearchS: (value: string) => void
  setKsaSearchA: (value: string) => void
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
  setKsaDialogOpen,
  setKsaSearchK,
  setKsaSearchS,
  setKsaSearchA,
  setKsaListData,
  setKsaSupportLevel,
  saveKsaSelection,
  closeKsaDialog,
  courseId,
  majorId,
}: KsaDialogProps) {
  const normalizedKsaListData = normalizeKsaListItems(ksaListData)
  const [draftRows, setDraftRows] = useState<KsaDraftItem[]>([])
  const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
  const [pendingFocusRowKey, setPendingFocusRowKey] = useState<string | null>(null)

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
  const [deletingKsaId, setDeletingKsaId] = useState<string | null>(null)
  const batchSummaryTimerRef = useRef<Partial<Record<KsaTitle, ReturnType<typeof setTimeout>>>>({})
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const tempRowCounterRef = useRef(0)

  const createDraftRows = (items: readonly KsaItem[]): KsaDraftItem[] =>
    items.map((item) => ({
      rowKey: `existing-${item.id}`,
      id: item.id,
      title: item.title,
      level: item.level,
      description: item.description,
      initialDescription: item.description,
      isTemporary: false,
    }))

  const renumberDraftRows = (items: readonly KsaDraftItem[]): KsaDraftItem[] => {
    const nextLevelByTitle: Record<KsaTitle, number> = { K: 1, S: 1, A: 1 }

    return items.map((item) => ({
      ...item,
      level: nextLevelByTitle[item.title]++,
    }))
  }

  // Group KSA list data by type
  const knowledgePoints = draftRows.filter((ksa) => ksa.title === "K")
  const skillPoints = draftRows.filter((ksa) => ksa.title === "S")
  const attitudePoints = draftRows.filter((ksa) => ksa.title === "A")

  // Filter by search and sort by level
  const filteredKnowledgePoints = knowledgePoints.filter((p) => matchesKsaSearch(p, ksaSearchK))
  const filteredSkillPoints = skillPoints.filter((p) => matchesKsaSearch(p, ksaSearchS))
  const filteredAttitudePoints = attitudePoints.filter((p) => matchesKsaSearch(p, ksaSearchA))

  const getNextKsaLevel = (ksaType: KsaTitle) => {
    const sameTypeItems = normalizedKsaListData.filter((item) => item.title === ksaType)
    if (sameTypeItems.length === 0) {
      return 1
    }

    return sameTypeItems[sameTypeItems.length - 1].level + 1
  }

  useEffect(() => {
    if (!ksaDialogOpen) {
      setDraftRows([])
      setFocusedRowKey(null)
      setPendingFocusRowKey(null)
      return
    }

    setDraftRows(createDraftRows(normalizeKsaListItems(ksaListData)))
    setFocusedRowKey(null)
    setPendingFocusRowKey(null)
  }, [ksaDialogOpen, ksaListData])

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

  useEffect(() => {
    if (!pendingFocusRowKey) {
      return
    }

    const nextInput = inputRefs.current[pendingFocusRowKey]
    if (nextInput) {
      nextInput.focus()
      setFocusedRowKey(pendingFocusRowKey)
      setPendingFocusRowKey(null)
    }
  }, [draftRows, pendingFocusRowKey])

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

  const updateDraftRowDescription = (rowKey: string, description: string) => {
    setDraftRows((prev) =>
      prev.map((item) =>
        item.rowKey === rowKey
          ? {
              ...item,
              description,
            }
          : item
      )
    )
  }

  const revertDraftRow = (rowKey: string) => {
    setDraftRows((prev) => {
      const targetRow = prev.find((item) => item.rowKey === rowKey)
      if (!targetRow) {
        return prev
      }

      if (targetRow.isTemporary) {
        return renumberDraftRows(prev.filter((item) => item.rowKey !== rowKey))
      }

      return prev.map((item) =>
        item.rowKey === rowKey
          ? {
              ...item,
              description: item.initialDescription,
            }
          : item
      )
    })
  }

  const focusDraftRow = (rowKey: string) => {
    if (focusedRowKey && focusedRowKey !== rowKey) {
      revertDraftRow(focusedRowKey)
    }

    setFocusedRowKey(rowKey)
    setPendingFocusRowKey(rowKey)
  }

  const clearFocusedDraftRow = (rowKey: string) => {
    if (focusedRowKey !== rowKey) {
      return
    }

    const targetRow = draftRows.find((item) => item.rowKey === rowKey)
    if (targetRow && hasDraftChanged(targetRow)) {
      revertDraftRow(rowKey)
    }

    setFocusedRowKey(null)
  }

  const insertDraftRowBelow = (rowKey: string, ksaType: KsaTitle) => {
    const tempRowKey = `temp-${ksaType}-${tempRowCounterRef.current++}`

    setDraftRows((prev) => {
      const targetIndex = prev.findIndex((item) => item.rowKey === rowKey)
      if (targetIndex < 0) {
        return prev
      }

      const nextRows = [...prev]
      nextRows.splice(targetIndex + 1, 0, {
        rowKey: tempRowKey,
        id: 0,
        title: ksaType,
        level: 0,
        description: "",
        initialDescription: "",
        isTemporary: true,
      })

      return renumberDraftRows(nextRows)
    })

    setPendingFocusRowKey(tempRowKey)
  }

  const hasDraftChanged = (item: KsaDraftItem) => item.description !== item.initialDescription

  const canSaveDraft = (item: KsaDraftItem) => item.description.trim() !== "" && hasDraftChanged(item)

  const handleSaveDraftRow = async (rowKey: string) => {
    const targetRow = draftRows.find((item) => item.rowKey === rowKey)
    if (!targetRow) {
      showError("未找到要保存的KSA项")
      return
    }

    if (!canSaveDraft(targetRow)) {
      return
    }

    let payload: KsaMutationItem[]

    if (targetRow.isTemporary) {
      const rowsToPersist = renumberDraftRows(
        draftRows.filter((item) => !item.isTemporary || item.rowKey === rowKey)
      )

      payload = rowsToPersist.map((item) => ({
        id: item.isTemporary ? 0 : item.id,
        title: item.title,
        description: item.rowKey === rowKey ? item.description : item.initialDescription,
        level: item.level,
      }))
    } else {
      payload = normalizedKsaListData.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.id === targetRow.id ? targetRow.description : item.description,
        level: item.level,
      }))
    }

    const error = await saveAndReload(payload)
    if (error) {
      showError("保存失败: " + error)
      return
    }

    setBatchSummary((prev) => ({
      ...prev,
      [targetRow.title]: {
        total: 1,
        added: targetRow.isTemporary ? 1 : 0,
        duplicate: 0,
        delta: targetRow.isTemporary ? 1 : 0,
      },
    }))
    showBatchSummary(targetRow.title)
  }

  const handleDeleteKsa = async (rowKey: string) => {
    const targetKsa = draftRows.find((item) => item.rowKey === rowKey)
    if (!targetKsa) {
      showError("未找到要删除的KSA项")
      return
    }

    if (targetKsa.isTemporary) {
      setDraftRows((prev) => renumberDraftRows(prev.filter((item) => item.rowKey !== rowKey)))
      if (focusedRowKey === rowKey) {
        setFocusedRowKey(null)
      }
      setDeletingKsaId(null)
      return
    }

    // 构建完整列表: 将被删除项的 id 取负值
    const payload = normalizedKsaListData.map((k) => ({
      id: k.id === targetKsa.id ? -Math.abs(k.id) : k.id,
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
    points: KsaDraftItem[],
    filteredPoints: KsaDraftItem[],
    searchValue: string,
    onSearchChange: (value: string) => void,
    colorClass: string,
    bgClass: string,
    hoverBgClass: string,
    borderClass: string,
    ringClass: string,
    ksaType: KsaTitle
  ) => {
    const summary = visibleBatchSummary[ksaType] ? batchSummary[ksaType] : undefined
    const summaryText = summary ? `${summary.delta >= 0 ? "+" : ""}${summary.delta}` : null

    return (
    <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
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
          disabled={batchAddType === ksaType}
          className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="relative flex flex-shrink-0 items-center gap-2">
          <IconTooltipButton label="智能解析">
            <button
              onClick={() => {
                setBatchAddType(batchAddType === ksaType ? null : ksaType)
                setBatchAddInput("")
                setClearingKsaType(null)
              }}
              disabled={isBatchAdding || clearingKsaType !== null}
              className={`h-8 w-8 flex-shrink-0 rounded-md ${bgClass} transition-all duration-200 ease-out hover:scale-[1.04] hover:shadow-sm hover:shadow-black/5 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <Sparkles className={`mx-auto h-4 w-4 ${colorClass}`} />
            </button>
          </IconTooltipButton>
          <IconTooltipButton label={`清除全部${ksaType}`}>
            <button
              onClick={() => setClearingKsaType(clearingKsaType === ksaType ? null : ksaType)}
              disabled={isBatchAdding || batchAddType !== null || deletingKsaId !== null}
              className="h-8 w-8 flex-shrink-0 rounded-md bg-red-50 transition-colors hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Eraser className="mx-auto h-4 w-4 text-red-600" />
            </button>
          </IconTooltipButton>
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
        <div className="p-3 space-y-2.5">
          {/* KSA points */}
          {filteredPoints.length > 0 ? (
            filteredPoints.map((point) => {
              const support = selectedKsaSupport[point.id]
              const isGlobalMode = selectedKsaCell?.chapterId === "global"
              const isFocused = focusedRowKey === point.rowKey
              const isSaveDisabled = !canSaveDraft(point)

              return (
                <div
                  key={point.rowKey}
                  onClick={() => {
                    if (isGlobalMode) {
                      focusDraftRow(point.rowKey)
                    }
                  }}
                  className={cn(
                    "cursor-pointer rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 transition-all duration-200 ease-out hover:scale-[1.015] hover:shadow-md hover:shadow-black/5",
                    isFocused && isGlobalMode && `${borderClass} ${bgClass} ring-2 ring-offset-0 ${ringClass}`,
                    !isFocused && support ? `${bgClass} ring-1 ${borderClass}` : !isFocused && "ring-1 ring-transparent"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      {isGlobalMode ? (
                        <>
                          <div className={`text-xs font-medium mb-1 ${colorClass}`}>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-all",
                                isFocused
                                  ? `${colorClass} shadow-sm ring-1 ${bgClass} border-current`
                                  : "border-border/70 bg-white/80 text-slate-600"
                              )}
                            >
                              {point.title}
                              {point.level}
                            </span>
                          </div>
                          <div className="relative min-h-8">
                            {isFocused ? (
                              <input
                                ref={(element) => {
                                  inputRefs.current[point.rowKey] = element
                                }}
                                type="text"
                                value={point.description}
                                onChange={(e) => updateDraftRowDescription(point.rowKey, e.target.value)}
                                onFocus={() => setFocusedRowKey(point.rowKey)}
                                onBlur={() => {
                                  clearFocusedDraftRow(point.rowKey)
                                }}
                                className="w-full rounded-lg border border-transparent bg-white/65 px-2 py-1 pr-10 text-sm text-foreground outline-none ring-0"
                              />
                            ) : (
                              <div className="px-2 py-1 text-sm text-foreground leading-relaxed break-words">
                                {point.description}
                              </div>
                            )}
                            {isFocused ? (
                              <IconTooltipButton label="保存">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleSaveDraftRow(point.rowKey)
                                  }}
                                  onMouseDown={(event) => event.preventDefault()}
                                  disabled={isSaveDisabled}
                                  className={cn(
                                    "absolute right-1 top-1/2 -translate-y-1/2 rounded-md border p-1 transition-colors",
                                    isSaveDisabled
                                      ? "border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed"
                                      : "border-green-500 bg-white text-green-600 shadow-sm hover:border-green-600 hover:bg-green-50"
                                  )}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              </IconTooltipButton>
                            ) : null}
                          </div>
                        </>
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
                      {isGlobalMode ? (
                        <>
                          <IconTooltipButton label="在下方新增">
                            <button
                              onClick={(event) => {
                                event.stopPropagation()
                                insertDraftRowBelow(point.rowKey, point.title)
                              }}
                              disabled={batchAddType !== null || deletingKsaId !== null || clearingKsaType !== null}
                              className={cn(
                                "p-1 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                hoverBgClass
                              )}
                            >
                              <Plus className={cn("w-4 h-4", colorClass)} />
                            </button>
                          </IconTooltipButton>
                          <div className="relative">
                            <IconTooltipButton label="删除">
                              <button
                                onClick={(event) => {
                                  event.stopPropagation()
                                  setDeletingKsaId(point.rowKey)
                                }}
                                disabled={batchAddType !== null || deletingKsaId !== null || clearingKsaType !== null}
                                className="p-1 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </button>
                            </IconTooltipButton>
                            {deletingKsaId === point.rowKey && (
                              <>
                                <div className="fixed inset-0 z-[9]" onClick={() => setDeletingKsaId(null)} />
                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-1 flex items-center gap-1 bg-white border border-border rounded-md shadow-md px-2 py-1 whitespace-nowrap z-10">
                                  <span className="text-xs text-muted-foreground mr-1">确认删除{point.title}{point.level}?</span>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDeleteKsa(point.rowKey)
                                    }}
                                    className="p-0.5 rounded hover:bg-red-100 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-red-600" />
                                  </button>
                                  <button
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      setDeletingKsaId(null)
                                    }}
                                    className="p-0.5 rounded hover:bg-gray-100 transition-colors"
                                  >
                                    <X className="w-3.5 h-3.5 text-gray-500" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => setKsaSupportLevel(point.id, "strong")}
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
    <TooltipProvider delayDuration={0}>
      <Dialog open={ksaDialogOpen} onOpenChange={setKsaDialogOpen}>
        <DialogContent className="h-[85vh] flex flex-col" style={{ width: "75vw", maxWidth: "75vw" }}>
        <DialogHeader>
          <DialogTitle>KSA管理</DialogTitle>
          <DialogDescription>点击下方卡片可以编辑KSA，您也可以通过智能解析进行批量新增</DialogDescription>
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
              "ring-blue-700",
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
              "ring-green-700",
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
              "ring-purple-700",
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
    </TooltipProvider>
  )
}
