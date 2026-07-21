import type { TreeNodeManager, TreeNodeMenuItem } from "@/types"

export interface MajorCacheItem {
  majorId: string
  majorName: string
  btnMenus: TreeNodeMenuItem[]
  coverMenus: TreeNodeMenuItem[]
  managers: TreeNodeManager[]
  departmentId?: string
  semesterId?: number | null
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

export function syncMajorCacheForDepartment(
  departmentId: string,
  semesterId: number | null | undefined,
  items: MajorCacheItem[],
): void {
  if (typeof window === "undefined" || !departmentId) return

  try {
    const cache = getAllMajorCache()
    const normalizedSemesterId = typeof semesterId === "number" && Number.isFinite(semesterId)
      ? semesterId
      : null

    Object.entries(cache).forEach(([majorId, item]) => {
      const itemDepartmentId = typeof item.departmentId === "string" ? item.departmentId : ""
      const itemSemesterId = typeof item.semesterId === "number" && Number.isFinite(item.semesterId)
        ? item.semesterId
        : null

      if (itemDepartmentId === departmentId && itemSemesterId === normalizedSemesterId) {
        delete cache[majorId]
      }
    })

    items.forEach((item) => {
      if (!item.majorId) {
        return
      }

      cache[item.majorId] = item
    })

    sessionStorage.setItem(MAJOR_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[MajorCache] 同步院系缓存失败:", error)
  }
}

export function clearMajorCacheForDepartment(
  departmentId: string,
  semesterId?: number | null,
): void {
  if (typeof window === "undefined" || !departmentId) return

  try {
    const cache = getAllMajorCache()
    const normalizedSemesterId = typeof semesterId === "number" && Number.isFinite(semesterId)
      ? semesterId
      : null

    Object.entries(cache).forEach(([majorId, item]) => {
      const itemDepartmentId = typeof item.departmentId === "string" ? item.departmentId : ""
      const itemSemesterId = typeof item.semesterId === "number" && Number.isFinite(item.semesterId)
        ? item.semesterId
        : null

      if (itemDepartmentId === departmentId && itemSemesterId === normalizedSemesterId) {
        delete cache[majorId]
      }
    })

    sessionStorage.setItem(MAJOR_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[MajorCache] 清理院系缓存失败:", error)
  }
}

export function removeMajorCache(majorId: string): void {
  if (typeof window === "undefined" || !majorId) return

  try {
    const cache = getAllMajorCache()
    if (!(majorId in cache)) {
      return
    }

    delete cache[majorId]
    sessionStorage.setItem(MAJOR_CACHE_KEY, JSON.stringify(cache))
  } catch (error) {
    console.error("[MajorCache] 删除缓存失败:", error)
  }
}

export function clearMajorCache(): void {
  if (typeof window === "undefined") return

  try {
    sessionStorage.removeItem(MAJOR_CACHE_KEY)
  } catch (error) {
    console.error("[MajorCache] 清空缓存失败:", error)
  }
}
