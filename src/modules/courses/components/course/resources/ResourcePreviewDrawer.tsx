"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertCircle,
  Clock3,
  Download,
  FileQuestion,
  RotateCw,
  X,
} from "lucide-react"
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
  resolveOfficeResourcePreviewState,
  resolveResourcePreviewPresentation,
  type DirectResourcePreviewKind,
  type ResourcePreviewDetail,
  type ResourcePreviewPresentation,
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
  onCloseAnimationEnd: () => void
  loadDetail: (resourceId: string) => Promise<unknown>
}

function getPreviewSource(
  detail: ResourcePreviewDetail,
  presentation: ResourcePreviewPresentation,
): {
  kind: DirectResourcePreviewKind
  url: string
} | null {
  if (presentation.mode === "unsupported") {
    return null
  }
  if (presentation.mode === "direct-text") {
    return { kind: presentation.kind, url: detail.downloadUrl }
  }
  const officePreviewState = resolveOfficeResourcePreviewState(detail)
  if (officePreviewState !== null) {
    if (officePreviewState.phase === "ready") {
      return { kind: "pdf", url: officePreviewState.url }
    }
    return null
  }
  if (detail.previewStatus === "READY") {
    if (detail.previewUrl === null) {
      return null
    }
    return { kind: "pdf", url: detail.previewUrl }
  }
  if (detail.previewStatus !== "NONE") {
    return null
  }
  if (presentation.directKind === null) {
    return null
  }
  return { kind: presentation.directKind, url: detail.downloadUrl }
}

function isPreviewConverting(
  detail: ResourcePreviewDetail,
  presentation: ResourcePreviewPresentation,
): boolean {
  const officePreviewState = resolveOfficeResourcePreviewState(detail)
  if (officePreviewState !== null) {
    return officePreviewState.phase === "converting"
  }
  return (
    presentation.mode === "status" &&
    (detail.previewStatus === "PENDING" ||
      detail.previewStatus === "PROCESSING")
  )
}

function getDirectPreviewKey(detail: ResourcePreviewDetail): string {
  return [
    detail.id,
    detail.displayName,
    detail.mimeType,
    detail.downloadUrl,
  ].join("\n")
}

export function ResourcePreviewDrawer({
  open,
  resourceId,
  initialDisplayName,
  onOpenChange,
  onCloseAnimationEnd,
  loadDetail,
}: ResourcePreviewDrawerProps) {
  const [reloadVersion, setReloadVersion] = useState(0)
  const [state, setState] = useState<PreviewDrawerState>({
    phase: "loading",
    resourceId,
  })
  const [directPreviewFailedKey, setDirectPreviewFailedKey] = useState<
    string | null
  >(null)

  useEffect(() => {
    if (!open) {
      setDirectPreviewFailedKey(null)
      return
    }

    let disposed = false
    let pollTimer: ReturnType<typeof setTimeout> | undefined
    const startedAt = Date.now()
    setDirectPreviewFailedKey(null)
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

        const presentation = resolveResourcePreviewPresentation(
          detail.displayName,
          detail.mimeType,
          false,
        )
        const isConverting = isPreviewConverting(detail, presentation)
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
  const directPreviewFailed =
    loadedDetail !== null &&
    directPreviewFailedKey === getDirectPreviewKey(loadedDetail)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !open) {
      setDirectPreviewFailedKey(null)
      setState({ phase: "loading", resourceId })
    }
    if (!nextOpen) {
      setDirectPreviewFailedKey(null)
    }
    onOpenChange(nextOpen)
  }

  const handleAnimationEnd = (animationOpen: boolean) => {
    if (!animationOpen) {
      onCloseAnimationEnd()
    }
  }

  const handleReload = () => {
    setReloadVersion((currentVersion) => currentVersion + 1)
  }

  const handleDirectPreviewFailed = useCallback(() => {
    if (loadedDetail === null) {
      return
    }
    setDirectPreviewFailedKey(getDirectPreviewKey(loadedDetail))
  }, [loadedDetail])

  const renderUnsupported = (detail: ResourcePreviewDetail) => (
    <div className="flex h-full min-h-[520px] flex-col items-center justify-center gap-3 px-8 text-center">
      <FileQuestion className="size-11 text-muted-foreground" />
      <p className="font-medium text-foreground">此文件类型暂不支持在线预览</p>
      <p className="text-sm text-muted-foreground">请下载原始文件查看</p>
      <Button variant="outline" className="mt-2" asChild>
        <a
          href={detail.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={detail.displayName}
        >
          <Download />
          下载原件
        </a>
      </Button>
    </div>
  )

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
    const presentation = resolveResourcePreviewPresentation(
      detail.displayName,
      detail.mimeType,
      directPreviewFailed,
    )
    if (presentation.mode === "unsupported") {
      return renderUnsupported(detail)
    }

    if (presentation.mode === "direct-text") {
      return (
        <ResourcePreviewContent
          kind={presentation.kind}
          url={detail.downloadUrl}
          displayName={detail.displayName}
          onDirectPreviewFailed={handleDirectPreviewFailed}
        />
      )
    }

    if (isPreviewConverting(detail, presentation)) {
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
            {state.timedOut ? "转换时间较长" : "转换中，请稍候"}
          </p>
          <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {state.timedOut
              ? "自动等待已结束。你可以重新检查转换状态，或通过顶部链接下载原始文件。"
              : "文件正在生成 PDF 预览版，完成后会自动刷新，无需关闭抽屉。"}
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

    const previewSource = getPreviewSource(detail, presentation)
    if (previewSource === null) {
      return renderUnsupported(detail)
    }

    return (
      <ResourcePreviewContent
        kind={previewSource.kind}
        url={previewSource.url}
        displayName={detail.displayName}
        onDirectPreviewFailed={handleDirectPreviewFailed}
      />
    )
  }

  const presentation = loadedDetail === null
    ? null
    : resolveResourcePreviewPresentation(
        loadedDetail.displayName,
        loadedDetail.mimeType,
        directPreviewFailed,
      )
  const isUnsupported =
    presentation === null ? false : presentation.mode === "unsupported"

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      onAnimationEnd={handleAnimationEnd}
      direction="right"
    >
      <DrawerContent className="h-dvh bg-background data-[vaul-drawer-direction=right]:w-[94vw] data-[vaul-drawer-direction=right]:sm:w-[47vw] data-[vaul-drawer-direction=right]:sm:max-w-[min(960px,47vw)]">
        <DrawerHeader className="sticky top-0 z-10 gap-3 border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center gap-2">
            <DrawerTitle
              className="min-w-0 flex-[1_1_12rem] truncate text-base"
              title={displayName}
            >
              {displayName}
            </DrawerTitle>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              {loadedDetail !== null && !isUnsupported ? (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={loadedDetail.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={loadedDetail.displayName}
                  >
                    <Download />
                    下载原件
                  </a>
                </Button>
              ) : null}
              <DrawerClose asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="关闭预览">
                  <X />
                </Button>
              </DrawerClose>
            </div>
          </div>
          <DrawerDescription className="sr-only">
            在线预览仅供快速核对，原始文件始终保留
          </DrawerDescription>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-auto bg-muted/20" aria-live="polite">
          {renderBody()}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
