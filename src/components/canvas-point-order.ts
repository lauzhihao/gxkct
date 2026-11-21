export type InsertionEdge = "before" | "after"

export interface ResolvedCoursePointSequence {
  sequence: number
  clamped: boolean
}

// 落点方向对应 use-sortable-row-reorder 里现有的插入：
// 先 splice 掉原位置，再按目标原下标插回去。向下拖会落在目标后面，向上拖落在目标前面。
export function insertionEdge(fromIndex: number, overIndex: number): InsertionEdge | null {
  if (fromIndex < 0 || overIndex < 0 || fromIndex === overIndex) {
    return null
  }

  return fromIndex < overIndex ? "after" : "before"
}

export function moveItemToSequence<T>(items: readonly T[], fromIndex: number, sequence: number): T[] {
  const finalIndex = sequence - 1
  if (
    fromIndex < 0
    || fromIndex >= items.length
    || finalIndex < 0
    || finalIndex >= items.length
    || fromIndex === finalIndex
  ) {
    return [...items]
  }

  const nextItems = [...items]
  const [movedItem] = nextItems.splice(fromIndex, 1)
  nextItems.splice(finalIndex, 0, movedItem)
  return nextItems
}

export function resolveCoursePointSequence(raw: string, length: number): ResolvedCoursePointSequence | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed) || length <= 0) {
    return null
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null
  }

  if (parsed > length) {
    return { sequence: length, clamped: true }
  }

  return { sequence: parsed, clamped: false }
}
