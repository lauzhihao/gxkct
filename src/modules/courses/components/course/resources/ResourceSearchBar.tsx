"use client"

import { Search, X, LayoutGrid, Rows, Plus, Upload, ListChecks, ClipboardPaste } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/utils/utils"
import type { ResourceSearchBarProps } from "./types"

export function ResourceSearchBar({
  courseEditable = false,
  searchTerm,
  onSearchChange,
  placeholder,
  viewMode,
  onViewModeChange,
  className,
  onSelectFiles,
  disableUpload,
  onCreateFolderClick,
  disableCreateFolder,
  interactionMode,
  onToggleBatchMode,
  showPaste,
  disablePaste,
  isPasting,
  onPaste,
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

  const handleToggleBatchMode = () => {
    if (!courseEditable) return
    onToggleBatchMode?.()
  }

  const handlePaste = () => {
    if (disablePaste) return
    onPaste()
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div className="relative w-full sm:w-64">
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
            type="button"
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="清空搜索"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div
        className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-muted/40 p-0.5"
        role="group"
        aria-label="资源视图"
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", buttonHoverClass)}
              onClick={() => onViewModeChange("grid")}
              aria-label="网格视图"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">网格视图</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className={cn("h-8 w-8", buttonHoverClass)}
              onClick={() => onViewModeChange("list")}
              aria-label="列表视图"
              aria-pressed={viewMode === "list"}
            >
              <Rows className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">列表视图</TooltipContent>
        </Tooltip>
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
      {canManageCourseResource && (
        <Button
          size="sm"
          variant={interactionMode === "batch" ? "secondary" : "default"}
          className={cn("gap-2", buttonHoverClass)}
          onClick={handleToggleBatchMode}
          disabled={!onToggleBatchMode}
          aria-pressed={interactionMode === "batch"}
        >
          <ListChecks className="h-4 w-4" />
          {interactionMode === "batch" ? "退出批量操作" : "批量操作"}
        </Button>
      )}
      {showPaste && (
        <Button
          size="sm"
          variant="outline"
          className={cn("gap-1", buttonHoverClass)}
          onClick={handlePaste}
          disabled={disablePaste}
        >
          <ClipboardPaste className="h-4 w-4" />
          {isPasting ? "粘贴中" : "粘贴"}
        </Button>
      )}
    </div>
  )
}
