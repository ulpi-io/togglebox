import type { Flag, EvaluationContext as FlagContext, EvaluationResult as FlagResult } from '@togglebox/flags'
import { evaluateFlag } from '@togglebox/flags'
import type { Experiment, ExperimentContext, VariantAssignment } from '@togglebox/experiments'
import { assignVariation } from '@togglebox/experiments'
import { HttpClient } from './http'
import { Cache } from './cache'
import { StatsReporter } from './stats'
import { ConfigurationError } from './errors'
import type {
  ClientOptions,
  Config,
  ClientEvent,
  EventListener,
  ConversionData,
  EventData,
  HealthCheckResponse,
} from './types'

/**
 * ToggleBox Client
 *
 * Unified client for the three-tier architecture:
 * - Tier 1: Remote Configs (same value for everyone)
 * - Tier 2: Feature Flags (2-value, country/language targeting)
 * - Tier 3: Experiments (multi-variant A/B testing)
 */
export class ToggleBoxClient {
  private http: HttpClient
  private cache: Cache
  private stats: StatsReporter
  private platform: string
  private environment: string
  private pollingInterval: number
  private pollingTimer: NodeJS.Timeout | null = null
  private isRefreshing = false // Guard against overlapping refresh calls
  private globalContext: FlagContext = { userId: 'anonymous' }
  private listeners: Map<ClientEvent, Set<EventListener>> = new Map()

  constructor(options: ClientOptions) {
    // Validate required options
    if (!options.platform || !options.environment) {
      throw new ConfigurationError(
        'Missing required options: platform and environment are required'
      )
    }

    // Validate API URL configuration
    if (!options.apiUrl && !options.tenantSubdomain) {
      throw new ConfigurationError(
        'Either apiUrl or tenantSubdomain must be provided'
      )
    }

    if (options.apiUrl && options.tenantSubdomain) {
      throw new ConfigurationError(
        'Cannot provide both apiUrl and tenantSubdomain - use one or the other'
      )
    }

    // Construct API URL
    const apiUrl = options.tenantSubdomain
      ? `https://${options.tenantSubdomain}.togglebox.io`
      : options.apiUrl!

    this.platform = options.platform
    this.environment = options.environment
    this.pollingInterval = options.pollingInterval || 0
    this.http = new HttpClient(apiUrl, options.fetchImpl, options.apiKey)
    this.cache = new Cache(options.cache)
    this.stats = new StatsReporter(
      this.http,
      this.platform,
      this.environment,
      options.stats,
      (data) => this.emit('statsFlush', data),
      (error) => this.emit('error', error)
    )

    // Start polling if interval is set
    if (this.pollingInterval > 0) {
      this.startPolling()
    }
  }

  // ==================== CONNECTION & HEALTH ====================

  /**
   * Check API connectivity and service health.
   *
   * @returns Health status including uptime
   * @throws NetworkError if API is unreachable
   *
   * @example
   * ```typescript
   * const health = await client.checkConnection()
   * if (health.success) {
   *   console.log(`API is healthy, uptime: ${health.uptime}s`)
   * }
   * ```
   */
  async checkConnection(): Promise<HealthCheckResponse> {
    const response = await this.http.get<HealthCheckResponse>('/health')
    return response
  }

  // ==================== TIER 1: REMOTE CONFIGS ====================

  /**
   * Get a remote config value.
   *
   * @param key - Config key
   * @param defaultValue - Default value if not found
   * @returns The config value or default
   *
   * @example
   * ```typescript
   * const apiUrl = client.getConfigValue('api_url', 'https://default.api.com')
   * const maxRetries = client.getConfigValue<number>('max_retries', 3)
   * ```
   */
  async getConfigValue<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const config = await this.getConfig()
      const value = config[key]

      // Track the fetch
      this.stats.trackConfigFetch(key)

      return value !== undefined ? (value as T) : defaultValue
    } catch {
      return defaultValue
    }
  }

  /**
   * Get all config values as key-value object.
   *
   * @remarks
   * Returns all active config parameters for the current platform/environment.
   * Each parameter's value is already parsed to its typed form (string, number, boolean, json).
   *
   * @example
   * ```typescript
   * const allConfigs = await client.getAllConfigs()
   * // { api_url: 'https://api.example.com', max_retries: 3, feature_enabled: true }
   * ```
   */
  async getAllConfigs(): Promise<Config> {
    return this.getConfig()
  }

  /**
   * Get all active config parameters as key-value object.
   *
   * @remarks
   * Firebase-style individual parameters. Each parameter has its own version history,
   * but the API returns only active versions as a simple key-value object.
   */
  async getConfig(): Promise<Config> {
    const cacheKey = `config:${this.platform}:${this.environment}`

    // Try cache first
    const cached = this.cache.get<Config>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from Firebase-style endpoint
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/configs`
    const response = await this.http.get<{ data: Config }>(path)
    const config = response.data

    // Cache
    this.cache.set(cacheKey, config)

    return config
  }

  // ==================== TIER 2: FEATURE FLAGS (2-value) ====================

  /**
   * Get a feature flag value (2-value model).
   *
   * @param flagKey - The flag key
   * @param context - Evaluation context (userId, country, language)
   * @returns The evaluated value (valueA or valueB)
   *
   * @example
   * ```typescript
   * const uiVersion = await client.getFlag('ui-version', { userId: 'user-123', country: 'US' })
   * // Returns: 'v1' or 'v2'
   * ```
   */
  async getFlag(flagKey: string, context: FlagContext): Promise<FlagResult> {
    const cacheKey = `flags:${this.platform}:${this.environment}`

    // Try cache first
    let flags = this.cache.get<Flag[]>(cacheKey)
    if (!flags) {
      const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/flags`
      const response = await this.http.get<{ data: Flag[] }>(path)
      flags = response.data
      this.cache.set(cacheKey, flags)
    }

    const flag = flags.find((f) => f.flagKey === flagKey)
    if (!flag) {
      throw new Error(`Flag "${flagKey}" not found`)
    }

    const result = evaluateFlag(flag, context)

    // Track the evaluation
    this.stats.trackFlagEvaluation(
      flagKey,
      result.servedValue,
      context.userId ?? 'anonymous',
      context.country,
      context.language
    )

    return result
  }

  /**
   * Check if a feature flag is enabled (2-value boolean).
   *
   * @param flagKey - The flag key
   * @param context - Evaluation context
   * @param defaultValue - Default if flag not found (default: false)
   * @returns true if valueA is served, false if valueB
   *
   * @example
   * ```typescript
   * const showNewUI = await client.isFlagEnabled('new-ui', { userId: 'user-123' })
   * if (showNewUI) {
   *   renderNewUI()
   * }
   * ```
   */
  async isFlagEnabled(
    flagKey: string,
    context: FlagContext,
    defaultValue = false
  ): Promise<boolean> {
    try {
      const result = await this.getFlag(flagKey, context)
      return result.servedValue === 'A'
    } catch {
      return defaultValue
    }
  }

  /**
   * Get a specific flag's metadata without evaluation.
   * Useful for inspecting flag configuration.
   *
   * @param flagKey - The flag key
   * @returns Flag metadata or null if not found
   *
   * @example
   * ```typescript
   * const flagInfo = await client.getFlagInfo('new-dashboard')
   * if (flagInfo) {
   *   console.log(`Flag enabled: ${flagInfo.enabled}`)
   *   console.log(`Rollout: ${flagInfo.rolloutPercentage}%`)
   * }
   * ```
   */
  async getFlagInfo(flagKey: string): Promise<Flag | null> {
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/flags/${flagKey}`
    try {
      const response = await this.http.get<{ data: Flag }>(path)
      return response.data
    } catch {
      return null
    }
  }

  // ==================== TIER 3: EXPERIMENTS ====================

  /**
   * Get the assigned variation for an experiment.
   *
   * @param experimentKey - The experiment key
   * @param context - Experiment context (userId, country, language)
   * @returns The assigned variation or null if not eligible
   *
   * @example
   * ```typescript
   * const variant = await client.getVariant('checkout-test', { userId: 'user-123' })
   * if (variant) {
   *   console.log(`Assigned to: ${variant.variationKey}`)
   * }
   * ```
   */
  async getVariant(
    experimentKey: string,
    context: ExperimentContext
  ): Promise<VariantAssignment | null> {
    const cacheKey = `experiments:${this.platform}:${this.environment}`

    // Try cache first
    let experiments = this.cache.get<Experiment[]>(cacheKey)
    if (!experiments) {
      const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/experiments`
      const response = await this.http.get<{ data: Experiment[] }>(path)
      experiments = response.data
      this.cache.set(cacheKey, experiments)
    }

    const experiment = experiments.find((e) => e.experimentKey === experimentKey)
    if (!experiment) {
      throw new Error(`Experiment "${experimentKey}" not found`)
    }

    const assignment = assignVariation(experiment, context)

    if (assignment) {
      // Track the exposure
      this.stats.trackExperimentExposure(
        experimentKey,
        assignment.variationKey,
        context.userId
      )
    }

    return assignment
  }

  /**
   * Track a conversion event for an experiment.
   *
   * @param experimentKey - The experiment key
   * @param context - Experiment context
   * @param data - Conversion data (metricId, optional value)
   *
   * @example
   * ```typescript
   * // Track a purchase conversion
   * await client.trackConversion('checkout-test', { userId: 'user-123' }, {
   *   metricId: 'purchase',
   *   value: 99.99, // Revenue amount
   * })
   * ```
   */
  async trackConversion(
    experimentKey: string,
    context: ExperimentContext,
    data: ConversionData
  ): Promise<void> {
    // Get the user's assigned variation
    const assignment = await this.getVariant(experimentKey, context)

    if (assignment) {
      this.stats.trackConversion(
        experimentKey,
        data.metricId,
        assignment.variationKey,
        context.userId,
        data.value
      )
    }
  }

  /**
   * Track a custom event.
   *
   * @param eventName - Name of the event
   * @param context - User context
   * @param data - Optional event data
   *
   * @example
   * ```typescript
   * await client.trackEvent('add_to_cart', { userId: 'user-123' }, {
   *   experimentKey: 'checkout-test',
   *   properties: { itemCount: 3, cartValue: 150 }
   * })
   * ```
   */
  trackEvent(
    eventName: string,
    context: ExperimentContext,
    data?: EventData
  ): void {
    // Always track the custom event for general analytics
    this.stats.trackCustomEvent(eventName, context.userId, data?.properties)

    // Additionally, track as conversion if experiment context is provided
    if (data?.experimentKey && data?.variationKey) {
      this.stats.trackConversion(
        data.experimentKey,
        eventName,
        data.variationKey,
        context.userId,
        undefined
      )
    }
  }

  /**
   * Get all experiments.
   *
   * @example
   * ```typescript
   * const experiments = await client.getExperiments()
   * ```
   */
  async getExperiments(): Promise<Experiment[]> {
    const cacheKey = `experiments:${this.platform}:${this.environment}`

    // Try cache first
    const cached = this.cache.get<Experiment[]>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from API
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/experiments`
    const response = await this.http.get<{ data: Experiment[] }>(path)
    const experiments = response.data

    // Cache
    this.cache.set(cacheKey, experiments)

    return experiments
  }

  /**
   * Get a specific experiment's metadata without assignment.
   * Useful for inspecting experiment configuration.
   *
   * @param experimentKey - The experiment key
   * @returns Experiment metadata or null if not found
   *
   * @example
   * ```typescript
   * const expInfo = await client.getExperimentInfo('checkout-test')
   * if (expInfo) {
   *   console.log(`Experiment status: ${expInfo.status}`)
   *   console.log(`Variations: ${expInfo.variations.length}`)
   * }
   * ```
   */
  async getExperimentInfo(experimentKey: string): Promise<Experiment | null> {
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/experiments/${experimentKey}`
    try {
      const response = await this.http.get<{ data: Experiment }>(path)
      return response.data
    } catch {
      return null
    }
  }

  /**
   * Get all feature flags (2-value model from Tier 2).
   *
   * @example
   * ```typescript
   * const flags = await client.getFlags()
   * ```
   */
  async getFlags(): Promise<Flag[]> {
    const cacheKey = `flags:${this.platform}:${this.environment}`

    // Try cache first
    const cached = this.cache.get<Flag[]>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from API
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/flags`
    const response = await this.http.get<{ data: Flag[] }>(path)
    const flags = response.data

    // Cache
    this.cache.set(cacheKey, flags)

    return flags
  }

  // ==================== CONTEXT & LIFECYCLE ====================

  /**
   * Set global evaluation context
   */
  setContext(context: FlagContext): void {
    this.globalContext = context
  }

  /**
   * Get current global context
   */
  getContext(): FlagContext {
    return { ...this.globalContext }
  }

  /**
   * Manually refresh all cached data
   */
  async refresh(): Promise<void> {
    // Clear cache for this platform/environment
    this.cache.delete(`config:${this.platform}:${this.environment}`)
    this.cache.delete(`flags:${this.platform}:${this.environment}`)
    this.cache.delete(`experiments:${this.platform}:${this.environment}`)

    // Fetch fresh data for all three tiers
    const [config, flags, experiments] = await Promise.all([
      this.getConfig(),
      this.getFlags(),
      this.getExperiments(),
    ])

    // Emit update event with all data
    this.emit('update', { config, flags, experiments })
  }

  /**
   * Flush pending stats events
   */
  async flushStats(): Promise<void> {
    await this.stats.flush()
  }

  /**
   * Start auto-refresh polling
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      return
    }

    this.pollingTimer = setInterval(async () => {
      // Guard against overlapping refreshes from slow API responses
      if (this.isRefreshing) {
        return
      }
      this.isRefreshing = true
      try {
        await this.refresh()
      } catch (error) {
        this.emit('error', error)
      } finally {
        this.isRefreshing = false
      }
    }, this.pollingInterval)
  }

  /**
   * Stop auto-refresh polling
   */
  stopPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer)
      this.pollingTimer = null
    }
  }

  /**
   * Add event listener
   */
  on(event: ClientEvent, listener: EventListener): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  /**
   * Remove event listener
   */
  off(event: ClientEvent, listener: EventListener): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.delete(listener)
    }
  }

  /**
   * Emit event
   */
  private emit(event: ClientEvent, data: unknown): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((listener) => listener(data))
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPolling()
    this.stats.destroy()
    this.cache.clear()
    this.listeners.clear()
  }
}
