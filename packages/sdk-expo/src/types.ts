import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'

/**
 * Provider configuration options
 */
export interface ToggleBoxProviderProps {
  /** Platform name */
  platform: string

  /** Environment name */
  environment: string

  /**
   * API base URL (for open source self-hosted)
   * @remarks Use tenantSubdomain for cloud deployments
   */
  apiUrl?: string

  /**
   * Tenant subdomain for cloud deployments
   * @remarks Automatically constructs apiUrl as https://{tenantSubdomain}.togglebox.io
   * @example 'acme' → https://acme.togglebox.io
   */
  tenantSubdomain?: string

  /** Cache configuration */
  cache?: {
    enabled: boolean
    ttl: number
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /**
   * Config version to fetch (default: 'stable')
   * @remarks
   * - 'stable': Latest stable version (default)
   * - 'latest': Latest version (may be unstable)
   * - '1.2.3': Specific version label
   */
  configVersion?: string

  /**
   * Enable persistent storage with MMKV.
   *
   * @remarks
   * Requires react-native-mmkv to be installed as a peer dependency.
   * MMKV is significantly faster and more reliable than AsyncStorage.
   *
   * @example
   * ```tsx
   * <ToggleBoxProvider
   *   platform="mobile"
   *   environment="production"
   *   tenantSubdomain="acme"
   *   persistToStorage={true}
   *   storageTTL={86400000} // 24 hours
   * >
   *   {children}
   * </ToggleBoxProvider>
   * ```
   */
  persistToStorage?: boolean

  /** Storage TTL in milliseconds (default: 24 hours) */
  storageTTL?: number

  /** Children components */
  children: React.ReactNode
}

/**
 * Context value provided to components
 */
export interface ToggleBoxContextValue {
  /** Current configuration (Tier 1) */
  config: Config | null

  /** Current feature flags - 2-value model (Tier 2) */
  flags: Flag[]

  /** Current experiments (Tier 3) */
  experiments: Experiment[]

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh config, flags, and experiments */
  refresh: () => Promise<void>

  /** Check if a flag is enabled */
  isFlagEnabled: (flagKey: string, context?: FlagContext) => Promise<boolean>

  /** Get experiment variant for a user */
  getVariant: (experimentKey: string, context: ExperimentContext) => Promise<string | null>
}

/**
 * Stored data structure for MMKV persistence
 */
export interface StoredData {
  config: Config
  flags: Flag[]
  experiments: Experiment[]
  timestamp: number
  ttl: number
}

/**
 * Storage adapter interface matching MMKV's API.
 *
 * @remarks
 * This interface abstracts the storage implementation to allow for
 * potential future storage backends while maintaining type safety.
 */
export interface StorageAdapter {
  /** Get a string value by key */
  getString(key: string): string | undefined

  /** Set a string value */
  set(key: string, value: string): void

  /** Delete a key */
  delete(key: string): void

  /** Get all keys in storage */
  getAllKeys(): string[]
}

// Re-export context types for convenience
export type { FlagContext, ExperimentContext }
