"use client"

import { useEffect, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog"
import { api } from "@/lib/api"
import type { DeletedSemesterCourse } from "@/lib/api/course-detail-api"
import { showError, showSuccess } from "@/shared/utils/toast-utils"

interface CourseRecycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: number
  majorId: number
  onRestored: () => void
}

export function CourseRecycleDialog({
  open,
  onOpenChange,
  semesterId,
  majorId,
  onRestored,
}: CourseRecycleDialogProps) {
  const [items, setItems] = useState<DeletedSemesterCourse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    let cancelled = false
    const load = async () => {
      setIsLoading(true)
      const response = await api.courseDetail.listDeletedCourses(semesterId, majorId)
      if (cancelled) {
        return
      }
      if (response.error) {
        setItems([])
        showError(response.error, "回收站加载失败")
      } else {
        setItems(response.data ?? [])
      }
      setIsLoading(false)
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [majorId, open, semesterId])

  const handleRestore = async (bindingId: number) => {
    setRestoringId(bindingId)
    const response = await api.courseDetail.restoreDeletedCourse(bindingId)
    setRestoringId(null)
    if (response.error) {
      showError(response.error, "恢复失败")
      return
    }
    setItems((current) => current.filter((item) => item.id !== bindingId))
    showSuccess("课程已恢复")
    onRestored()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>回收站</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">正在加载已删除的课程...</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">这个专业在当前学期没有可恢复的课程。</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const name = item.courseName?.trim() ? item.courseName : `课程 ${item.courseUnitId}`
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2">
                  <span className="min-w-0 truncate text-sm text-foreground">{name}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={restoringId !== null}
                    onClick={() => void handleRestore(item.id)}
                  >
                    {restoringId === item.id ? "恢复中..." : "恢复"}
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
