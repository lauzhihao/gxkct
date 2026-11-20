export const RESOURCE_FILE_DRAG_MIME = "application/x-gxkct-resource-file"

export function dragTypeListIncludes(types: Iterable<string> | ArrayLike<string>, value: string): boolean {
  return Array.from(types).includes(value)
}

/**
 * 取出 draggedId，再插回拖拽开始时 targetId 的下标。
 * [A,B,C] 把 A 拖到 B 上得到 [B,A,C]；拖到 C 上得到 [B,C,A]；把 C 拖到 A 上得到 [C,A,B]。
 * 同一个文件、或任一 id 不在列表里时返回 null，调用方不发保存请求。
 */
export function moveResourceFile<T extends { id: string }>(
  items: readonly T[],
  draggedId: string,
  targetId: string,
): T[] | null {
  if (draggedId === targetId) {
    return null
  }
  const from = items.findIndex((item) => item.id === draggedId)
  const to = items.findIndex((item) => item.id === targetId)
  if (from < 0 || to < 0) {
    return null
  }
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  if (!moved) {
    return null
  }
  next.splice(to, 0, moved)
  return next
}
