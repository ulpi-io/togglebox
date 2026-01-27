import type { ToggleBoxClient } from '@togglebox/sdk'
import type { Config } from '@togglebox/configs'
import type { Flag, EvaluationContext as FlagContext } from '@togglebox/flags'
import type { Experiment, ExperimentContext } from '@togglebox/experiments'

/**
 * Conversion data for experiment tracking
 */
export interface ConversionData {
  metricName: string
  value?: number
}

/**
 * Event data for custom event tracking
 */
export interface EventData {
  experimentKey?: string
  variationKey?: string
  properties?: Record<string, unknown>
}

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

  /**
   * Track a conversion event for an experiment.
   *
   * @param experimentKey - The experiment key
   * @param context - Experiment context (userId required)
   * @param data - Conversion data (metricName, optional value)
   *
   * @example
   * ```typescript
   * await trackConversion('checkout-test', { userId: 'user-123' }, {
   *   metricName: 'purchase',
   *   value: 99.99,
   * })
   * ```
   */
  trackConversion: (
    experimentKey: string,
    context: ExperimentContext,
    data: ConversionData
  ) => Promise<void>

  /**
   * Track a custom event.
   *
   * @param eventName - Name of the event
   * @param context - User context (userId required)
   * @param data - Optional event data
   *
   * @example
   * ```typescript
   * trackEvent('add_to_cart', { userId: 'user-123' }, {
   *   experimentKey: 'checkout-test',
   *   properties: { itemCount: 3 }
   * })
   * ```
   */
  trackEvent: (
    eventName: string,
    context: ExperimentContext,
    data?: EventData
  ) => void

  /**
   * Get a typed config value with a default fallback.
   *
   * @param key - Config key
   * @param defaultValue - Default value if key not found
   * @returns The config value or default
   *
   * @example
   * ```typescript
   * const apiUrl = await getConfigValue('api_url', 'https://default.api.com')
   * const maxRetries = await getConfigValue<number>('max_retries', 3)
   * ```
   */
  getConfigValue: <T>(key: string, defaultValue: T) => Promise<T>

  /**
   * Immediately flush pending stats events.
   * Useful before navigation or when tracking critical conversions.
   *
   * @example
   * ```typescript
   * await trackConversion('checkout-test', { userId: 'user-123' }, { metricName: 'purchase' })
   * await flushStats() // Ensure conversion is sent immediately
   * ```
   */
  flushStats: () => Promise<void>

  /**
   * Get the underlying ToggleBoxClient instance for advanced use cases.
   * Use with caution - prefer using context methods when possible.
   *
   * @returns The client instance or null if not initialized
   */
  getClient: () => ToggleBoxClient | null
}

// ============================================================================
// Hook Result Types
// ============================================================================

/**
 * Result type for useConfig() hook
 */
export interface UseConfigResult {
  /** Current configuration (Tier 1) */
  config: Config | null

  /** Get a typed config value with a default fallback */
  getConfigValue: <T>(key: string, defaultValue: T) => Promise<T>

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh config */
  refresh: () => Promise<void>
}

/**
 * Result type for useFlags() hook
 */
export interface UseFlagsResult {
  /** Current feature flags (Tier 2) */
  flags: Flag[]

  /** Check if a flag is enabled */
  isFlagEnabled: (flagKey: string, context?: FlagContext) => Promise<boolean>

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh flags */
  refresh: () => Promise<void>
}

/**
 * Result type for useExperiments() hook
 */
export interface UseExperimentsResult {
  /** Current experiments (Tier 3) */
  experiments: Experiment[]

  /** Get experiment variant for a user */
  getVariant: (experimentKey: string, context: ExperimentContext) => Promise<string | null>

  /** Loading state */
  isLoading: boolean

  /** Error state */
  error: Error | null

  /** Manually refresh experiments */
  refresh: () => Promise<void>
}

/**
 * Result type for useAnalytics() hook
 */
export interface UseAnalyticsResult {
  /**
   * Track a custom event.
   *
   * @param eventName - Name of the event
   * @param context - User context (userId required)
   * @param data - Optional event data
   */
  trackEvent: (
    eventName: string,
    context: ExperimentContext,
    data?: EventData
  ) => void

  /**
   * Track a conversion event for an experiment.
   *
   * @param experimentKey - The experiment key
   * @param context - Experiment context (userId required)
   * @param data - Conversion data (metricName, optional value)
   */
  trackConversion: (
    experimentKey: string,
    context: ExperimentContext,
    data: ConversionData
  ) => Promise<void>

  /**
   * Immediately flush pending stats events.
   */
  flushStats: () => Promise<void>
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
