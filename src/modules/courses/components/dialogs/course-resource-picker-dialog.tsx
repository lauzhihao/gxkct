"use client"

import { useCallback, useMemo, useState, useEffect, useRef } from "react"
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
import { Empty, EmptyDescription } from "@/shared/components/ui/empty"
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
  onNavigateToResources?: () => void
}

export function CourseResourcePickerDialog({
  nodeId,
  open,
  onOpenChange,
  selectionMode = "multiple",
  onConfirm,
  onNavigateToResources,
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
  const prevOpenRef = useRef(false)

  // 当对话框从关闭变为打开时，重置选中项和导航状态到根目录
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setSelectedItems(new Map())
      goToBreadcrumb(0)
    }
    prevOpenRef.current = open
  }, [open, goToBreadcrumb])

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
        const objectDisplayName = target.displayName || target.name
        const item: PickedResource = {
          id: target.id,
          name: objectDisplayName,
          path: breadcrumbPath(breadcrumbs, objectDisplayName),
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

  const handleNavigateToResources = useCallback(() => {
    onOpenChange(false)
    if (onNavigateToResources) {
      onNavigateToResources()
    } else {
      window.dispatchEvent(new CustomEvent("open-course-resources-tab"))
    }
  }, [onNavigateToResources, onOpenChange])

  const canConfirm = selectedItems.size > 0
  const isInitializationState = !nodeId
  const isEmptyState =
    !isInitializationState &&
    !isLoading &&
    !isObjectsLoading &&
    (entries.length === 0 || needInitialization)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>选择课程资源</DialogTitle>
          <DialogDescription>浏览课程资源目录并选择需要引用的文件。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                placeholder="搜索当前目录"
                className="h-9 pl-9"
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!nodeId}
              />
            </div>
            <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={goToBreadcrumb} />
          </div>

          {isInitializationState ? (
            <Empty title="暂无课程资源">
              <EmptyDescription>请先在课程资源页初始化目录。</EmptyDescription>
            </Empty>
          ) : isEmptyState ? (
            <Empty>
              <EmptyDescription>
                <button
                  type="button"
                  className="text-primary underline underline-offset-4"
                  onClick={handleNavigateToResources}
                >
                  可前往课程资源进行管理
                </button>
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="relative rounded-lg border border-border p-4">
              {(isLoading || isObjectsLoading) && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}
              {error && (
                <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
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
