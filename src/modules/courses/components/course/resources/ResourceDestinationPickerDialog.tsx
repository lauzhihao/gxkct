"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { Folder, Search } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Input } from "@/shared/components/ui/input"
import { Spinner } from "@/shared/components/ui/spinner"
import { ResourceBreadcrumb } from "./ResourceBreadcrumb"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import type { ResourceOwnerType } from "@/modules/courses/api/courseResourcesApi"
import type { ResourceClipboardPhase } from "./resource-interaction-state"

interface ResourceDestinationPickerDialogProps {
  nodeId: string
  ownerType: ResourceOwnerType
  sourceFolderId: string
  clipboardPhase: ResourceClipboardPhase
  open: boolean
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (targetFolderId: string) => void
}

export function ResourceDestinationPickerDialog({
  nodeId,
  ownerType,
  sourceFolderId,
  clipboardPhase,
  open,
  isSubmitting,
  onOpenChange,
  onConfirm,
}: ResourceDestinationPickerDialogProps) {
  const {
    breadcrumbs,
    currentParentId,
    directories,
    isLoading,
    error,
    needInitialization,
    enterFolder,
    goToBreadcrumb,
    searchTerm,
    setSearchTerm,
  } = useCourseResources(nodeId, ownerType)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setSearchTerm("")
      goToBreadcrumb(0)
    }
    wasOpenRef.current = open
  }, [goToBreadcrumb, open, setSearchTerm])

  const filteredDirectories = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase()
    if (normalizedSearchTerm.length === 0) {
      return directories
    }
    return directories.filter((folder) => (
      folder.name.toLowerCase().includes(normalizedSearchTerm)
    ))
  }, [directories, searchTerm])

  const targetPath = useMemo(
    () => breadcrumbs.map((breadcrumb) => breadcrumb.name).join(" / "),
    [breadcrumbs],
  )
  const isClipboardPreparing = clipboardPhase === "preparing"
  const isRootTarget = currentParentId === null
  const isSourceTarget = currentParentId === sourceFolderId
  const canConfirm = !isClipboardPreparing
    && !isRootTarget
    && !isSourceTarget
    && !isLoading
    && !isSubmitting
    && !needInitialization

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) {
      return
    }
    onOpenChange(nextOpen)
  }, [isSubmitting, onOpenChange])

  const handleConfirm = useCallback(() => {
    if (!canConfirm) {
      return
    }
    if (currentParentId === null) {
      throw new Error("粘贴目标文件夹 ID 缺失")
    }
    onConfirm(currentParentId)
  }, [canConfirm, currentParentId, onConfirm])

  let targetHint = `将粘贴到：${targetPath}`
  if (isClipboardPreparing) {
    targetHint = "正在准备剪贴板资源，您可以先选择目标文件夹"
  } else if (isRootTarget) {
    targetHint = "请选择一个文件夹，资源根目录不能作为粘贴目标"
  } else if (isSourceTarget) {
    targetHint = "当前文件夹是源文件夹，请选择其他目标文件夹"
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>选择粘贴位置</DialogTitle>
          <DialogDescription>
            浏览资源目录，进入目标文件夹后点击“粘贴到此文件夹”。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              placeholder="搜索当前目录下的文件夹"
              className="h-9 pl-9"
              disabled={isLoading || needInitialization}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={goToBreadcrumb} />

          <div className="relative min-h-64 max-h-[55vh] overflow-y-auto rounded-lg border border-border p-4">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                <Spinner className="h-5 w-5" />
              </div>
            ) : null}
            {error === null ? null : (
              <div className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            {!isLoading && filteredDirectories.length === 0 ? (
              <div className="flex min-h-52 items-center justify-center text-sm text-muted-foreground">
                {searchTerm.trim().length > 0
                  ? "没有匹配的文件夹"
                  : "当前目录没有子文件夹"}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {filteredDirectories.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background p-4 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => enterFolder(folder)}
                  >
                    <Folder className="h-9 w-9 text-primary" aria-hidden="true" />
                    <span className="w-full truncate text-sm font-medium" title={folder.name}>
                      {folder.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">{targetHint}</p>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            disabled={isSubmitting}
            onClick={() => handleOpenChange(false)}
          >
            取消
          </Button>
          <Button disabled={!canConfirm} onClick={handleConfirm}>
            {isSubmitting || isClipboardPreparing ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {isSubmitting ? "正在粘贴" : "粘贴到此文件夹"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
