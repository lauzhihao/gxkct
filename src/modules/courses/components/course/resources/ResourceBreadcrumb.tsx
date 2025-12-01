"use client"

import { FolderOpen, ChevronRight } from "lucide-react"
import type { ResourceBreadcrumbProps } from "./types"

export function ResourceBreadcrumb({
  currentFolder,
  selectedFile,
  folderName,
  onBackToFolders,
  onBackToFiles,
}: ResourceBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2">
      <FolderOpen className="w-4 h-4 text-primary" />
      {selectedFile ? (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onBackToFolders}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            课程资源
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={onBackToFiles}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            {folderName}
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{selectedFile.name}</span>
        </div>
      ) : currentFolder ? (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onBackToFolders}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            课程资源
          </button>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-foreground">{folderName}</span>
        </div>
      ) : (
        <h3 className="text-sm font-semibold text-foreground">课程资源</h3>
      )}
    </div>
  )
}

