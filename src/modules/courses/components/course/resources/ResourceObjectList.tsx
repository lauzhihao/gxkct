"use client"

import { Folder, Image, FileSpreadsheet, Presentation, FileText, FileCode2, File } from "lucide-react"
import { cn } from "@/shared/utils/utils"
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

export function ResourceObjectList({
  entries,
  selectedIds,
  onToggleSelect,
  onFolderClick,
  isRootLevel,
}: ResourceObjectListProps) {
  const handleFolderTileClick = (onClick: () => void) => {
    onClick()
  }

  const handleObjectToggleSelect = (objectId: string) => {
    onToggleSelect(objectId)
  }

  const renderFolderTile = (id: string, name: string, onClick: () => void, filesCount?: number, showFilesCount?: boolean) => {
    const safeFilesCount = typeof filesCount === "number" && filesCount >= 0 ? filesCount : 0
    return (
    <button
      type="button"
      key={id}
      onClick={() => handleFolderTileClick(onClick)}
      className={cn(baseTileClass, "hover:border-primary hover:bg-primary/80 group")}
    >
      {showFilesCount ? (
        <span className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
          {safeFilesCount}
        </span>
      ) : null}
      <Folder className="h-10 w-10 text-primary transition-colors group-hover:text-white" />
      <span className="text-sm font-medium text-foreground transition-colors group-hover:text-white truncate w-full">
        {name}
      </span>
    </button>
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
      <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border/60 text-sm text-muted-foreground">
        该目录暂无内容，可上传或复制其他目录的文件
      </div>
    )
  }

  return (
    <div className={gridClass}>
      {entries.map((entry) => {
        if (entry.type === "folder") {
          return renderFolderTile(entry.folder.id, entry.folder.name, () => onFolderClick(entry.folder), entry.folder.filesCount, false)
        }
        const checked = selectedIds.has(entry.object.id)
        const Icon = getObjectIcon(entry.object.mimeType, entry.object.name)
        return (
          <button
            type="button"
            key={entry.object.id}
            onClick={() => handleObjectToggleSelect(entry.object.id)}
            className={cn(
              baseTileClass,
              "group",
              checked
                ? "border-primary bg-primary/80 text-white"
                : "hover:border-primary hover:bg-primary/70 hover:text-white",
            )}
            title={entry.object.name}
          >
            <Icon className={cn("h-10 w-10", checked ? "text-white" : "text-primary group-hover:text-white")} />
            <span className={cn("text-sm font-medium truncate w-full", checked ? "text-white" : "text-foreground group-hover:text-white")}>{entry.object.name}</span>
          </button>
        )
      })}
    </div>
  )
}
