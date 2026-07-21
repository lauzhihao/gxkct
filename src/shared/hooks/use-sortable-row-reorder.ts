import { useCallback, useEffect, useState, type Dispatch, type DragEvent, type SetStateAction } from "react"

interface UseSortableRowReorderOptions<T> {
  items: T[]
  setItems: Dispatch<SetStateAction<T[]>>
  getItemId: (item: T) => string
  enabled?: boolean
  onReorderComplete?: (reorderedItems: T[]) => T[] | void
}

interface UseSortableRowReorderResult {
  draggedItemId: string | null
  dragOverIndex: number | null
  handleDragStart: (event: DragEvent<HTMLElement>, itemId: string) => void
  handleDragEnd: () => void
  handleDragOver: (event: DragEvent<HTMLElement>, index: number) => void
  handleDragLeave: (event: DragEvent<HTMLElement>) => void
  handleDrop: (event: DragEvent<HTMLElement>, targetIndex: number) => void
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, movedItem)
  return nextItems
}

export function useSortableRowReorder<T>({
  items,
  setItems,
  getItemId,
  enabled = true,
  onReorderComplete,
}: UseSortableRowReorderOptions<T>): UseSortableRowReorderResult {
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const resetDragState = useCallback(() => {
    setDraggedItemId(null)
    setDragOverIndex(null)
  }, [])

  useEffect(() => {
    if (draggedItemId === null) {
      return
    }

    const hasDraggedItem = items.some((item) => getItemId(item) === draggedItemId)

    if (!hasDraggedItem) {
      resetDragState()
    }
  }, [draggedItemId, getItemId, items, resetDragState])

  useEffect(() => {
    if (!enabled) {
      resetDragState()
    }
  }, [enabled, resetDragState])

  const handleDragStart = useCallback((event: DragEvent<HTMLElement>, itemId: string) => {
    if (!enabled) {
      return
    }

    event.stopPropagation()
    event.dataTransfer.effectAllowed = "move"
    event.dataTransfer.setData("text/plain", itemId)
    setDraggedItemId(itemId)
  }, [enabled])

  const handleDragEnd = useCallback(() => {
    resetDragState()
  }, [resetDragState])

  const handleDragOver = useCallback((event: DragEvent<HTMLElement>, index: number) => {
    if (!enabled || draggedItemId === null) {
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
    setDragOverIndex(index)
  }, [enabled, draggedItemId])

  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget

    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) {
      return
    }

    setDragOverIndex(null)
  }, [])

  const handleDrop = useCallback((event: DragEvent<HTMLElement>, targetIndex: number) => {
    if (!enabled) {
      return
    }

    event.preventDefault()

    const draggedItemIdFromEvent = event.dataTransfer.getData("text/plain")
    const resolvedDraggedItemId = draggedItemIdFromEvent.length > 0
      ? draggedItemIdFromEvent
      : draggedItemId

    if (!resolvedDraggedItemId) {
      resetDragState()
      return
    }

    const draggedIndex = items.findIndex((item) => getItemId(item) === resolvedDraggedItemId)

    if (draggedIndex === -1 || draggedIndex === targetIndex) {
      resetDragState()
      return
    }

    const reorderedItems = moveItem(items, draggedIndex, targetIndex)
    const callbackResult = onReorderComplete ? onReorderComplete(reorderedItems) : undefined
    const finalItems = typeof callbackResult === "undefined" ? reorderedItems : callbackResult

    setItems(finalItems)
    resetDragState()
  }, [draggedItemId, enabled, getItemId, items, onReorderComplete, resetDragState, setItems])

  return {
    draggedItemId,
    dragOverIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}

export default useSortableRowReorder
