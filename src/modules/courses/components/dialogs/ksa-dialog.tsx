/**
 * KSA对话框组件
 * 负责显示和管理KSA支撑关系
 */

import { useState } from "react"
import { Plus, Check, X, Edit, Trash2 } from "lucide-react"
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

const KSA_TITLES: readonly KsaTitle[] = ["K", "S", "A"]

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

        if (left.id !== right.id) {
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
  if (!selectedKsaCell) return null

  const normalizedKsaListData = normalizeKsaListItems(ksaListData)

  // Group KSA list data by type
  const knowledgePoints = normalizedKsaListData.filter((ksa) => ksa.title === "K")
  const skillPoints = normalizedKsaListData.filter((ksa) => ksa.title === "S")
  const attitudePoints = normalizedKsaListData.filter((ksa) => ksa.title === "A")

  // Filter by search and sort by level
  const filteredKnowledgePoints = knowledgePoints
    .filter(
      (p) =>
        !ksaSearchK ||
        p.id?.toString().includes(ksaSearchK) ||
        p.description?.toLowerCase().includes(ksaSearchK.toLowerCase())
    )
    .sort((a, b) => a.level - b.level)

  const filteredSkillPoints = skillPoints
    .filter(
      (p) =>
        !ksaSearchS ||
        p.id?.toString().includes(ksaSearchS) ||
        p.description?.toLowerCase().includes(ksaSearchS.toLowerCase())
    )
    .sort((a, b) => a.level - b.level)

  const filteredAttitudePoints = attitudePoints
    .filter(
      (p) =>
        !ksaSearchA ||
        p.id?.toString().includes(ksaSearchA) ||
        p.description?.toLowerCase().includes(ksaSearchA.toLowerCase())
    )
    .sort((a, b) => a.level - b.level)

  // 批量新增状态
  const [batchAddType, setBatchAddType] = useState<KsaTitle | null>(null)
  const [batchAddInput, setBatchAddInput] = useState("")
  const [isBatchAdding, setIsBatchAdding] = useState(false)
  const [batchSummary, setBatchSummary] = useState<Record<string, { total: number; added: number; duplicate: number }>>({})
  const [deletingKsaId, setDeletingKsaId] = useState<number | null>(null)
  const KSA_TYPE_LABEL: Record<string, string> = { K: "K点", S: "S点", A: "A点" }

  // 批量新增 KSA
  const handleBatchAddKsa = async (ksaType: KsaTitle) => {
    const normalizedItems = batchAddInput
      .split(/[\n;]+/)
      .map((item) => item.trim())
      .filter((item) => item !== "")

    if (normalizedItems.length === 0) {
      setBatchSummary((prev) => ({ ...prev, [ksaType]: { total: 0, added: 0, duplicate: 0 } }))
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
      setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added, duplicate } }))
      setBatchAddInput("")
      setBatchAddType(null)
      return
    }

    const payload = [
      ...normalizedKsaListData.map((k) => ({ id: k.id, title: k.title, description: k.description, level: k.level })),
      ...uniqueNewDescriptions.map((desc, index) => ({
        id: 0,
        title: ksaType,
        description: desc,
        // level 在 saveAndReload 中统一按类别重排，避免批量新增后出现重复编号。
        level: index + 1,
      })),
    ]

    setIsBatchAdding(true)
    try {
      const error = await saveAndReload(payload)
      if (error) {
        showError("批量新增失败: " + error)
        setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added: 0, duplicate: 0 } }))
      } else {
        setBatchSummary((prev) => ({ ...prev, [ksaType]: { total, added, duplicate } }))
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
    }

    setDeletingKsaId(null)
  }

  const renderInfoPointList = (
    title: string,
    points: KsaItem[],
    filteredPoints: KsaItem[],
    searchValue: string,
    onSearchChange: (value: string) => void,
    colorClass: string,
    bgClass: string,
    borderClass: string,
    ksaType: KsaTitle
  ) => (
    <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className={`px-4 py-3 ${bgClass} ${borderClass}`}>
        <h4 className={`text-sm font-semibold ${colorClass}`}>
          {title} ({points.length})
        </h4>
      </div>

      {/* Search - Fixed */}
      <div className="px-3 py-2 flex-shrink-0 bg-background flex items-center gap-2">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`搜索${title.split("（")[0]}...`}
          disabled={editingKsaId !== null || batchAddType === ksaType}
          className="flex-1 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <button
          onClick={() => {
            setBatchAddType(batchAddType === ksaType ? null : ksaType)
            setBatchAddInput("")
          }}
          disabled={editingKsaId !== null || isBatchAdding}
          className={`flex-shrink-0 p-1.5 rounded-md ${bgClass} hover:opacity-80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          title="批量新增"
        >
          <Plus className={`w-4 h-4 ${colorClass}`} />
        </button>
      </div>

      {/* Batch Add Area */}
      {batchAddType === ksaType ? (
        <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 gap-2">
          <Textarea
            value={batchAddInput}
            onChange={(e) => setBatchAddInput(e.target.value)}
            placeholder={`请输入${title.split("（")[0]}描述，每行一个；支持换行符或英文分号分隔。`}
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
                    "p-2 rounded-lg border transition-all",
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
                              className="p-1 rounded hover:bg-blue-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="编辑"
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
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
      {/* Batch summary */}
      {batchSummary[ksaType] && (
        <div className={`px-3 py-2 text-xs flex-shrink-0 border-t ${batchSummary[ksaType].added > 0 ? "text-green-600" : "text-muted-foreground"}`}>
          已解析{batchSummary[ksaType].added}个有效{KSA_TYPE_LABEL[ksaType] || "项"}
          {batchSummary[ksaType].duplicate > 0 && `，${batchSummary[ksaType].duplicate}个重复已跳过`}
        </div>
      )}
    </div>
  )

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
              "知识（Knowledge）",
              knowledgePoints,
              filteredKnowledgePoints,
              ksaSearchK,
              setKsaSearchK,
              "text-blue-700",
              "bg-blue-50",
              "border-blue-300",
              "K"
            )}
            {renderInfoPointList(
              "技能（Skills）",
              skillPoints,
              filteredSkillPoints,
              ksaSearchS,
              setKsaSearchS,
              "text-green-700",
              "bg-green-50",
              "border-green-300",
              "S"
            )}
            {renderInfoPointList(
              "态度（Attitude）",
              attitudePoints,
              filteredAttitudePoints,
              ksaSearchA,
              setKsaSearchA,
              "text-purple-700",
              "bg-purple-50",
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
