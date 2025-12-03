"use client"

import { Fragment } from "react"
import { Folder, MoreHorizontal, ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import type { ResourceBreadcrumbProps } from "./types"

export function ResourceBreadcrumb({ path, onCrumbClick }: ResourceBreadcrumbProps) {
  const shouldCollapse = path.length > 4
  const head = path[0]
  const middle = shouldCollapse ? path.slice(1, -2) : []
  const tail = shouldCollapse ? path.slice(-2) : path.slice(1)

  const handleClick = (index: number) => {
    if (index === path.length - 1) return
    onCrumbClick(index)
  }

  const renderCrumb = (node: typeof path[number], index: number) => {
    const isCurrent = index === path.length - 1
    return (
      <Button
        key={`${node.id ?? "root"}-${index}`}
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 text-sm transition-colors",
          isCurrent ? "text-foreground font-medium" : "text-muted-foreground hover:bg-primary hover:text-white",
        )}
        onClick={() => handleClick(index)}
        disabled={isCurrent}
      >
        <span className={cn("truncate", isCurrent && "font-medium")}>{node.name}</span>
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-base text-muted-foreground">
      <Folder className="w-5 h-5 text-primary" />
      {renderCrumb(head, 0)}
      {shouldCollapse && middle.length > 0 && (
        <Fragment>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-3 text-sm text-muted-foreground transition-colors hover:bg-primary hover:text-white"
              >
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {middle.map((node, idx) => (
                <DropdownMenuItem key={`${node.id ?? "mid"}-${idx}`} onClick={() => handleClick(idx + 1)}>
                  {node.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </Fragment>
      )}
      {(shouldCollapse ? tail : path.slice(1)).map((node, idx) => (
        <Fragment key={`${node.id ?? "tail"}-${idx}`}>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {renderCrumb(node, shouldCollapse ? path.length - tail.length + idx : idx + 1)}
        </Fragment>
      ))}
    </div>
  )
}
