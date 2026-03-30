import type { DragEventHandler } from "react"
import { cn } from "@/shared/utils/utils"

interface SortableOrderTagProps {
  order: number
  draggable?: boolean
  disabled?: boolean
  isDragging?: boolean
  onDragStart?: DragEventHandler<HTMLButtonElement>
  onDragEnd?: DragEventHandler<HTMLButtonElement>
  ariaLabel?: string
  title?: string
  className?: string
}

export function SortableOrderTag({
  order,
  draggable = false,
  disabled = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  ariaLabel,
  title,
  className,
}: SortableOrderTagProps) {
  const canDrag = draggable && !disabled
  const resolvedTitle = typeof title === "string"
    ? title
    : canDrag
      ? "拖动调整顺序"
      : "当前无法拖动排序"

  return (
    <button
      type="button"
      draggable={canDrag}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "inline-flex min-w-10 select-none items-center justify-center rounded-full border px-3 py-1.5 text-sm font-semibold tabular-nums shadow-sm transition-transform duration-200",
        "origin-center will-change-transform",
        isDragging
          ? "scale-[1.2] border-primary bg-primary text-primary-foreground shadow-md cursor-grabbing"
          : "",
        canDrag
          ? "border-primary/20 bg-primary/10 text-primary cursor-grab hover:scale-[1.2] hover:border-primary/30 hover:bg-primary/15"
          : "border-primary/10 bg-primary/5 text-primary/50 cursor-not-allowed",
        className,
      )}
      title={resolvedTitle}
      aria-label={ariaLabel}
      disabled={!canDrag}
    >
      {order}
    </button>
  )
}

export default SortableOrderTag
