import type { TreeNodeManager, TreeNodeMenuItem } from "@/types"

export interface MajorCacheItem {
  majorId: string
  majorName: string
  btnMenus: TreeNodeMenuItem[]
  coverMenus: TreeNodeMenuItem[]
  managers: TreeNodeManager[]
  source?: string
}

const MAJOR_CACHE_KEY = "education-major-cache"

function isCacheRecord(value: unknown): value is Record<string, MajorCacheItem> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function getAllMajorCache(): Record<string, MajorCacheItem> {
  if (typeof window === "undefined") return {}

  try {
    const cached = sessionStorage.getItem(MAJOR_CACHE_KEY)
    if (!cached) {
      return {}
    }

    const parsed = JSON.parse(cached) as unknown
    if (!isCacheRecord(parsed)) {
      return {}
    }

    return parsed
  } catch {
    return {}
  }
}

export function getMajorCache(majorId: string): MajorCacheItem | null {
  if (!majorId) {
    return null
  }

  const cache = getAllMajorCache()
  return cache[majorId] ?? null
}

export function setMajorCacheBatch(items: MajorCacheItem[]): void {
  if (typeof window === "undefined") return

  try {
    const cache = getAllMajorCache()
    items.forEach((item) => {
      if (!item.majorId) {
        return
      }

      cache[item.majorId] = item
    })
    sessionStorage.setItem(MAJOR_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[MajorCache] 批量写入缓存失败:", error)
  }
}
