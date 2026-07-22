export type ResourceInteractionMode = "normal" | "batch"
export type ResourceBatchTransferAction = "copy" | "move"

export interface ResourceInteractionState {
  mode: ResourceInteractionMode
  selectedIds: Set<string>
}

export interface ResourceBatchTransferEligibility {
  mode: ResourceInteractionMode
  courseEditable: boolean
  selectedCount: number
  nodeId: string | null
  sourceFolderId: string | null
  needInitialization: boolean
  isLoading: boolean
  isBatchDownloading: boolean
  isDeleting: boolean
  isBatchTransferring: boolean
}

export interface ResourceDestinationEligibility {
  sourceFolderId: string
  targetFolderId: string | null
  isLoading: boolean
  isSubmitting: boolean
}

export interface ResourceBatchTransferSnapshot {
  action: ResourceBatchTransferAction
  sourceFolderId: string
  objectIds: readonly string[]
}

export interface ResourceBatchActionOutcome {
  succeededIds: readonly string[]
  failedIds: readonly string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readRequiredIdentifier(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label}缺失或无效`)
  }
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    throw new Error(`${label}缺失或无效`)
  }
  return normalizedValue
}

export function canStartResourceBatchTransfer(
  eligibility: ResourceBatchTransferEligibility,
): boolean {
  if (eligibility.mode !== "batch") {
    return false
  }
  if (!eligibility.courseEditable) {
    return false
  }
  if (!Number.isInteger(eligibility.selectedCount)) {
    throw new Error("批量选择数量无效")
  }
  if (eligibility.selectedCount < 1) {
    return false
  }
  if (eligibility.nodeId === null) {
    return false
  }
  if (eligibility.sourceFolderId === null) {
    return false
  }
  if (eligibility.needInitialization) {
    return false
  }
  if (eligibility.isLoading) {
    return false
  }
  if (eligibility.isBatchDownloading) {
    return false
  }
  if (eligibility.isDeleting) {
    return false
  }
  if (eligibility.isBatchTransferring) {
    return false
  }
  return true
}

export function canConfirmResourceDestination(
  eligibility: ResourceDestinationEligibility,
): boolean {
  if (eligibility.targetFolderId === null) {
    return false
  }
  if (eligibility.targetFolderId === eligibility.sourceFolderId) {
    return false
  }
  if (eligibility.isLoading) {
    return false
  }
  if (eligibility.isSubmitting) {
    return false
  }
  return true
}

export function createResourceBatchTransferSnapshot(
  action: ResourceBatchTransferAction,
  sourceFolderId: string,
  selectedIds: ReadonlySet<string>,
): ResourceBatchTransferSnapshot {
  const normalizedSourceFolderId = readRequiredIdentifier(
    sourceFolderId,
    "源目录 ID",
  )
  if (selectedIds.size === 0) {
    throw new Error("未选择要处理的资源")
  }

  const objectIds: string[] = []
  for (const selectedId of selectedIds) {
    objectIds.push(readRequiredIdentifier(selectedId, "资源对象 ID"))
  }
  return {
    action,
    sourceFolderId: normalizedSourceFolderId,
    objectIds,
  }
}

export function parseResourceBatchActionOutcome(
  value: unknown,
  requestedObjectIds: readonly string[],
): ResourceBatchActionOutcome {
  if (!isRecord(value)) {
    throw new Error("批量操作响应格式无效")
  }
  if (!Array.isArray(value.succeeded)) {
    throw new Error("批量操作响应 succeeded 缺失或无效")
  }
  if (!Array.isArray(value.failed)) {
    throw new Error("批量操作响应 failed 缺失或无效")
  }

  const requestedIds = new Set<string>()
  for (const requestedObjectId of requestedObjectIds) {
    const normalizedObjectId = readRequiredIdentifier(
      requestedObjectId,
      "请求资源对象 ID",
    )
    if (requestedIds.has(normalizedObjectId)) {
      throw new Error("请求资源对象 ID 重复")
    }
    requestedIds.add(normalizedObjectId)
  }
  if (requestedIds.size === 0) {
    throw new Error("批量操作请求对象为空")
  }

  const succeededIds: string[] = []
  const failedIds: string[] = []
  const returnedIds = new Set<string>()
  for (const succeededValue of value.succeeded) {
    const succeededId = readRequiredIdentifier(
      succeededValue,
      "成功资源对象 ID",
    )
    if (!requestedIds.has(succeededId)) {
      throw new Error("批量操作响应包含未请求的成功对象")
    }
    if (returnedIds.has(succeededId)) {
      throw new Error("批量操作响应包含重复对象")
    }
    returnedIds.add(succeededId)
    succeededIds.push(succeededId)
  }
  for (const failedValue of value.failed) {
    if (!isRecord(failedValue)) {
      throw new Error("批量操作失败项格式无效")
    }
    const failedId = readRequiredIdentifier(
      failedValue.objectId,
      "失败资源对象 ID",
    )
    readRequiredIdentifier(failedValue.errorCode, "批量操作错误码")
    readRequiredIdentifier(failedValue.message, "批量操作错误信息")
    if (!requestedIds.has(failedId)) {
      throw new Error("批量操作响应包含未请求的失败对象")
    }
    if (returnedIds.has(failedId)) {
      throw new Error("批量操作响应包含重复对象")
    }
    returnedIds.add(failedId)
    failedIds.push(failedId)
  }
  if (returnedIds.size !== requestedIds.size) {
    throw new Error("批量操作响应未覆盖全部请求对象")
  }

  return { succeededIds, failedIds }
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
