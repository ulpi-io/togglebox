import type { Config, FeatureFlag } from '@togglebox/core'

/**
 * Client configuration options
 */
export interface ClientOptions {
  /** Platform name (e.g., 'web', 'mobile') */
  platform: string

  /** Environment name (e.g., 'production', 'staging') */
  environment: string

  /**
   * API base URL
   * @remarks
   * For open source self-hosted: https://your-domain.com
   * For cloud multi-tenant: Use tenantSubdomain instead
   */
  apiUrl?: string

  /**
   * Tenant subdomain for cloud deployments (optional)
   * @remarks
   * When provided, automatically constructs apiUrl as: https://{tenantSubdomain}.togglebox.io
   * Mutually exclusive with apiUrl - use one or the other
   * @example 'acme' → https://acme.togglebox.io
   */
  tenantSubdomain?: string

  /** Cache configuration */
  cache?: CacheOptions

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch
}

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /** Enable caching */
  enabled: boolean

  /** Cache TTL in milliseconds */
  ttl: number
}

/**
 * Configuration response from API
 */
export interface ConfigResponse {
  config: Config
  version: string
  timestamp: string
  isStable: boolean
}

/**
 * Feature flags response from API
 */
export interface FeatureFlagsResponse {
  flags: FeatureFlag[]
}

/**
 * Event types emitted by the client
 */
export type ClientEvent = 'update' | 'error'

/**
 * Event listener callback
 */
export type EventListener = (data: any) => void

/**
 * Retry configuration
 */
export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
}
