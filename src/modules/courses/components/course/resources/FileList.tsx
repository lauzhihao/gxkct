"use client"

import { File, ChevronRight, FolderOpen } from "lucide-react"
import type { FileListProps } from "./types"

export function FileList({ files, onFileClick }: FileListProps) {
  if (files.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm">该文件夹暂无内容</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((file, index) => (
        <button
          key={index}
          onClick={() => onFileClick(file)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 transition-all group"
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm text-foreground truncate">{file.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {file.size} · {file.date}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      ))}
    </div>
  )
}

