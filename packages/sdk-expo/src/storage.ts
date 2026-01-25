import type { Config } from '@togglebox/configs'
import type { Flag } from '@togglebox/flags'
import type { Experiment } from '@togglebox/experiments'
import type { StoredData, StorageAdapter } from './types'

const STORAGE_KEY_PREFIX = '@togglebox/config'

/**
 * MMKV storage wrapper for persisting configs, flags, and experiments.
 *
 * Uses react-native-mmkv for high-performance synchronous storage.
 * MMKV is significantly faster than AsyncStorage and doesn't have
 * the reliability issues that AsyncStorage has on some devices.
 *
 * @remarks
 * - MMKV operations are synchronous but wrapped in async for API consistency
 * - Data is stored as JSON strings with TTL metadata
 * - Expired data is automatically cleaned up on load
 */
export class Storage {
  private platform: string
  private environment: string
  private ttl: number
  private storage: StorageAdapter | null = null
  private initPromise: Promise<void> | null = null

  constructor(platform: string, environment: string, ttl: number = 86400000) {
    this.platform = platform
    this.environment = environment
    this.ttl = ttl
  }

  /**
   * Initialize MMKV storage lazily.
   * This allows the SDK to work without MMKV if persistToStorage is false.
   */
  private async initStorage(): Promise<void> {
    if (this.storage) return
    if (this.initPromise) return this.initPromise

    this.initPromise = (async () => {
      try {
        // Dynamic import to avoid requiring MMKV if not using persistence
        const { MMKV } = await import('react-native-mmkv')
        this.storage = new MMKV({
          id: `togglebox-${this.platform}-${this.environment}`,
        })
      } catch (error) {
        console.error(
          'Failed to initialize MMKV. Make sure react-native-mmkv is installed:',
          error
        )
        throw new Error(
          'react-native-mmkv is required for persistToStorage feature. ' +
          'Install it with: npm install react-native-mmkv'
        )
      }
    })()

    return this.initPromise
  }

  /**
   * Get storage key for this platform/environment
   */
  private getKey(): string {
    return `${STORAGE_KEY_PREFIX}/${this.platform}/${this.environment}`
  }

  /**
   * Load config, flags, and experiments from storage.
   *
   * @returns Stored data if valid and not expired, null otherwise
   */
  async load(): Promise<{ config: Config; flags: Flag[]; experiments: Experiment[] } | null> {
    try {
      await this.initStorage()
      if (!this.storage) return null

      const key = this.getKey()
      const json = this.storage.getString(key)

      if (!json) {
        return null
      }

      const data: StoredData = JSON.parse(json)

      // Check if data has expired
      const now = Date.now()
      if (now - data.timestamp > data.ttl) {
        // Data expired, remove it
        this.storage.delete(key)
        return null
      }

      return {
        config: data.config,
        flags: data.flags,
        experiments: data.experiments,
      }
    } catch (error) {
      console.error('Failed to load from MMKV:', error)
      return null
    }
  }

  /**
   * Save config, flags, and experiments to storage.
   *
   * @param config - Configuration data to store (Tier 1)
   * @param flags - Feature flags to store (Tier 2)
   * @param experiments - Experiments to store (Tier 3)
   */
  async save(config: Config, flags: Flag[], experiments: Experiment[]): Promise<void> {
    try {
      await this.initStorage()
      if (!this.storage) return

      const key = this.getKey()
      const data: StoredData = {
        config,
        flags,
        experiments,
        timestamp: Date.now(),
        ttl: this.ttl,
      }

      this.storage.set(key, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save to MMKV:', error)
    }
  }

  /**
   * Clear stored data for this platform/environment.
   */
  async clear(): Promise<void> {
    try {
      await this.initStorage()
      if (!this.storage) return

      const key = this.getKey()
      this.storage.delete(key)
    } catch (error) {
      console.error('Failed to clear MMKV:', error)
    }
  }

  /**
   * Clear all ToggleBox stored data across all platforms/environments.
   */
  async clearAll(): Promise<void> {
    try {
      await this.initStorage()
      if (!this.storage) return

      const allKeys = this.storage.getAllKeys()
      const toggleboxKeys = allKeys.filter(key => key.startsWith(STORAGE_KEY_PREFIX))

      for (const key of toggleboxKeys) {
        this.storage.delete(key)
      }
    } catch (error) {
      console.error('Failed to clear all MMKV data:', error)
    }
  }
}
