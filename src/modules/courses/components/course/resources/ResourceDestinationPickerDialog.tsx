"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import { Folder } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog"
import { Empty, EmptyDescription, EmptyTitle } from "@/shared/components/ui/empty"
import { Spinner } from "@/shared/components/ui/spinner"
import { useCourseResources } from "@/modules/courses/hooks/use-course-resources"
import type { ResourceOwnerType } from "@/modules/courses/api/courseResourcesApi"
import { ResourceBreadcrumb } from "./ResourceBreadcrumb"
import {
  canConfirmResourceDestination,
  type ResourceBatchTransferAction,
} from "./resource-interaction-state"

interface ResourceDestinationPickerDialogProps {
  open: boolean
  nodeId: string
  ownerType?: ResourceOwnerType
  sourceFolderId: string
  action: ResourceBatchTransferAction
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (targetFolderId: string) => void
}

export function ResourceDestinationPickerDialog({
  open,
  nodeId,
  ownerType,
  sourceFolderId,
  action,
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
  } = useCourseResources(nodeId, ownerType)
  const previousOpenRef = useRef(false)

  useEffect(() => {
    if (open && !previousOpenRef.current) {
      goToBreadcrumb(0)
    }
    previousOpenRef.current = open
  }, [goToBreadcrumb, open])

  const canConfirm = canConfirmResourceDestination({
    sourceFolderId,
    targetFolderId: currentParentId,
    isLoading,
    isSubmitting,
  })
  const actionLabel = action === "copy" ? "复制" : "移动"
  const currentPath = useMemo(
    () => breadcrumbs.map((breadcrumb) => breadcrumb.name).join(" / "),
    [breadcrumbs],
  )

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (isSubmitting && !nextOpen) {
      return
    }
    onOpenChange(nextOpen)
  }, [isSubmitting, onOpenChange])

  const handleConfirm = useCallback(() => {
    if (currentParentId === null) {
      throw new Error("资源根目录不能作为目标目录")
    }
    if (!canConfirm) {
      throw new Error("当前目录不能作为目标目录")
    }
    onConfirm(currentParentId)
  }, [canConfirm, currentParentId, onConfirm])

  const destinationHint = currentParentId === null
    ? "资源根目录不能作为目标目录，请进入一个文件夹。"
    : currentParentId === sourceFolderId
      ? "不能选择当前源目录，请进入其他文件夹。"
      : `将把所选文件${actionLabel}到当前目录。`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>选择{actionLabel}目标目录</DialogTitle>
          <DialogDescription>仅显示文件夹；进入目标文件夹后确认操作。</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ResourceBreadcrumb path={breadcrumbs} onCrumbClick={goToBreadcrumb} />
          <div className="rounded-lg border border-border">
            <div className="border-b border-border bg-muted/30 px-4 py-3">
              <p className="truncate text-sm font-medium text-foreground">当前位置：{currentPath}</p>
              <p className="mt-1 text-xs text-muted-foreground">{destinationHint}</p>
            </div>

            <div className="relative min-h-56 max-h-[45vh] overflow-y-auto p-4">
              {isLoading ? (
                <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="h-5 w-5" />
                  正在加载目录
                </div>
              ) : error !== null ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              ) : needInitialization ? (
                <Empty>
                  <EmptyTitle>资源目录尚未初始化</EmptyTitle>
                  <EmptyDescription>当前无法选择目标目录。</EmptyDescription>
                </Empty>
              ) : directories.length === 0 ? (
                <Empty>
                  <EmptyTitle>当前目录没有子目录</EmptyTitle>
                  <EmptyDescription>
                    {currentParentId === null ? "请返回资源页创建目录。" : "可直接选择当前目录。"}
                  </EmptyDescription>
                </Empty>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {directories.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-4 text-center transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => enterFolder(folder)}
                    >
                      <Folder className="h-9 w-9 text-primary" aria-hidden="true" />
                      <span className="w-full truncate text-sm font-medium text-foreground" title={folder.name}>
                        {folder.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="transition-colors hover:bg-primary hover:text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="transition-colors hover:bg-primary hover:text-white"
          >
            {isSubmitting ? <Spinner className="mr-2 h-4 w-4" /> : null}
            {actionLabel}到此目录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
