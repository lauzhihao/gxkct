"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Brain, Check, Heart, Loader2, Plus, Search, Sparkles, Trash2, Wrench } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import { cn } from "@/shared/utils/utils"
import type { KsaItemData } from "./canvas-elements/types"

interface CanvasKsaEditorProps {
  // KSA 条目列表
  ksaItems: KsaItemData[]
  // 保存回调
  onSave: (ksaItems: KsaItemData[]) => void
  // 关闭回调
  onClose: () => void
  // 是否正在保存
  isSaving?: boolean
}

interface FooterMessage {
  text: string
  tone: "default" | "error"
}

// KSA 类别配置，与课程矩阵 KSA 管理弹窗保持一致
const KSA_CONFIG = {
  K: {
    englishTitle: "Knowledge",
    chineseTitle: "知识",
    icon: Brain,
    colorClass: "text-blue-700",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-300",
    hoverBgClass: "hover:bg-blue-50",
    ringClass: "ring-blue-700",
  },
  S: {
    englishTitle: "Skills",
    chineseTitle: "技能",
    icon: Wrench,
    colorClass: "text-green-700",
    bgClass: "bg-green-50",
    borderClass: "border-green-300",
    hoverBgClass: "hover:bg-green-50",
    ringClass: "ring-green-700",
  },
  A: {
    englishTitle: "Attitude",
    chineseTitle: "态度",
    icon: Heart,
    colorClass: "text-purple-700",
    bgClass: "bg-purple-50",
    borderClass: "border-purple-300",
    hoverBgClass: "hover:bg-purple-50",
    ringClass: "ring-purple-700",
  },
} as const

type KsaCategory = keyof typeof KSA_CONFIG

const KSA_CATEGORIES: KsaCategory[] = ["K", "S", "A"]

function parseBatchKsaInput(input: string): string[] {
  return input
    .split(/[\n;；]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

function reindexKsaItems(items: KsaItemData[]): KsaItemData[] {
  const reindexedItems: KsaItemData[] = []

  for (const category of KSA_CATEGORIES) {
    const categoryItems = items
      .filter((item) => item.category === category && item.content.trim())
      .sort((a, b) => a.index - b.index)

    categoryItems.forEach((item, index) => {
      reindexedItems.push({
        ...item,
        content: item.content.trim(),
        index: index + 1,
      })
    })
  }

  return reindexedItems
}

function reindexKsaItemsForDisplay(items: KsaItemData[]): KsaItemData[] {
  const reindexedItems: KsaItemData[] = []

  for (const category of KSA_CATEGORIES) {
    const categoryItems = items
      .filter((item) => item.category === category)
      .sort((a, b) => a.index - b.index)

    categoryItems.forEach((item, index) => {
      reindexedItems.push({
        ...item,
        index: index + 1,
      })
    })
  }

  return reindexedItems
}

/**
 * 画布 KSA 编辑器组件
 * 仅在画布内临时暂存，不调用课程矩阵页面的接口保存逻辑。
 */
export function CanvasKsaEditor({
  ksaItems,
  onSave,
  onClose,
  isSaving = false,
}: CanvasKsaEditorProps) {
  const [items, setItems] = useState<KsaItemData[]>(() => [...ksaItems])
  const [searchByCategory, setSearchByCategory] = useState<Record<KsaCategory, string>>({
    K: "",
    S: "",
    A: "",
  })
  const [batchAddType, setBatchAddType] = useState<KsaCategory | null>(null)
  const [batchAddInput, setBatchAddInput] = useState("")
  const [footerMessage, setFooterMessage] = useState<FooterMessage | null>(null)

  useEffect(() => {
    setItems([...ksaItems])
    setSearchByCategory({ K: "", S: "", A: "" })
    setBatchAddType(null)
    setBatchAddInput("")
    setFooterMessage(null)
  }, [ksaItems])

  const groupedItems = useMemo(() => ({
    K: items.filter((item) => item.category === "K").sort((a, b) => a.index - b.index),
    S: items.filter((item) => item.category === "S").sort((a, b) => a.index - b.index),
    A: items.filter((item) => item.category === "A").sort((a, b) => a.index - b.index),
  }), [items])

  const filteredGroupedItems = useMemo(() => {
    return KSA_CATEGORIES.reduce((acc, category) => {
      const keyword = searchByCategory[category].trim().toLowerCase()
      acc[category] = keyword
        ? groupedItems[category].filter((item) => item.content.toLowerCase().includes(keyword))
        : groupedItems[category]
      return acc
    }, {} as Record<KsaCategory, KsaItemData[]>)
  }, [groupedItems, searchByCategory])

  const generateId = useCallback(() => {
    return `ksa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }, [])

  const handleSearchChange = useCallback((category: KsaCategory, value: string) => {
    setSearchByCategory((prev) => ({
      ...prev,
      [category]: value,
    }))
  }, [])

  const handleAdd = useCallback((category: KsaCategory) => {
    const categoryItems = items.filter((item) => item.category === category)
    const maxIndex = categoryItems.reduce((max, item) => Math.max(max, item.index), 0)

    const newItem: KsaItemData = {
      id: generateId(),
      category,
      index: maxIndex + 1,
      content: "",
    }

    setBatchAddType(null)
    setBatchAddInput("")
    setItems((prev) => [...prev, newItem])
    setFooterMessage({ text: `已新增 ${category}${maxIndex + 1}，点击暂存到画布后生效。`, tone: "default" })
  }, [generateId, items])

  const handleUpdateContent = useCallback((id: string, content: string) => {
    setItems((prev) => prev.map((item) => (
      item.id === id ? { ...item, content } : item
    )))
  }, [])

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => reindexKsaItemsForDisplay(prev.filter((item) => item.id !== id)))
    setFooterMessage({ text: "已删除 KSA，点击暂存到画布后生效。", tone: "default" })
  }, [])

  const handleBatchAdd = useCallback((category: KsaCategory) => {
    const parsedItems = parseBatchKsaInput(batchAddInput)

    if (parsedItems.length === 0) {
      setFooterMessage({ text: "请输入需要新增的 KSA 内容。", tone: "error" })
      return
    }

    const existingContents = new Set(
      items
        .filter((item) => item.category === category)
        .map((item) => item.content.trim().toLowerCase())
        .filter(Boolean)
    )
    const seenContents = new Set<string>()
    const contentsToAdd = parsedItems.filter((content) => {
      const normalizedContent = content.toLowerCase()

      if (existingContents.has(normalizedContent) || seenContents.has(normalizedContent)) {
        return false
      }

      seenContents.add(normalizedContent)
      return true
    })

    if (contentsToAdd.length === 0) {
      setFooterMessage({
        text: `本次共解析 ${parsedItems.length} 条 ${category}，新增 0 条，重复 ${parsedItems.length} 条。`,
        tone: "error",
      })
      return
    }

    const categoryItems = items.filter((item) => item.category === category)
    const maxIndex = categoryItems.reduce((max, item) => Math.max(max, item.index), 0)
    const newItems = contentsToAdd.map((content, index) => ({
      id: generateId(),
      category,
      index: maxIndex + index + 1,
      content,
    }))

    setItems((prev) => [...prev, ...newItems])
    setBatchAddInput("")
    setBatchAddType(null)
    setFooterMessage({
      text: `本次共解析 ${parsedItems.length} 条 ${category}，新增 ${contentsToAdd.length} 条，重复 ${parsedItems.length - contentsToAdd.length} 条。`,
      tone: "default",
    })
  }, [batchAddInput, generateId, items])

  const handleSaveAll = useCallback(() => {
    onSave(reindexKsaItems(items))
  }, [items, onSave])

  const renderCategoryList = (category: KsaCategory) => {
    const config = KSA_CONFIG[category]
    const Icon = config.icon
    const categoryItems = groupedItems[category]
    const filteredItems = filteredGroupedItems[category]
    const isBatchAddingCurrentCategory = batchAddType === category

    return (
      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-border/60 bg-white shadow-sm overflow-hidden">
        <div className={cn("px-4 py-3 border-b", config.bgClass, config.borderClass)}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <Icon className={cn("h-4 w-4 flex-shrink-0", config.colorClass)} />
              <h4 className={cn("text-[1.05rem] font-bold tracking-wide whitespace-nowrap", config.colorClass)}>
                {config.englishTitle}
              </h4>
              <div className={cn("rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", config.borderClass, config.bgClass, config.colorClass)}>
                {config.chineseTitle}
              </div>
              <div className={cn("rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", config.borderClass, config.bgClass, config.colorClass)}>
                {categoryItems.length}
              </div>
            </div>
          </div>
        </div>

        <div className="px-3 py-2 flex-shrink-0 bg-background flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchByCategory[category]}
              onChange={(event) => handleSearchChange(category, event.target.value)}
              placeholder={`搜索${config.chineseTitle}...`}
              disabled={batchAddType !== null}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => handleAdd(category)}
            disabled={isSaving || batchAddType !== null}
            title={`新增${config.chineseTitle}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => {
              setBatchAddType(isBatchAddingCurrentCategory ? null : category)
              setBatchAddInput("")
              setFooterMessage(null)
            }}
            disabled={isSaving || (batchAddType !== null && !isBatchAddingCurrentCategory)}
            title="批量新增"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>

        {isBatchAddingCurrentCategory ? (
          <div className="flex-1 flex flex-col min-h-0 px-3 pb-3 gap-2">
            <Textarea
              value={batchAddInput}
              onChange={(event) => setBatchAddInput(event.target.value)}
              placeholder={`请输入${config.chineseTitle}描述，每行一个；支持换行符、英文分号或中文分号分隔。`}
              className="flex-1 resize-none text-xs"
              disabled={isSaving}
            />
            <div className="flex items-center justify-end gap-2 flex-shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBatchAddInput("")
                  setBatchAddType(null)
                }}
                disabled={isSaving}
              >
                返回列表
              </Button>
              <Button
                size="sm"
                onClick={() => handleBatchAdd(category)}
                disabled={isSaving || !batchAddInput.trim()}
              >
                解析并新增
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto min-h-0 bg-background">
            <div className="p-3 space-y-2.5">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-xl border border-transparent bg-slate-50/80 px-3 py-2.5 transition-all duration-200 ease-out hover:scale-[1.015] hover:shadow-md hover:shadow-black/5",
                      "ring-1 ring-transparent",
                      config.hoverBgClass
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="mb-1">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold", config.colorClass, config.borderClass, config.bgClass)}>
                            {item.category}
                            {item.index}
                          </span>
                        </div>
                        <ExpandableTextarea
                          value={item.content}
                          onChange={(value) => handleUpdateContent(item.id, value)}
                          placeholder="输入内容描述..."
                          className="w-full px-2 py-1 text-sm"
                          rows={2}
                          autoResize
                          hideCounter
                          disabled={isSaving}
                        />
                      </div>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isSaving}
                        className="p-1 rounded hover:bg-red-100 transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  {searchByCategory[category] ? "无匹配结果" : `暂无${config.chineseTitle}数据`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-3 gap-3 h-full">
          {renderCategoryList("K")}
          {renderCategoryList("S")}
          {renderCategoryList("A")}
        </div>
      </div>

      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-primary" />
          <span>保存后仅暂存到当前画布</span>
        </div>
        <div className="flex-1 px-4 text-center text-sm">
          {footerMessage ? (
            <span className={footerMessage.tone === "error" ? "text-destructive" : "text-primary"}>
              {footerMessage.text}
            </span>
          ) : null}
        </div>
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSaveAll} disabled={isSaving || batchAddType !== null}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            "暂存到画布"
          )}
        </Button>
      </div>
    </div>
  )
}

export default CanvasKsaEditor
