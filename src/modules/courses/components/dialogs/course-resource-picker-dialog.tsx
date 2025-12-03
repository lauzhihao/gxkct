"use client"

import { useCallback, useMemo, useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ResourceBreadcrumb } from "@/modules/courses/components/course/resources/ResourceBreadcrumb"
import { ResourceObjectList } from "@/modules/courses/components/course/resources/ResourceObjectList"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import type { ResourceBreadcrumbNode } from "@/modules/courses/hooks/use-course-resources"
import type { ResourceEntry } from "@/modules/courses/components/course/resources/types"
import { Loader2, Search } from "lucide-react"
import { Empty } from "@/shared/components/ui/empty"
import { cn } from "@/shared/utils/utils"

export interface PickedResource {
  id: string
  name: string
  path: string
}

interface CourseResourcePickerDialogProps {
  nodeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectionMode?: "single" | "multiple"
  onConfirm: (items: PickedResource[]) => void
}

export function CourseResourcePickerDialog({
  nodeId,
  open,
  onOpenChange,
  selectionMode = "multiple",
  onConfirm,
}: CourseResourcePickerDialogProps) {
  const {
    breadcrumbs,
    directories,
    objects,
    isLoading,
    error,
    isObjectsLoading,
    objectsError,
    needInitialization,
    isRootLevel,
    goToBreadcrumb,
    enterFolder,
    searchTerm,
    setSearchTerm,
  } = useCourseResources(nodeId)

  const [selectedItems, setSelectedItems] = useState<Map<string, PickedResource>>(new Map())

  useEffect(() => {
    setSelectedItems(new Map())
  }, [nodeId])

  const breadcrumbPath = useCallback(
    (crumbs: ResourceBreadcrumbNode[], name: string) => crumbs.map((c) => c.name).concat(name).join(" / "),
    [],
  )

  const handleToggle = useCallback(
    (objectId: string) => {
      setSelectedItems((prev) => {
        const next = new Map(prev)
        if (next.has(objectId)) {
          next.delete(objectId)
          return next
        }
        const target = objects.find((obj) => obj.id === objectId)
        if (!target) return prev
        const item: PickedResource = {
          id: target.id,
          name: target.displayName,
          path: breadcrumbPath(breadcrumbs, target.displayName),
        }
        if (selectionMode === "single") {
          return new Map([[target.id, item]])
        }
        next.set(target.id, item)
        return next
      })
    },
    [objects, breadcrumbs, breadcrumbPath, selectionMode],
  )

  const selectedIds = useMemo(() => new Set(selectedItems.keys()), [selectedItems])

  const entries = useMemo<ResourceEntry[]>(
    () => [
      ...directories.map((folder) => ({ type: "folder" as const, folder })),
      ...objects.map((object) => ({ type: "object" as const, object })),
    ],
    [directories, objects],
  )

  const handleConfirm = useCallback(() => {
    onConfirm(Array.from(selectedItems.values()))
    onOpenChange(false)
  }, [selectedItems, onConfirm, onOpenChange])

  const canConfirm = selectedItems.size > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>选择课程资源</DialogTitle>
          <DialogDescription>浏览课程资源目录并选择需要引用的文件。</DialogDescription>
        </DialogHeader>

        {needInitialization || !nodeId ? (
          <Empty title="暂无课程资源" description="请先在课程资源页初始化目录。" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  placeholder="搜索当前目录"
                  className="h-9 pl-9"
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={goToBreadcrumb} />
            </div>

            {error ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <div className="relative rounded-lg border border-border p-4">
                {isLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {objectsError && (
                  <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {objectsError}
                  </div>
                )}
                <ResourceObjectList
                  entries={entries}
                  viewMode="grid"
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggle}
                  onFolderClick={enterFolder}
                  isRootLevel={isRootLevel}
                />
              </div>
            )}

            {!isObjectsLoading && selectedItems.size > 0 && (
              <p className="text-sm text-muted-foreground">已选择 {selectedItems.size} 个文件</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="transition-colors hover:bg-primary hover:text-white">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn("transition-colors hover:bg-primary hover:text-white", !canConfirm && "opacity-60")}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
