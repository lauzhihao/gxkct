"use client"

import { useState, useEffect, useCallback } from "react"
import { History, Download, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Skeleton } from "@/shared/components/ui/skeleton"
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/shared/components/ui/empty"
import { api } from "@/lib/api"
import type { EditHistoryListItem, EditHistoryDetailItem } from "@/lib/api/edit-history-api"
import { showError, showSuccess } from "@/shared/utils/toast-utils"
import { cn } from "@/shared/utils/utils"

interface EditHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: number
  courseName?: string
}

/** 从 content-disposition 解析文件名（支持 UTF-8'' 编码与普通 filename） */
function parseFilenameFromContentDisposition(headerValue: string | null): string | null {
  if (!headerValue) {
    return null
  }
  const utf8Match = headerValue.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8Match && utf8Match[1]) {
    try {
      return decodeURIComponent(utf8Match[1])
    } catch {
      return utf8Match[1]
    }
  }
  const asciiMatch = headerValue.match(/filename="?([^"]+)"?/i)
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1]
  }
  return null
}

/** 触发浏览器下载 Blob */
function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  window.setTimeout(() => {
    link.remove()
    URL.revokeObjectURL(url)
  }, 400)
}

/** 列表项唯一 key（同一条记录由 时间+类型+操作人 唯一确定，附加 index 兜底去重） */
function getRecordKey(item: EditHistoryListItem, index: number): string {
  return `${index}-${item.time}-${item.type}-${item.editor}`
}

export function EditHistoryDialog({ open, onOpenChange, courseId, courseName }: EditHistoryDialogProps) {
  const [items, setItems] = useState<EditHistoryListItem[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [detailMap, setDetailMap] = useState<Record<string, EditHistoryDetailItem[]>>({})
  const [detailLoadingKey, setDetailLoadingKey] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)

  // 弹窗打开时拉取修改记录列表（并重置上一次的展开/详情缓存）
  useEffect(() => {
    if (!open) {
      return
    }
    let cancelled = false
    setIsLoading(true)
    setLoadError(null)
    setExpandedKey(null)
    setDetailMap({})
    api.editHistory
      .getCourseHistory(courseId)
      .then((response) => {
        if (cancelled) {
          return
        }
        if (response.error) {
          setLoadError(response.error)
          setItems(null)
          return
        }
        setItems(response.data)
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [open, courseId])

  const handleToggleRow = useCallback(
    async (item: EditHistoryListItem, key: string) => {
      // 不可下钻的记录（如矩阵类，后端暂无字段级详情）忽略点击
      if (!item.more) {
        return
      }
      if (expandedKey === key) {
        setExpandedKey(null)
        return
      }
      setExpandedKey(key)
      // 已缓存详情则无需重复请求
      if (detailMap[key]) {
        return
      }
      setDetailLoadingKey(key)
      const response = await api.editHistory.getHistoryDetail(courseId, item)
      setDetailLoadingKey(null)
      if (response.error) {
        showError(response.error, "加载详情失败")
        setExpandedKey(null)
        return
      }
      // 成功时后端返回数组（可能为空表示无字段级明细）
      const detailItems = response.data ? response.data : []
      setDetailMap((prev) => ({ ...prev, [key]: detailItems }))
    },
    [courseId, expandedKey, detailMap]
  )

  const handleExport = useCallback(async () => {
    setIsExporting(true)
    try {
      const response = await api.editHistory.exportCourseHistory(courseId)
      const blob = await response.blob()
      const parsedName = parseFilenameFromContentDisposition(response.headers.get("content-disposition"))
      // 文件名仅用于本地保存展示，非业务字段
      const fileName = parsedName ? parsedName : `${courseName ? courseName : "课程"}_修改记录.docx`
      downloadBlob(blob, fileName)
      showSuccess("修改记录导出成功")
    } catch (error) {
      console.error("[EditHistoryDialog] export failed:", error)
      showError("修改记录导出失败，请稍后重试")
    } finally {
      setIsExporting(false)
    }
  }, [courseId, courseName])

  // 仅展示最近 10 条记录（后端按时间倒序返回）
  const visibleItems = items ? items.slice(0, 10) : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col gap-4">
        <DialogHeader className="flex flex-row items-center justify-between gap-4 pr-8 space-y-0">
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            最近修改记录
          </DialogTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="gap-2"
            title="导出为 Word 文档"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            导出 Word
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1" style={{ maxHeight: "60vh" }}>
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : loadError ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>加载失败</EmptyTitle>
                <EmptyDescription>{loadError}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : visibleItems.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <History />
                </EmptyMedia>
                <EmptyTitle>暂无修改记录</EmptyTitle>
                <EmptyDescription>该课程还没有任何修改记录</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {visibleItems.map((item, index) => {
                const key = getRecordKey(item, index)
                const isExpanded = expandedKey === key
                const detailItems = detailMap[key]
                const isDetailLoading = detailLoadingKey === key
                return (
                  <li key={key} className="overflow-hidden rounded-md border border-border bg-card">
                    <button
                      type="button"
                      onClick={() => handleToggleRow(item, key)}
                      className={cn(
                        "group grid w-full grid-cols-[1rem_auto_auto_88px_minmax(0,1fr)] items-center gap-3 px-3 py-2.5 text-left transition-colors",
                        item.more ? "cursor-pointer hover:bg-accent" : "cursor-default"
                      )}
                    >
                      <span className="flex items-center text-muted-foreground group-hover:text-white">
                        {item.more ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )
                        ) : null}
                      </span>
                      <span className="whitespace-nowrap text-xs text-muted-foreground group-hover:text-white/90">
                        {item.time}
                      </span>
                      <Badge
                        variant="outline"
                        className="justify-self-start whitespace-nowrap group-hover:border-white/50 group-hover:text-white"
                      >
                        {item.type}
                      </Badge>
                      <span className="truncate text-sm font-medium group-hover:text-white">
                        {item.editor}
                      </span>
                      <span className="truncate text-sm text-muted-foreground group-hover:text-white/90">
                        {item.detail}
                      </span>
                    </button>

                    {isExpanded ? (
                      <div className="border-t border-border px-3 py-2 pl-10 bg-muted/30">
                        {isDetailLoading ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            加载详情中...
                          </div>
                        ) : detailItems && detailItems.length > 0 ? (
                          <div className="space-y-3">
                            {detailItems.map((detail, detailIndex) => (
                              <div key={detailIndex}>
                                {detail.detail.length > 0 ? (
                                  <ul className="space-y-1">
                                    {detail.detail.map((line, lineIndex) => (
                                      <li key={lineIndex} className="text-sm text-foreground break-words">
                                        {line}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-sm text-muted-foreground">本次修改暂无字段级明细</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground py-1">本次修改暂无字段级明细</p>
                        )}
                      </div>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
