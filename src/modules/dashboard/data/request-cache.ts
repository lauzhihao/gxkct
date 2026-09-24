/** 看板请求缓存：同一会话内切换层级或下钻不重复拉取；失败的请求不缓存，重试时整体清空 */

const CACHE_TTL_MS = 5 * 60 * 1000

interface CacheEntry {
  expiresAt: number
  promise: Promise<unknown>
}

const cache = new Map<string, CacheEntry>()

export function cachedRequest<T>(key: string, request: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const hit = cache.get(key)
  if (hit !== undefined && hit.expiresAt > now) {
    return hit.promise as Promise<T>
  }

  const promise = request()
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, promise })
  promise.catch(() => {
    const current = cache.get(key)
    if (current !== undefined && current.promise === promise) cache.delete(key)
  })
  return promise
}

export function clearDashboardCache(): void {
  cache.clear()
}
