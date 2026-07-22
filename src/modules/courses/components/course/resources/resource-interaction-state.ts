export type ResourceInteractionMode = "normal" | "batch"
export type ResourceBatchTransferAction = "copy" | "move"
export type ResourceClipboardPhase = "preparing" | "ready"
export type ResourceClipboardOwnerType = "course" | "department" | "major" | "university"
export type ResourceFingerprintKind = "version" | "etag" | "checksum"

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

export interface ResourceFingerprint {
  kind: ResourceFingerprintKind
  value: string
}

export interface ResourceClipboardItem {
  objectId: string
  fingerprint: ResourceFingerprint | null
  verificationError: string | null
}

export interface ResourceClipboardSnapshot {
  requestId: number
  action: ResourceBatchTransferAction
  sourceNodeId: string
  sourceOwnerType: ResourceClipboardOwnerType
  sourceFolderId: string
  items: readonly ResourceClipboardItem[]
  phase: ResourceClipboardPhase
}

export interface ResourcePasteEligibility {
  clipboard: ResourceClipboardSnapshot | null
  nodeId: string | null
  ownerType: ResourceClipboardOwnerType
  targetFolderId: string | null
  courseEditable: boolean
  isLoading: boolean
  isSubmitting: boolean
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

export function normalizeResourceClipboardOwnerType(
  ownerType: ResourceClipboardOwnerType | undefined,
): ResourceClipboardOwnerType {
  if (ownerType === undefined) {
    return "course"
  }
  return ownerType
}

export function canPasteResourceClipboard(
  eligibility: ResourcePasteEligibility,
): boolean {
  if (eligibility.clipboard === null) {
    return false
  }
  if (eligibility.clipboard.phase !== "ready") {
    return false
  }
  if (!eligibility.courseEditable) {
    return false
  }
  if (eligibility.nodeId === null) {
    return false
  }
  if (eligibility.clipboard.sourceNodeId !== eligibility.nodeId) {
    return false
  }
  if (eligibility.clipboard.sourceOwnerType !== eligibility.ownerType) {
    return false
  }
  if (eligibility.targetFolderId === null) {
    return false
  }
  if (eligibility.targetFolderId === eligibility.clipboard.sourceFolderId) {
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

export function createPreparingResourceClipboard(
  requestId: number,
  action: ResourceBatchTransferAction,
  sourceNodeId: string,
  sourceOwnerType: ResourceClipboardOwnerType,
  sourceFolderId: string,
  selectedIds: ReadonlySet<string>,
): ResourceClipboardSnapshot {
  if (!Number.isSafeInteger(requestId)) {
    throw new Error("剪贴板请求 ID 无效")
  }
  if (requestId < 1) {
    throw new Error("剪贴板请求 ID 无效")
  }
  const normalizedSourceNodeId = readRequiredIdentifier(
    sourceNodeId,
    "源节点 ID",
  )
  const normalizedSourceFolderId = readRequiredIdentifier(
    sourceFolderId,
    "源目录 ID",
  )
  if (selectedIds.size === 0) {
    throw new Error("未选择要处理的资源")
  }

  const items: ResourceClipboardItem[] = []
  for (const selectedId of selectedIds) {
    items.push({
      objectId: readRequiredIdentifier(selectedId, "资源对象 ID"),
      fingerprint: null,
      verificationError: null,
    })
  }
  return {
    requestId,
    action,
    sourceNodeId: normalizedSourceNodeId,
    sourceOwnerType,
    sourceFolderId: normalizedSourceFolderId,
    items,
    phase: "preparing",
  }
}

function readFingerprintField(
  value: unknown,
  kind: ResourceFingerprintKind,
): ResourceFingerprint | null {
  if (value === undefined) {
    return null
  }
  if (value === null) {
    return null
  }
  if (typeof value !== "string") {
    throw new Error(`资源 ${kind} 无效`)
  }
  const normalizedValue = value.trim()
  if (normalizedValue.length === 0) {
    throw new Error(`资源 ${kind} 无效`)
  }
  return { kind, value }
}

export function readResourceFingerprint(value: unknown): ResourceFingerprint {
  if (!isRecord(value)) {
    throw new Error("资源详情格式无效")
  }

  const versionFingerprint = readFingerprintField(value.version, "version")
  if (versionFingerprint !== null) {
    return versionFingerprint
  }
  const etagFingerprint = readFingerprintField(value.etag, "etag")
  if (etagFingerprint !== null) {
    return etagFingerprint
  }
  const checksumFingerprint = readFingerprintField(value.checksum, "checksum")
  if (checksumFingerprint !== null) {
    return checksumFingerprint
  }
  throw new Error("资源详情缺少可验证 fingerprint")
}

export function completeResourceClipboard(
  clipboard: ResourceClipboardSnapshot,
  items: readonly ResourceClipboardItem[],
): ResourceClipboardSnapshot {
  if (clipboard.phase !== "preparing") {
    throw new Error("只能完成正在准备的剪贴板")
  }
  if (items.length !== clipboard.items.length) {
    throw new Error("剪贴板资源数量不一致")
  }

  for (let index = 0; index < items.length; index += 1) {
    const sourceItem = clipboard.items[index]
    const completedItem = items[index]
    if (sourceItem === undefined) {
      throw new Error("剪贴板源资源缺失")
    }
    if (completedItem === undefined) {
      throw new Error("剪贴板资源缺失")
    }
    if (sourceItem.objectId !== completedItem.objectId) {
      throw new Error("剪贴板资源顺序不一致")
    }
    const hasFingerprint = completedItem.fingerprint !== null
    const hasVerificationError = completedItem.verificationError !== null
    if (hasFingerprint === hasVerificationError) {
      throw new Error("剪贴板资源验证状态无效")
    }
  }

  return {
    ...clipboard,
    items: [...items],
    phase: "ready",
  }
}

export function resourceFingerprintMatches(
  expected: ResourceFingerprint,
  currentDetail: unknown,
): boolean {
  const current = readResourceFingerprint(currentDetail)
  return current.kind === expected.kind && current.value === expected.value
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
