"use client"

/**
 * 画布章节编辑器组件
 * 复用自 AddCourseForm 中的章节编辑逻辑和样式
 */

import { useState, useCallback, useMemo } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ExpandableTextarea } from "@/shared/components/ui/expandable-textarea"
import type { ChapterCardData } from "./canvas-elements/types"

interface CanvasChapterEditorProps {
  // 章节列表
  chapters: ChapterCardData[]
  // 保存回调
  onSave: (chapters: ChapterCardData[]) => void
  // 关闭回调
  onClose: () => void
  // 是否正在保存
  isSaving?: boolean
}

// 内部使用的章节数据结构（与 AddCourseForm 保持一致）
interface ChapterProject {
  id: string
  name: string
  theoryHours: number
  practiceHours: number
}

// 将 ChapterCardData 转换为内部格式
function toChapterProject(chapter: ChapterCardData): ChapterProject {
  return {
    id: chapter.id,
    name: chapter.name,
    theoryHours: chapter.theory_hours || 0,
    practiceHours: chapter.practice_hours || 0,
  }
}

// 将内部格式转换回 ChapterCardData
function toChapterCardData(chapter: ChapterProject, index: number): ChapterCardData {
  return {
    id: chapter.id,
    index: index + 1,
    name: chapter.name,
    theory_hours: chapter.theoryHours,
    practice_hours: chapter.practiceHours,
  }
}

export function CanvasChapterEditor({
  chapters,
  onSave,
  onClose,
  isSaving = false,
}: CanvasChapterEditorProps) {
  // 转换为内部格式
  const [items, setItems] = useState<ChapterProject[]>(() =>
    chapters.length > 0
      ? chapters.map(toChapterProject)
      : [{ id: "1", name: "", theoryHours: 0, practiceHours: 0 }]
  )

  // 添加章节
  const addChapter = useCallback(() => {
    setItems(prev => [
      ...prev,
      { id: Date.now().toString(), name: "", theoryHours: 0, practiceHours: 0 },
    ])
  }, [])

  // 删除章节
  const removeChapter = useCallback((id: string) => {
    setItems(prev => {
      if (prev.length > 1) {
        return prev.filter(ch => ch.id !== id)
      }
      return prev
    })
  }, [])

  // 更新章节
  const updateChapter = useCallback((id: string, field: keyof ChapterProject, value: string | number) => {
    setItems(prev => prev.map(ch => (ch.id === id ? { ...ch, [field]: value } : ch)))
  }, [])

  // 计算合计学时
  const totalTheoryHours = useMemo(() => items.reduce((sum, ch) => sum + (ch.theoryHours || 0), 0), [items])
  const totalPracticeHours = useMemo(() => items.reduce((sum, ch) => sum + (ch.practiceHours || 0), 0), [items])

  // 保存
  const handleSave = useCallback(() => {
    // 过滤空名称的章节，转换为 ChapterCardData 格式
    const validChapters = items
      .filter(ch => ch.name.trim())
      .map((ch, index) => toChapterCardData(ch, index))
    onSave(validChapters)
  }, [items, onSave])

  return (
    <div className="flex flex-col h-full">
      {/* 编辑区域 */}
      <div className="flex-1 overflow-hidden p-6">
        <div className="h-full flex flex-col">
          {/* 标题和添加按钮 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-sm bg-purple-500" />
              <h3 className="text-base font-semibold text-foreground">章节项目管理</h3>
            </div>
            <Button size="sm" variant="outline" onClick={addChapter} className="gap-2 bg-transparent">
              <Plus className="w-4 h-4" />
              添加章节/项目
            </Button>
          </div>
          <div className="border-t border-dashed border-border mb-4" />

          {/* 表格 */}
          <div className="flex-1 overflow-auto rounded-lg border border-border">
            <table className="w-full">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border w-16">
                    序号
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border">
                    名称
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border w-24">
                    理论学时
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-r border-border w-24">
                    实践学时
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground w-16">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((chapter, index) => (
                  <tr key={chapter.id} className="border-t border-border hover:bg-secondary/30">
                    <td className="px-4 py-3 text-sm text-foreground border-r border-border">{index + 1}</td>
                    <td className="px-4 py-3 border-r border-border">
                      <ExpandableTextarea
                        placeholder="例如：第一章 数据结构基础"
                        value={chapter.name}
                        onChange={(value) => updateChapter(chapter.id, "name", value)}
                        className="text-sm"
                        rows={2}
                        hideCounter
                        disabled={isSaving}
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-border">
                      <Input
                        type="number"
                        min="0"
                        value={chapter.theoryHours}
                        onChange={(e) =>
                          updateChapter(chapter.id, "theoryHours", Number.parseInt(e.target.value) || 0)
                        }
                        className="h-9"
                      />
                    </td>
                    <td className="px-4 py-3 border-r border-border">
                      <Input
                        type="number"
                        min="0"
                        value={chapter.practiceHours}
                        onChange={(e) =>
                          updateChapter(chapter.id, "practiceHours", Number.parseInt(e.target.value) || 0)
                        }
                        className="h-9"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {items.length > 1 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeChapter(chapter.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-primary/30 bg-primary/5">
                  <td
                    colSpan={2}
                    className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border"
                  >
                    合计
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                    {totalTheoryHours} 学时
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-foreground border-r border-border">
                    {totalPracticeHours} 学时
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
              </tbody>
            </table>
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

export default CanvasChapterEditor
