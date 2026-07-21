"use client"

import { Folder, Image, FileSpreadsheet, Presentation, FileText, FileCode2, File, X, Upload } from "lucide-react"
import { Badge } from "@/shared/components/ui/badge"
import { cn } from "@/shared/utils/utils"
import type { ResourceObjectListProps } from "./types"
import { ResourceTileActions } from "./ResourceTileActions"

function getObjectIcon(mimeType?: string, name?: string) {
  const lowerMime = mimeType?.toLowerCase() ?? ""
  const lowerName = name?.toLowerCase() ?? ""
  if (lowerMime.startsWith("image/") || /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.svg)$/.test(lowerName)) {
    return Image
  }
  if (lowerMime.includes("spreadsheet") || lowerMime.includes("excel") || /(\.xls|\.xlsx|\.csv)$/.test(lowerName)) {
    return FileSpreadsheet
  }
  if (lowerMime.includes("presentation") || lowerMime.includes("powerpoint") || /(\.ppt|\.pptx)$/.test(lowerName)) {
    return Presentation
  }
  if (lowerMime.includes("pdf") || /(\.pdf|\.doc|\.docx|\.txt)$/.test(lowerName)) {
    return FileText
  }
  if (lowerMime.includes("code") || /(\.ts|\.tsx|\.js|\.py|\.java|\.c|\.cpp)$/.test(lowerName)) {
    return FileCode2
  }
  return File
}

const gridClass = "grid grid-cols-1 gap-3 pb-[15px] sm:grid-cols-2 xl:grid-cols-3"
const listClass = "mb-[15px] divide-y divide-border overflow-x-auto rounded-lg border border-border bg-card/40"
const listRowClass = "grid min-w-[46rem] grid-cols-[minmax(15rem,1fr)_8rem_6rem_10rem_7rem] items-center"
const listPrimaryColumnsClass = "col-span-4 grid min-h-14 grid-cols-[minmax(15rem,1fr)_8rem_6rem_10rem] items-center"
const listNameCellClass = "flex min-w-0 items-center gap-3 px-3"
const listMetadataCellClass = "min-w-0 truncate px-2 text-xs text-muted-foreground"
const listOperationCellClass = "relative min-h-14 [&>div]:top-1/2 [&>div]:-translate-y-1/2"
const baseTileClass = "relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-6 text-center transition-all"
const resourceDateFormatter = new Intl.DateTimeFormat("zh-CN", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatResourceSize(size: number): string {
  if (!Number.isFinite(size)) {
    throw new Error("资源文件大小无效")
  }
  if (size < 0) {
    throw new Error("资源文件大小不能为负数")
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }
  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatResourceDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    throw new Error("资源更新时间无效")
  }
  return resourceDateFormatter.format(date)
}

function formatOptionalResourceDate(value: string | null | undefined): string | null {
  if (value === undefined) {
    return null
  }
  if (value === null) {
    return null
  }
  return formatResourceDate(value)
}

function getFolderFilesCountBadgeValue(value: number | undefined): number | null {
  if (value === undefined) {
    return null
  }
  if (!Number.isInteger(value)) {
    throw new Error("文件夹文件数量无效")
  }
  if (value < 0) {
    throw new Error("文件夹文件数量不能为负数")
  }
  if (value === 0) {
    return null
  }
  return value
}

function renderFolderFilesCountBadge(
  value: number | null,
  className?: string,
) {
  if (value === null) {
    return null
  }
  return (
    <Badge
      variant="secondary"
      className={cn("min-w-6 px-1.5 tabular-nums", className)}
    >
      {value}
    </Badge>
  )
}

function getUploadStatusLabel(
  status: "queued" | "uploading" | "error",
  progress: number,
): string {
  switch (status) {
    case "queued":
      return "准备上传"
    case "uploading":
      return `上传中 ${Math.round(progress)}%`
    case "error":
      return "上传失败"
  }
}

export function ResourceObjectList({
  entries,
  viewMode,
  selectedIds,
  interactionMode,
  onToggleSelect,
  onFolderClick,
  onCancelUpload,
  onRetryUpload,
  isRootLevel,
  canRename = false,
  onRename,
  canDelete = false,
  onDelete,
  onPreview,
}: ResourceObjectListProps) {
  const isListView = viewMode === "list"
  const shouldShowRename = canRename && !isRootLevel && typeof onRename === "function"
  const shouldShowDelete = canDelete && !isRootLevel && typeof onDelete === "function"

  const handleFolderTileClick = (onClick: () => void) => {
    onClick()
  }

  const handleObjectToggleSelect = (objectId: string) => {
    onToggleSelect(objectId)
  }

  const renderFolderTile = (
    id: string,
    name: string,
    onClick: () => void,
    filesCount?: number,
    latestUploadedAt?: string | null,
    showFilesCount?: boolean,
  ) => {
    const filesCountBadgeValue = getFolderFilesCountBadgeValue(filesCount)
    const updatedAtLabel = formatOptionalResourceDate(latestUploadedAt)
    const showFolderActions =
      interactionMode === "normal" && (shouldShowRename || shouldShowDelete)
    const folderActions = showFolderActions ? (
      <ResourceTileActions
        name={name}
        selected={false}
        onRename={shouldShowRename ? () => onRename({ id, name, type: "folder" }) : undefined}
        onDelete={shouldShowDelete ? () => onDelete({ id, name, type: "folder" }) : undefined}
      />
    ) : null

    if (isListView) {
      return (
        <div
          className={cn(listRowClass, "group/tile relative min-h-14 transition-colors hover:bg-primary/10")}
          key={id}
        >
          <button
            type="button"
            onClick={() => handleFolderTileClick(onClick)}
            className={cn(
              listPrimaryColumnsClass,
              "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <span className={listNameCellClass}>
              <Folder className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {name}
              </span>
            </span>
            <span className={listMetadataCellClass}>文件夹</span>
            <span className={cn(listMetadataCellClass, "flex items-center")}>
              {renderFolderFilesCountBadge(filesCountBadgeValue)}
            </span>
            <span className={listMetadataCellClass}>{updatedAtLabel}</span>
          </button>
          <div className={listOperationCellClass}>{folderActions}</div>
        </div>
      )
    }

    return (
      <div className="group/tile relative" key={id}>
        <button
          type="button"
          onClick={() => handleFolderTileClick(onClick)}
          className={cn(
            baseTileClass,
            "group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "hover:border-primary hover:bg-primary/80",
          )}
        >
          {showFilesCount
            ? renderFolderFilesCountBadge(
                filesCountBadgeValue,
                "absolute right-2 top-2",
              )
            : null}
          <Folder className="h-10 w-10 text-primary transition-colors group-hover:text-white" aria-hidden="true" />
          <span className="w-full truncate text-sm font-medium text-foreground transition-colors group-hover:text-white">
            {name}
          </span>
        </button>
        {folderActions}
      </div>
    )
  }

  const renderUploadTile = (
    uploadId: string,
    name: string,
    size: number,
    mimeType: string,
    progress: number,
    status: "queued" | "uploading" | "error",
  ) => {
    const Icon = getObjectIcon(mimeType, name)
    const progressValue = Math.max(0, Math.min(100, progress))
    const statusLabel = getUploadStatusLabel(status, progressValue)
    const sizeLabel = formatResourceSize(size)
    const cancelButton = (
      <button
        type="button"
        className={cn(
          "rounded-full p-1 text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600",
          isListView ? "" : "absolute right-2 top-2",
        )}
        onClick={() => onCancelUpload?.(uploadId)}
        aria-label="取消上传"
      >
        <X className="h-4 w-4" />
      </button>
    )
    const retryButton = (
      <button
        type="button"
        className="font-medium text-primary underline underline-offset-2"
        onClick={() => onRetryUpload?.(uploadId)}
      >
        请重试
      </button>
    )
    const progressBar = (
      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${progressValue}%` }}
        />
      </div>
    )

    if (isListView) {
      return (
        <div
          key={uploadId}
          className={cn(listRowClass, "group/tile min-h-14 bg-primary/5")}
        >
          <div className={listNameCellClass}>
            <div className="rounded-lg bg-primary/10 p-2">
              <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground" title={name}>
              {name}
            </p>
          </div>
          <span className={listMetadataCellClass}>{mimeType}</span>
          <span className={listMetadataCellClass}>{sizeLabel}</span>
          <div className={cn(listMetadataCellClass, "py-2")}>
            <p className="truncate">{statusLabel}</p>
            <div className="mt-2">
              {status === "error" ? retryButton : progressBar}
            </div>
          </div>
          <div className={cn(listOperationCellClass, "flex items-center justify-end px-2")}>
            {cancelButton}
          </div>
        </div>
      )
    }

    return (
      <div
        key={uploadId}
        className={cn(baseTileClass, "group items-start text-left border-primary/40 bg-primary/5 px-4 py-4")}
      >
        {cancelButton}
        <div className="flex w-full items-center gap-3 pt-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={name}>
              {name}
            </p>
            <p className="text-xs text-muted-foreground">{statusLabel}</p>
          </div>
        </div>
        <div className="mt-4 w-full">
          {status === "error" ? (
            <div className="text-xs text-destructive">
              上传失败，{retryButton}
            </div>
          ) : (
            <div className="space-y-2">{progressBar}</div>
          )}
        </div>
      </div>
    )
  }

  if (isRootLevel) {
    const folders = entries.filter((entry) => entry.type === "folder")
    if (!folders.length) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
          暂无子目录
        </div>
      )
    }
    return (
      <div className={isListView ? listClass : gridClass}>
        {folders.map((entry) =>
          renderFolderTile(
            entry.folder.id,
            entry.folder.name,
            () => onFolderClick(entry.folder),
            entry.folder.filesCount,
            entry.folder.latestUploadedAt,
            true,
          ),
        )}
      </div>
    )
  }

  if (!entries.length) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-6 text-center transition-colors hover:border-primary/60 hover:bg-primary/10">
        <div className="mb-4 rounded-full bg-primary/10 p-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <p className="text-sm font-medium text-foreground">请拖拽文件到此处完成上传</p>
        <p className="mt-2 text-xs text-muted-foreground">也可以点击上方“上传文件”选择本地文件</p>
      </div>
    )
  }

  return (
    <div className={isListView ? listClass : gridClass}>
      {entries.map((entry) => {
        if (entry.type === "folder") {
          return renderFolderTile(
            entry.folder.id,
            entry.folder.name,
            () => onFolderClick(entry.folder),
            entry.folder.filesCount,
            entry.folder.latestUploadedAt,
            false,
          )
        }
        if (entry.type === "upload") {
          return renderUploadTile(
            entry.upload.id,
            entry.upload.name,
            entry.upload.size,
            entry.upload.mimeType,
            entry.upload.progress,
            entry.upload.status,
          )
        }
        const checked = selectedIds.has(entry.object.id)
        const Icon = getObjectIcon(entry.object.mimeType, entry.object.name)
        const sizeLabel = formatResourceSize(entry.object.size)
        const updatedAtLabel = formatOptionalResourceDate(entry.object.uploadedAt)
        const showObjectActions =
          interactionMode === "normal" &&
          (typeof onPreview === "function" || shouldShowRename || shouldShowDelete)
        const objectActions = showObjectActions ? (
          <ResourceTileActions
            name={entry.object.name}
            selected={checked}
            onPreview={
              typeof onPreview === "function"
                ? () => onPreview({ id: entry.object.id, name: entry.object.name })
                : undefined
            }
            onRename={
              shouldShowRename
                ? () => onRename({ id: entry.object.id, name: entry.object.name, type: "file" })
                : undefined
            }
            onDelete={
              shouldShowDelete
                ? () => onDelete({ id: entry.object.id, name: entry.object.name, type: "file" })
                : undefined
            }
          />
        ) : null

        if (isListView) {
          return (
            <div
              className={cn(
                listRowClass,
                "group/tile relative min-h-14 transition-colors",
                checked ? "bg-primary/10" : "hover:bg-primary/10",
              )}
              key={entry.object.id}
            >
              <button
                type="button"
                onClick={() => handleObjectToggleSelect(entry.object.id)}
                className={cn(
                  listPrimaryColumnsClass,
                  "text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
                aria-pressed={checked}
              >
                <span className={listNameCellClass}>
                  <Icon className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {entry.object.name}
                  </span>
                </span>
                <span className={listMetadataCellClass}>{entry.object.mimeType}</span>
                <span className={listMetadataCellClass}>{sizeLabel}</span>
                <span className={listMetadataCellClass}>{updatedAtLabel}</span>
              </button>
              <div className={listOperationCellClass}>{objectActions}</div>
            </div>
          )
        }

        return (
          <div className="group/tile relative" key={entry.object.id}>
            <button
              type="button"
              onClick={() => handleObjectToggleSelect(entry.object.id)}
              className={cn(
                baseTileClass,
                "group w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                checked
                  ? "border-primary bg-primary/80 text-white"
                  : "hover:border-primary hover:bg-primary/70 hover:text-white",
              )}
              aria-pressed={checked}
            >
              <Icon className={cn("h-10 w-10", checked ? "text-white" : "text-primary group-hover:text-white")} aria-hidden="true" />
              <span className={cn("w-full truncate text-sm font-medium", checked ? "text-white" : "text-foreground group-hover:text-white")}>{entry.object.name}</span>
            </button>
            {objectActions}
          </div>
        )
      })}
    </div>
  )
}
