"use client"

import { Folder, Image, FileSpreadsheet, Presentation, FileText, FileCode2, File, Eye, MoreHorizontal, PencilLine, Trash2, X, Upload } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button } from "@/shared/components/ui/button"
import type { ResourceObjectListProps } from "./types"

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

const gridClass = "grid grid-cols-3 gap-3 pb-[15px]"
const baseTileClass = "relative flex flex-col items-center gap-2 rounded-lg border border-border bg-card/60 px-4 py-6 text-center transition-all"

interface ResourceTileMenuProps {
  name: string
  onPreview?: () => void
  onRename?: () => void
  onDelete?: () => void
}

function ResourceTileMenu({ name, onPreview, onRename, onDelete }: ResourceTileMenuProps) {
  const hasManagementActions = typeof onRename === "function" || typeof onDelete === "function"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 z-10 h-8 w-8 rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm ring-1 ring-border/70 backdrop-blur-sm transition-all hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover/tile:opacity-100 data-[state=open]:opacity-100"
          aria-label={`打开${name}的操作菜单`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-32">
        {typeof onPreview === "function" ? (
          <DropdownMenuItem onSelect={onPreview}>
            <Eye className="h-4 w-4" />
            预览
          </DropdownMenuItem>
        ) : null}
        {typeof onPreview === "function" && hasManagementActions ? <DropdownMenuSeparator /> : null}
        {typeof onRename === "function" ? (
          <DropdownMenuItem onSelect={onRename}>
            <PencilLine className="h-4 w-4" />
            重命名
          </DropdownMenuItem>
        ) : null}
        {typeof onDelete === "function" ? (
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="h-4 w-4" />
            删除
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ResourceObjectList({
  entries,
  selectedIds,
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
  const shouldShowRename = canRename && !isRootLevel && typeof onRename === "function"
  const shouldShowDelete = canDelete && !isRootLevel && typeof onDelete === "function"

  const handleFolderTileClick = (onClick: () => void) => {
    onClick()
  }

  const handleObjectToggleSelect = (objectId: string) => {
    onToggleSelect(objectId)
  }

  const renderFolderTile = (id: string, name: string, onClick: () => void, filesCount?: number, showFilesCount?: boolean) => {
    const safeFilesCount = typeof filesCount === "number" && filesCount >= 0 ? filesCount : 0
    return (
      <div className="group/tile relative" key={id}>
        <button
          type="button"
          onClick={() => handleFolderTileClick(onClick)}
          className={cn(baseTileClass, "group w-full hover:border-primary hover:bg-primary/80")}
        >
          {showFilesCount ? (
            <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {safeFilesCount}
            </span>
          ) : null}
          <Folder className="h-10 w-10 text-primary transition-colors group-hover:text-white" />
          <span className="w-full truncate text-sm font-medium text-foreground transition-colors group-hover:text-white">
            {name}
          </span>
        </button>
        {shouldShowRename || shouldShowDelete ? (
          <ResourceTileMenu
            name={name}
            onRename={shouldShowRename ? () => onRename({ id, name, type: "folder" }) : undefined}
            onDelete={shouldShowDelete ? () => onDelete({ id, name, type: "folder" }) : undefined}
          />
        ) : null}
      </div>
    )
  }

  const renderUploadTile = (
    uploadId: string,
    name: string,
    mimeType: string,
    progress: number,
    status: "queued" | "uploading" | "error",
  ) => {
    const Icon = getObjectIcon(mimeType, name)
    const progressValue = Math.max(0, Math.min(100, progress))

    return (
      <div
        key={uploadId}
        className={cn(baseTileClass, "group items-start text-left border-primary/40 bg-primary/5 px-4 py-4")}
      >
        <button
          type="button"
          className="absolute right-2 top-2 rounded-full p-1 text-red-500 transition-colors hover:bg-red-500/10 hover:text-red-600"
          onClick={() => onCancelUpload?.(uploadId)}
          aria-label="取消上传"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex w-full items-center gap-3 pt-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-8 w-8 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground" title={name}>
              {name}
            </p>
            <p className="text-xs text-muted-foreground">
              {status === "error" ? "上传失败" : status === "queued" ? "准备上传" : `上传中 ${Math.round(progressValue)}%`}
            </p>
          </div>
        </div>
        <div className="mt-4 w-full">
          {status === "error" ? (
            <div className="text-xs text-destructive">
              上传失败，
              <button
                type="button"
                className="font-medium text-primary underline underline-offset-2"
                onClick={() => onRetryUpload?.(uploadId)}
              >
                请重试
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
            </div>
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
      <div className={gridClass}>
        {folders.map((entry) =>
          renderFolderTile(entry.folder.id, entry.folder.name, () => onFolderClick(entry.folder), entry.folder.filesCount, true),
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
    <div className={gridClass}>
      {entries.map((entry) => {
        if (entry.type === "folder") {
          return renderFolderTile(entry.folder.id, entry.folder.name, () => onFolderClick(entry.folder), entry.folder.filesCount, false)
        }
        if (entry.type === "upload") {
          return renderUploadTile(entry.upload.id, entry.upload.name, entry.upload.mimeType, entry.upload.progress, entry.upload.status)
        }
        const checked = selectedIds.has(entry.object.id)
        const Icon = getObjectIcon(entry.object.mimeType, entry.object.name)
        return (
          <div className="group/tile relative" key={entry.object.id}>
            <button
              type="button"
              onClick={() => handleObjectToggleSelect(entry.object.id)}
              className={cn(
                baseTileClass,
                "group w-full",
                checked
                  ? "border-primary bg-primary/80 text-white"
                  : "hover:border-primary hover:bg-primary/70 hover:text-white",
              )}
              title={entry.object.name}
            >
              <Icon className={cn("h-10 w-10", checked ? "text-white" : "text-primary group-hover:text-white")} />
              <span className={cn("w-full truncate text-sm font-medium", checked ? "text-white" : "text-foreground group-hover:text-white")}>{entry.object.name}</span>
            </button>
            {typeof onPreview === "function" || shouldShowRename || shouldShowDelete ? (
              <ResourceTileMenu
                name={entry.object.name}
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
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
