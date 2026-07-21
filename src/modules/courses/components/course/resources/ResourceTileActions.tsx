"use client"

import { Eye, PencilLine, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn } from "@/shared/utils/utils"

interface ResourceTileActionsProps {
  name: string
  selected: boolean
  onPreview?: () => void
  onRename?: () => void
  onDelete?: () => void
}

export function ResourceTileActions({
  name,
  selected,
  onPreview,
  onRename,
  onDelete,
}: ResourceTileActionsProps) {
  const actionGroupClass = cn(
    "absolute right-2 top-2 flex items-center gap-1 transition-opacity",
    selected
      ? "pointer-events-auto opacity-100"
      : "pointer-events-none opacity-0 group-hover/tile:pointer-events-auto group-hover/tile:opacity-100 group-focus-within/tile:pointer-events-auto group-focus-within/tile:opacity-100 [@media(hover:none)]:pointer-events-auto [@media(hover:none)]:opacity-100",
  )
  const actionButtonClass =
    "h-8 w-8 rounded-full bg-background/90 text-muted-foreground shadow-sm ring-1 ring-border/70 backdrop-blur-sm hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"

  const stopAndRun = (
    event: React.MouseEvent<HTMLButtonElement>,
    action: () => void,
  ) => {
    event.stopPropagation()
    action()
  }

  return (
    <div className={actionGroupClass}>
      {typeof onPreview === "function" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={actionButtonClass}
          aria-label={`预览${name}`}
          onClick={(event) => stopAndRun(event, onPreview)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ) : null}
      {typeof onRename === "function" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={actionButtonClass}
          aria-label={`重命名${name}`}
          onClick={(event) => stopAndRun(event, onRename)}
        >
          <PencilLine className="h-4 w-4" />
        </Button>
      ) : null}
      {typeof onDelete === "function" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(actionButtonClass, "text-destructive hover:text-destructive")}
          aria-label={`删除${name}`}
          onClick={(event) => stopAndRun(event, onDelete)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  )
}
