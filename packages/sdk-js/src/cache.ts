import type { CacheOptions } from './types'

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

/**
 * In-memory cache with TTL support
 */
export class Cache {
  private store: Map<string, CacheEntry<any>>
  private options: CacheOptions

  constructor(options: CacheOptions = { enabled: true, ttl: 300000 }) {
    this.store = new Map()
    this.options = options
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    if (!this.options.enabled) {
      return null
    }

    const entry = this.store.get(key)
    if (!entry) {
      return null
    }

    // Check if entry has expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.store.delete(key)
      return null
    }

    return entry.data as T
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, data: T, ttl?: number): void {
    if (!this.options.enabled) {
      return
    }

    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.options.ttl,
    })
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.store.delete(key)
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear()
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null
  }
}
