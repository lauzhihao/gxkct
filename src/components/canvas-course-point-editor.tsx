"use client"

/**
 * 画布课点编辑器组件
 * 直接编辑模式，无需点击行内编辑按钮
 */

import { useState, useMemo, useCallback } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Loader2, Plus, Search, Trash2 } from "lucide-react"
import type { CoursePointCardData } from "./canvas-elements/types"

interface CanvasCoursePointEditorProps {
  /** 课点列表数据 */
  coursePoints: CoursePointCardData[]
  /** 保存回调 */
  onSave: (coursePoints: CoursePointCardData[]) => void
  /** 关闭回调 */
  onClose: () => void
  /** 是否正在保存 */
  isSaving?: boolean
}

/**
 * 画布课点编辑器组件
 * 用于在画布中编辑课点面板内的课点列表
 */
export function CanvasCoursePointEditor({
  coursePoints,
  onSave,
  onClose,
  isSaving = false,
}: CanvasCoursePointEditorProps) {
  // 本地编辑状态
  const [localCoursePoints, setLocalCoursePoints] = useState<CoursePointCardData[]>(
    coursePoints.length > 0
      ? coursePoints
      : [{ id: "1", index: 1, name: "", content: "" }]
  )
  const [searchKeyword, setSearchKeyword] = useState("")

  // 过滤后的课点列表
  const filteredCoursePoints = useMemo(() => {
    if (!searchKeyword.trim()) return localCoursePoints
    const keyword = searchKeyword.toLowerCase()
    return localCoursePoints.filter(
      (cp) =>
        (cp.name || "").toLowerCase().includes(keyword) ||
        (cp.content || "").toLowerCase().includes(keyword) ||
        (typeof cp.description === 'string' && cp.description.toLowerCase().includes(keyword))
    )
  }, [localCoursePoints, searchKeyword])

  // 生成唯一 ID
  const generateId = useCallback(() => {
    return `cp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
  }, [])

  // 添加新课点
  const handleAddNew = useCallback(() => {
    const newItem: CoursePointCardData = {
      id: generateId(),
      index: localCoursePoints.length + 1,
      name: "",
      content: "",
    }
    setLocalCoursePoints((prev) => [...prev, newItem])
  }, [generateId, localCoursePoints.length])

  // 更新课点字段
  const handleUpdateField = useCallback((id: string, field: keyof CoursePointCardData, value: string | number) => {
    setLocalCoursePoints((prev) =>
      prev.map((cp) => (cp.id === id ? { ...cp, [field]: value } : cp))
    )
  }, [])

  // 删除课点
  const handleDelete = useCallback((id: string) => {
    setLocalCoursePoints((prev) => {
      if (prev.length > 1) {
        return prev.filter((cp) => cp.id !== id)
      }
      return prev
    })
  }, [])

  // 保存并关闭
  const handleSave = useCallback(() => {
    // 过滤空内容，重新计算索引
    const validPoints = localCoursePoints
      .filter((cp) => (cp.name || cp.content || "").trim())
      .map((cp, idx) => ({
        ...cp,
        name: (cp.name || "").trim(),
        content: (cp.content || "").trim(),
        description: typeof cp.description === 'string' ? cp.description.trim() : undefined,
        index: idx + 1,
      }))
    onSave(validPoints)
  }, [localCoursePoints, onSave])

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
            {filteredCoursePoints.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无课点数据
              </div>
            ) : (
              <table className="w-full">
                <tbody>
                  {filteredCoursePoints.map((coursePoint, index) => (
                    <tr
                      key={coursePoint.id}
                      className="border-b border-border hover:bg-secondary/20 transition-colors"
                    >
                      <td className="px-4 py-3 text-center text-sm font-medium text-green-600 w-16">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 w-[200px]">
                        <Input
                          type="text"
                          value={coursePoint.content}
                          onChange={(e) => handleUpdateField(coursePoint.id, "content", e.target.value)}
                          className="h-9"
                          placeholder="请输入课点名称"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="text"
                          value={typeof coursePoint.description === 'string' ? coursePoint.description : ""}
                          onChange={(e) => handleUpdateField(coursePoint.id, "description", e.target.value)}
                          className="h-9"
                          placeholder="请输入课点描述（可选）"
                        />
                      </td>
                      <td className="px-4 py-3 text-center w-16">
                        {localCoursePoints.length > 1 && (
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

export default CanvasCoursePointEditor
