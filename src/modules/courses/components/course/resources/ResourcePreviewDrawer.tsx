"use client"

import { useEffect, useState } from "react"
import {
  AlertCircle,
  Clock3,
  Download,
  ExternalLink,
  FileQuestion,
  RotateCw,
  X,
} from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/shared/components/ui/drawer"
import { Spinner } from "@/shared/components/ui/spinner"
import { ResourcePreviewContent } from "./ResourcePreviewContent"
import {
  parseResourcePreviewDetail,
  resolveDirectResourcePreviewKind,
  type DirectResourcePreviewKind,
  type ResourcePreviewDetail,
  type ResourcePreviewStatus,
} from "./resource-preview-types"

const PREVIEW_POLL_INTERVAL_MS = 2_000
const PREVIEW_POLL_TIMEOUT_MS = 60_000

type PreviewDrawerState =
  | { phase: "loading"; resourceId: string }
  | { phase: "error"; resourceId: string; message: string }
  | {
      phase: "loaded"
      resourceId: string
      detail: ResourcePreviewDetail
      polling: boolean
      timedOut: boolean
    }

export interface ResourcePreviewDrawerProps {
  open: boolean
  resourceId: string
  initialDisplayName: string
  onOpenChange: (open: boolean) => void
  loadDetail: (resourceId: string) => Promise<unknown>
}

function getStatusLabel(status: ResourcePreviewStatus): string {
  switch (status) {
    case "NONE":
      return "原件预览"
    case "PENDING":
      return "等待转换"
    case "PROCESSING":
      return "正在转换"
    case "READY":
      return "预览就绪"
    case "FAILED":
      return "转换失败"
  }
}

function getPreviewSource(detail: ResourcePreviewDetail): {
  kind: DirectResourcePreviewKind
  url: string
} | null {
  if (detail.previewStatus === "READY") {
    if (detail.previewUrl === null) {
      return null
    }
    return { kind: "pdf", url: detail.previewUrl }
  }
  if (detail.previewStatus !== "NONE") {
    return null
  }
  const kind = resolveDirectResourcePreviewKind(
    detail.displayName,
    detail.mimeType,
  )
  if (kind === null) {
    return null
  }
  return { kind, url: detail.downloadUrl }
}

export function ResourcePreviewDrawer({
  open,
  resourceId,
  initialDisplayName,
  onOpenChange,
  loadDetail,
}: ResourcePreviewDrawerProps) {
  const [reloadVersion, setReloadVersion] = useState(0)
  const [state, setState] = useState<PreviewDrawerState>({
    phase: "loading",
    resourceId,
  })

  useEffect(() => {
    if (!open) {
      return
    }

    let disposed = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()
    setState({ phase: "loading", resourceId })

    const requestDetail = async () => {
      try {
        const detail = parseResourcePreviewDetail(await loadDetail(resourceId))
        if (detail.id !== resourceId) {
          throw new Error("资源详情与当前预览对象不匹配")
        }
        if (disposed) {
          return
        }

        const isConverting =
          detail.previewStatus === "PENDING" ||
          detail.previewStatus === "PROCESSING"
        const timedOut = isConverting && Date.now() - startedAt >= PREVIEW_POLL_TIMEOUT_MS
        setState({
          phase: "loaded",
          resourceId,
          detail,
          polling: isConverting && !timedOut,
          timedOut,
        })

        if (isConverting && !timedOut) {
          pollTimer = setTimeout(() => {
            void requestDetail()
          }, PREVIEW_POLL_INTERVAL_MS)
        }
      } catch (error) {
        if (disposed) {
          return
        }
        const message = error instanceof Error ? error.message : "资源详情加载失败"
        setState({ phase: "error", resourceId, message })
      }
    }

    void requestDetail()
    return () => {
      disposed = true
      if (pollTimer !== undefined) {
        clearTimeout(pollTimer)
      }
    }
  }, [loadDetail, open, reloadVersion, resourceId])

  const isCurrentResource = state.resourceId === resourceId
  const loadedDetail =
    isCurrentResource && state.phase === "loaded" ? state.detail : null
  const displayName =
    loadedDetail === null ? initialDisplayName : loadedDetail.displayName

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !open) {
      setState({ phase: "loading", resourceId })
    }
    onOpenChange(nextOpen)
  }

  const handleReload = () => {
    setReloadVersion((currentVersion) => currentVersion + 1)
  }

  const renderBody = () => {
    if (!isCurrentResource || state.phase === "loading") {
      return (
        <div className="flex h-full min-h-[520px] items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-5 text-primary" />
          正在加载资源详情
        </div>
      )
    }

    if (state.phase === "error") {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-4 px-8 text-center">
          <AlertCircle className="size-11 text-destructive" />
          <div>
            <p className="font-medium text-foreground">预览加载失败</p>
            <p className="mt-2 max-w-lg text-sm text-muted-foreground">{state.message}</p>
          </div>
          <Button type="button" variant="outline" onClick={handleReload}>
            <RotateCw />
            重新加载
          </Button>
        </div>
      )
    }

    const { detail } = state
    if (detail.previewStatus === "PENDING" || detail.previewStatus === "PROCESSING") {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center px-8 text-center">
          <div className="relative mb-6 flex size-20 items-center justify-center rounded-2xl border border-primary/20 bg-primary/5">
            {state.polling ? (
              <Spinner className="size-9 text-primary" />
            ) : (
              <Clock3 className="size-9 text-primary" />
            )}
          </div>
          <p className="text-lg font-semibold text-foreground">
            {state.timedOut ? "转换时间较长" : "预览版本转换中"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {state.timedOut
              ? "自动等待已结束。你可以重新检查转换状态，或通过顶部链接下载原始文件。"
              : "Office 文件正在生成 PDF 预览版，完成后会自动刷新，无需关闭抽屉。"}
          </p>
          {state.timedOut ? (
            <Button type="button" variant="outline" className="mt-6" onClick={handleReload}>
              <RotateCw />
              检查转换状态
            </Button>
          ) : null}
        </div>
      )
    }

    if (detail.previewStatus === "FAILED") {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-4 px-8 text-center">
          <FileQuestion className="size-12 text-destructive" />
          <div>
            <p className="text-lg font-semibold text-foreground">预览生成失败</p>
            <p className="mt-2 text-sm text-muted-foreground">请下载原件查看</p>
          </div>
          <Button type="button" variant="outline" onClick={handleReload}>
            <RotateCw />
            重新检查
          </Button>
        </div>
      )
    }

    const previewSource = getPreviewSource(detail)
    if (previewSource === null) {
      return (
        <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 px-8 text-center">
          <FileQuestion className="size-11 text-muted-foreground" />
          <p className="font-medium text-foreground">此文件类型暂不支持在线预览</p>
          <p className="text-sm text-muted-foreground">请使用顶部链接下载原始文件</p>
        </div>
      )
    }

    return (
      <ResourcePreviewContent
        kind={previewSource.kind}
        url={previewSource.url}
        displayName={detail.displayName}
      />
    )
  }

  const status = loadedDetail === null ? null : loadedDetail.previewStatus

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} direction="right">
      <DrawerContent className="h-dvh w-[94vw] bg-background sm:max-w-[min(960px,94vw)]">
        <DrawerHeader className="sticky top-0 z-10 gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate text-base" title={displayName}>
                  {displayName}
                </DrawerTitle>
                {status === null ? (
                  <Badge variant="outline">加载详情</Badge>
                ) : (
                  <Badge variant={status === "FAILED" ? "destructive" : "secondary"}>
                    {getStatusLabel(status)}
                  </Badge>
                )}
              </div>
              <DrawerDescription className="mt-1">
                在线预览仅供快速核对，原始文件始终保留
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button type="button" variant="ghost" size="icon" aria-label="关闭预览">
                <X />
              </Button>
            </DrawerClose>
          </div>
          <div className="flex min-h-9 items-center rounded-lg border border-border bg-muted/40 px-3">
            <Download className="mr-2 size-4 text-primary" />
            <span className="mr-3 text-xs font-medium text-muted-foreground">原始文件</span>
            {loadedDetail === null ? (
              <span className="text-sm text-muted-foreground">链接加载中</span>
            ) : (
              <a
                href={loadedDetail.downloadUrl}
                target="_blank"
                rel="noreferrer"
                download={loadedDetail.displayName}
                className="inline-flex min-w-0 items-center gap-1.5 truncate text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                下载原件
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            )}
          </div>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/20" aria-live="polite">
          {renderBody()}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
