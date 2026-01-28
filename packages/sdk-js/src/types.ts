import type {
  Flag,
  EvaluationContext as FlagContext,
  EvaluationResult as FlagResult,
  FlagValue,
} from '@togglebox/flags'
import type {
  Experiment,
  ExperimentContext,
  ExperimentVariation,
  VariantAssignment,
} from '@togglebox/experiments'
import type { StatsEvent } from '@togglebox/stats'

// Tier 1: Remote Configs (Firebase-style key-value)
/**
 * Remote config object - key-value pairs with typed values.
 * All values are parsed from their stored type (string, number, boolean, json).
 */
export type Config = Record<string, unknown>

// Tier 2: Feature Flags (2-value model)
export type {
  Flag,
  FlagContext,
  FlagResult,
  FlagValue,
}

// Tier 3: Experiments
export type {
  Experiment,
  ExperimentContext,
  ExperimentVariation,
  VariantAssignment,
}

// Stats
export type { StatsEvent }

/**
 * Stats configuration options
 */
export interface StatsOptions {
  /** Enable stats collection (default: true) */
  enabled?: boolean

  /** Number of events to batch before sending (default: 20) */
  batchSize?: number

  /** Flush interval in milliseconds (default: 10000) */
  flushIntervalMs?: number

  /** Maximum retry attempts for failed sends (default: 3) */
  maxRetries?: number

  /** Maximum queue size to prevent unbounded memory growth (default: 1000) */
  maxQueueSize?: number
}

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

  /** API key for authentication (optional for open source, required for cloud) */
  apiKey?: string

  /** Cache configuration */
  cache?: CacheOptions

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch

  /** Stats configuration */
  stats?: StatsOptions
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
 * Configuration response from API (Firebase-style key-value)
 * @remarks
 * The API returns all active config parameters as a key-value object.
 * Each value is already parsed to its typed form (string, number, boolean, json).
 */
export interface ConfigResponse {
  /** Key-value config object */
  data: Config
}

/**
 * Feature flags response from API
 */
export interface FlagsResponse {
  flags: Flag[]
}

/**
 * Experiments response from API
 */
export interface ExperimentsResponse {
  experiments: Experiment[]
}

/**
 * Event types emitted by the client
 */
export type ClientEvent = 'update' | 'error' | 'statsFlush'

/**
 * Event listener callback
 */
export type EventListener = (data: unknown) => void

/**
 * Retry configuration
 */
export interface RetryOptions {
  maxRetries: number
  initialDelay: number
  maxDelay: number
}

/**
 * Conversion data for tracking
 */
export interface ConversionData {
  /** Metric name (e.g., 'purchase', 'signup') */
  metricName: string

  /** Optional value for sum/average metrics (e.g., revenue amount) */
  value?: number
}

/**
 * Event data for custom event tracking
 */
export interface EventData {
  /** Associated experiment key (optional) */
  experimentKey?: string

  /** Variation key for conversion attribution (required if experimentKey provided) */
  variationKey?: string

  /** Custom properties */
  properties?: Record<string, unknown>
}

/**
 * Health check response from API
 */
export interface HealthCheckResponse {
  /** Whether the API is healthy */
  success: boolean

  /** Health status message */
  message: string

  /** API uptime in seconds */
  uptime: number
}

