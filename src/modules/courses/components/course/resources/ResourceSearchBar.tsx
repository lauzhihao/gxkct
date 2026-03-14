"use client"

import { Search, X, LayoutGrid, Rows, Download, Plus, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/utils"
import type { ResourceSearchBarProps } from "./types"

export function ResourceSearchBar({
  courseEditable = false,
  searchTerm,
  onSearchChange,
  placeholder,
  viewMode = "grid",
  onViewModeChange,
  className,
  onSelectFiles,
  disableUpload,
  onCreateFolderClick,
  disableCreateFolder,
}: ResourceSearchBarProps) {
  const canManageCourseResource = courseEditable
  const buttonHoverClass = "transition-colors hover:bg-primary hover:text-white hover:[&>svg]:text-white"

  const handleCreateFolderClick = () => {
    if (!courseEditable) return
    onCreateFolderClick?.()
  }

  const handleSelectFiles = () => {
    if (!courseEditable) return
    onSelectFiles?.()
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant={viewMode === "grid" ? "default" : "ghost"}
          size="icon"
          className={cn("h-9 w-9", buttonHoverClass)}
          onClick={() => onViewModeChange?.("grid")}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === "list" ? "default" : "ghost"}
          size="icon"
          className={cn("h-9 w-9", buttonHoverClass)}
          onClick={() => onViewModeChange?.("list")}
        >
          <Rows className="h-4 w-4" />
        </Button>
      </div>
      {canManageCourseResource && (
        <Button
          size="sm"
          className={cn("gap-2", buttonHoverClass)}
          onClick={handleCreateFolderClick}
          disabled={disableCreateFolder || !onCreateFolderClick}
        >
          <Plus className="h-4 w-4" />
          新建文件夹
        </Button>
      )}
      {canManageCourseResource && (
        <Button size="sm" className={cn("gap-2", buttonHoverClass)} disabled>
          <Download className="h-4 w-4" />
          批量下载
        </Button>
      )}
      {canManageCourseResource && (
        <Button
          size="sm"
          className={cn("gap-2", buttonHoverClass)}
          onClick={handleSelectFiles}
          disabled={disableUpload || !onSelectFiles}
        >
          <Upload className="h-4 w-4" />
          上传文件
        </Button>
      )}
    </div>
  )
}
