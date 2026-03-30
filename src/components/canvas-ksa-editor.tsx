"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Brain, Wrench, Heart, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
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

// KSA 类别配置
const KSA_CONFIG = {
  K: {
    label: "知识（Knowledge）",
    icon: Brain,
    colorClass: "text-amber-700",
    bgClass: "bg-amber-50",
    borderClass: "border-amber-300",
  },
  S: {
    label: "技能（Skills）",
    icon: Wrench,
    colorClass: "text-cyan-700",
    bgClass: "bg-cyan-50",
    borderClass: "border-cyan-300",
  },
  A: {
    label: "态度（Attitude）",
    icon: Heart,
    colorClass: "text-rose-700",
    bgClass: "bg-rose-50",
    borderClass: "border-rose-300",
  },
} as const

type KsaCategory = keyof typeof KSA_CONFIG

/**
 * 画布 KSA 编辑器组件
 * 直接编辑模式，无需点击行内编辑按钮
 */
export function CanvasKsaEditor({
  ksaItems,
  onSave,
  onClose,
  isSaving = false,
}: CanvasKsaEditorProps) {
  // 编辑中的条目列表
  const [items, setItems] = useState<KsaItemData[]>(() => [...ksaItems])

  // 按类别分组
  const groupedItems = {
    K: items.filter(item => item.category === "K").sort((a, b) => a.index - b.index),
    S: items.filter(item => item.category === "S").sort((a, b) => a.index - b.index),
    A: items.filter(item => item.category === "A").sort((a, b) => a.index - b.index),
  }

  // 生成新的 ID
  const generateId = useCallback(() => {
    return `ksa_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  }, [])

  // 添加新条目
  const handleAdd = useCallback((category: KsaCategory) => {
    const categoryItems = items.filter(item => item.category === category)
    const maxIndex = categoryItems.reduce((max, item) => Math.max(max, item.index), 0)

    const newItem: KsaItemData = {
      id: generateId(),
      category,
      index: maxIndex + 1,
      content: "",
    }

    setItems(prev => [...prev, newItem])
  }, [items, generateId])

  // 更新条目内容
  const handleUpdateContent = useCallback((id: string, content: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, content } : item
    ))
  }, [])

  // 删除条目
  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  // 保存全部
  const handleSaveAll = useCallback(() => {
    // 过滤空内容，重新计算每个类别的 index
    const reindexedItems: KsaItemData[] = []

    for (const category of ["K", "S", "A"] as KsaCategory[]) {
      const categoryItems = items
        .filter(item => item.category === category && item.content.trim())
        .sort((a, b) => a.index - b.index)

      categoryItems.forEach((item, idx) => {
        reindexedItems.push({
          ...item,
          content: item.content.trim(),
          index: idx + 1,
        })
      })
    }

    onSave(reindexedItems)
  }, [items, onSave])

  // 渲染单个类别的列表
  const renderCategoryList = (category: KsaCategory) => {
    const config = KSA_CONFIG[category]
    const Icon = config.icon
    const categoryItems = groupedItems[category]

    return (
      <div className="flex-1 flex flex-col min-h-0 border rounded-lg shadow-sm overflow-hidden">
        {/* 列头 */}
        <div className={`px-4 py-3 ${config.bgClass} ${config.borderClass} border-b`}>
          <div className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${config.colorClass}`} />
            <h4 className={`text-sm font-semibold ${config.colorClass}`}>
              {config.label} ({categoryItems.length})
            </h4>
          </div>
        </div>

        {/* 添加按钮区 */}
        <div className="px-3 py-2 flex-shrink-0 bg-background border-b">
          <button
            onClick={() => handleAdd(category)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            <Plus className="w-4 h-4" />
            <span>添加{config.label.split("（")[0]}</span>
          </button>
        </div>

        {/* 列表内容 */}
        <div className="flex-1 overflow-y-auto min-h-0 bg-background">
          <div className="p-3 space-y-2">
            {categoryItems.length > 0 ? (
              categoryItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-2 rounded-lg border ${config.borderClass} ${config.bgClass}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs font-medium mb-1 ${config.colorClass}`}>
                        {item.category}{item.index}
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
                      className="p-1 rounded hover:bg-red-200 transition-colors flex-shrink-0"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无{config.label.split("（")[0]}数据
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* 编辑区域 - 三列布局 */}
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid grid-cols-3 gap-4 h-full">
          {renderCategoryList("K")}
          {renderCategoryList("S")}
          {renderCategoryList("A")}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3">
        <Button variant="outline" onClick={onClose} disabled={isSaving}>
          取消
        </Button>
        <Button onClick={handleSaveAll} disabled={isSaving}>
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

export default CanvasKsaEditor
