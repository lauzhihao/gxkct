"use client"

import { Search, X, Download, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import type { ResourceSearchBarProps } from "./types"

export function ResourceSearchBar({
  searchTerm,
  onSearchChange,
  placeholder,
  currentFolder,
  onUploadClick,
}: ResourceSearchBarProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full h-9 pl-9 pr-9 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        {searchTerm && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="清空搜索"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <Button size="sm" className="gap-2">
        <Download className="w-4 h-4" />
        批量下载
      </Button>
      {currentFolder && (
        <Button size="sm" className="gap-2" onClick={onUploadClick}>
          <Upload className="w-4 h-4" />
          上传
        </Button>
      )}
    </div>
  )
}

