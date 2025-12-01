"use client"

import { Folder } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import type { FolderGridProps } from "./types"

// 格式化文件数量
function formatCount(count: number) {
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

export function FolderGrid({ folders, onFolderClick }: FolderGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {folders.map((resource) => (
        <button
          key={resource.id}
          onClick={() => onFolderClick(resource.id)}
          className="relative flex flex-col items-center gap-3 p-4 rounded-lg bg-card/50 border border-border hover:border-primary/50 hover:bg-card/70 hover:shadow-md transition-all group"
        >
          <Folder className="w-12 h-12 text-primary/70 group-hover:text-primary transition-colors" />
          <span className="text-sm text-foreground text-center line-clamp-2 leading-tight">
            {resource.name}
          </span>
          <div
            className={cn(
              "absolute top-2 right-2 min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-xs font-medium",
              resource.count === 0
                ? "bg-muted/50 text-muted-foreground border border-border"
                : "bg-primary/20 text-primary border border-primary/30",
            )}
          >
            {formatCount(resource.count)}
          </div>
        </button>
      ))}
    </div>
  )
}

