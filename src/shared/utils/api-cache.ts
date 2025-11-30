/**
 * API 缓存管理工具类
 * 提供带 TTL（生存时间）的缓存机制
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
}

export class ApiCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private ttl: number

  /**
   * @param ttl 缓存生存时间（毫秒）
   */
  constructor(ttl: number = 60000) {
    this.ttl = ttl
  }

  /**
   * 获取缓存数据
   * @param key 缓存键
   * @returns 缓存的数据，如果不存在或已过期则返回 null
   */
  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    const now = Date.now()
    const isExpired = now - entry.timestamp > this.ttl

    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  /**
   * 设置缓存数据
   * @param key 缓存键
   * @param data 要缓存的数据
   */
  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }

  /**
   * 使指定缓存失效
   * @param key 缓存键
   */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 使符合模式的所有缓存失效
   * @param pattern 匹配模式（支持简单的前缀匹配）
   */
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.cache.keys())
    keys.forEach((key) => {
      if (key.startsWith(pattern)) {
        this.cache.delete(key)
      }
    })
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size
  }
}
