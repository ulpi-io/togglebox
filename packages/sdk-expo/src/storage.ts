import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Config, FeatureFlag } from '@togglebox/core'
import type { StoredData } from './types'

const STORAGE_KEY_PREFIX = '@togglebox/config'

/**
 * AsyncStorage wrapper for persisting configs
 */
export class Storage {
  private platform: string
  private environment: string
  private ttl: number

  constructor(platform: string, environment: string, ttl: number = 86400000) {
    this.platform = platform
    this.environment = environment
    this.ttl = ttl
  }

  /**
   * Get storage key for this platform/environment
   */
  private getKey(): string {
    return `${STORAGE_KEY_PREFIX}/${this.platform}/${this.environment}`
  }

  /**
   * Load config and flags from storage
   */
  async load(): Promise<{ config: Config; flags: FeatureFlag[] } | null> {
    try {
      const key = this.getKey()
      const json = await AsyncStorage.getItem(key)

      if (!json) {
        return null
      }

      const data: StoredData = JSON.parse(json)

      // Check if data has expired
      const now = Date.now()
      if (now - data.timestamp > data.ttl) {
        // Data expired, remove it
        await AsyncStorage.removeItem(key)
        return null
      }

      return {
        config: data.config,
        flags: data.flags,
      }
    } catch (error) {
      console.error('Failed to load from AsyncStorage:', error)
      return null
    }
  }

  /**
   * Save config and flags to storage
   */
  async save(config: Config, flags: FeatureFlag[]): Promise<void> {
    try {
      const key = this.getKey()
      const data: StoredData = {
        config,
        flags,
        timestamp: Date.now(),
        ttl: this.ttl,
      }

      await AsyncStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error('Failed to save to AsyncStorage:', error)
    }
  }

  /**
   * Clear stored data
   */
  async clear(): Promise<void> {
    try {
      const key = this.getKey()
      await AsyncStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear AsyncStorage:', error)
    }
  }
}
