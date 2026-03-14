"use client"

/**
 * 画布教学目标编辑器组件
 * 用于在抽屉中编辑教学目标列表
 */

import { useState, useCallback } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { ObjectiveCardData } from "./canvas-elements/types"

interface CanvasObjectiveEditorProps {
  // 教学目标列表
  objectives: ObjectiveCardData[]
  // 保存回调
  onSave: (objectives: ObjectiveCardData[]) => void
  // 关闭回调
  onClose: () => void
  // 是否正在保存
  isSaving?: boolean
}

// 内部使用的教学目标数据结构
interface ObjectiveItem {
  id: string
  content: string
  originalId?: number
  supports?: ObjectiveCardData["supports"]
}

// 将 ObjectiveCardData 转换为内部格式
function toObjectiveItem(objective: ObjectiveCardData): ObjectiveItem {
  return {
    id: objective.id,
    content: objective.content,
    originalId: objective.originalId,
    supports: objective.supports,
  }
}

// 将内部格式转换回 ObjectiveCardData
function toObjectiveCardData(item: ObjectiveItem, index: number): ObjectiveCardData {
  return {
    id: item.id,
    index: index + 1,
    content: item.content,
    originalId: item.originalId,
    supports: item.supports,
  }
}

export function CanvasObjectiveEditor({
  objectives,
  onSave,
  onClose,
  isSaving = false,
}: CanvasObjectiveEditorProps) {
  // 转换为内部格式
  const [items, setItems] = useState<ObjectiveItem[]>(() =>
    objectives.length > 0
      ? objectives.map(toObjectiveItem)
      : [{ id: "1", content: "" }]
  )

  // 添加教学目标
  const addObjective = useCallback(() => {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), content: "" },
    ])
  }, [])

  // 删除教学目标
  const removeObjective = useCallback((id: string) => {
    setItems(prev => {
      if (prev.length > 1) {
        return prev.filter(item => item.id !== id)
      }
      return prev
    })
  }, [])

  // 更新教学目标
  const updateObjective = useCallback((id: string, content: string) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, content } : item)))
  }, [])

  // 保存
  const handleSave = useCallback(() => {
    // 过滤空内容的目标，转换为 ObjectiveCardData 格式
    const validObjectives = items
      .filter(item => item.content.trim())
      .map((item, index) => toObjectiveCardData(item, index))
    onSave(validObjectives)
  }, [items, onSave])

  return (
    <div className="flex flex-col h-full">
      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col">
          {/* 标题和添加按钮 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-blue-500" />
              <h3 className="text-base font-semibold text-foreground">教学目标管理</h3>
            </div>
            <Button size="sm" variant="outline" onClick={addObjective} className="gap-2 bg-transparent">
              <Plus className="w-4 h-4" />
              添加教学目标
            </Button>
          </div>
          <div className="border-t border-dashed border-border mb-4" />

          {/* 列表 */}
          <div className="flex-1 overflow-auto space-y-3">
            {items.map((item, index) => (
              <div key={item.id} className="flex gap-3 items-start p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                {/* 序号 */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-sm font-medium text-blue-700">
                  {index + 1}
                </div>
                {/* 内容输入 */}
                <div className="flex-1 min-w-0">
                  <ExpandableTextarea
                    value={item.content}
                    onChange={(value) => updateObjective(item.id, value)}
                    placeholder="请输入教学目标内容，例如：掌握数据结构的基本概念和常用算法"
                    maxLength={500}
                    rows={2}
                    className="w-full"
                    hideCounter
                    disabled={isSaving}
                  />
                </div>
                {/* 删除按钮 */}
                <div className="flex-shrink-0">
                  {items.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeObjective(item.id)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* 空状态提示 */}
            {items.length === 1 && !items[0].content.trim() && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                请添加教学目标，描述学生在完成课程后应达到的学习成果
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-border flex justify-end gap-3">
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
  )
}

export default CanvasObjectiveEditor
