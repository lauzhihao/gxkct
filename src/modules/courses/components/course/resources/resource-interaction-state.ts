export type ResourceInteractionMode = "normal" | "batch"

export interface ResourceInteractionState {
  mode: ResourceInteractionMode
  selectedIds: Set<string>
}

export function toggleResourceSelection(
  mode: ResourceInteractionMode,
  selectedIds: ReadonlySet<string>,
  objectId: string,
): Set<string> {
  if (mode === "normal") {
    return selectedIds.size === 1 && selectedIds.has(objectId)
      ? new Set<string>()
      : new Set([objectId])
  }

  const nextIds = new Set(selectedIds)
  if (nextIds.has(objectId)) {
    nextIds.delete(objectId)
  } else {
    nextIds.add(objectId)
  }
  return nextIds
}

export function changeResourceInteractionMode(
  mode: ResourceInteractionMode,
): ResourceInteractionState {
  return {
    mode,
    selectedIds: new Set<string>(),
  }
}
