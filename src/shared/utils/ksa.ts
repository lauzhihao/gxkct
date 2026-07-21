import type { KsaItemData } from "@/components/canvas-elements/types"

const LEGACY_CANVAS_KSA_ID_PATTERN = /^ksa_[KSA]_\d+$/i

function normalizeId(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value).trim()
}

export function isLegacyCanvasKsaId(value: string | number | null | undefined): boolean {
  return LEGACY_CANVAS_KSA_ID_PATTERN.test(normalizeId(value))
}

export function getKsaReferenceId(item: {
  id?: string | number | null
  originalId?: number | null
}): string {
  const rawId = normalizeId(item.id)
  if (typeof item.originalId === "number" && item.originalId > 0) {
    return String(item.originalId)
  }
  return rawId
}

export function getKsaMatchIds(item: {
  id?: string | number | null
  originalId?: number | null
}): string[] {
  const ids = new Set<string>()
  const rawId = normalizeId(item.id)
  if (rawId) {
    ids.add(rawId)
  }
  if (typeof item.originalId === "number" && item.originalId > 0) {
    ids.add(String(item.originalId))
  }
  return Array.from(ids)
}

export function matchesKsaReferenceId(
  item: {
    id?: string | number | null
    originalId?: number | null
  },
  referenceId: string | number | null | undefined
): boolean {
  const normalizedReferenceId = normalizeId(referenceId)
  if (!normalizedReferenceId) {
    return false
  }
  return getKsaMatchIds(item).includes(normalizedReferenceId)
}

export function findKsaByReference<T extends KsaItemData>(
  items: T[] | undefined,
  referenceId: string | number | null | undefined
): T | undefined {
  if (!items || items.length === 0) {
    return undefined
  }
  return items.find((item) => matchesKsaReferenceId(item, referenceId))
}
