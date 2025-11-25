import type { Config, FeatureFlag, EvaluationContext, EvaluationResult } from '@togglebox/core'
import { evaluateFeatureFlag, evaluateMultipleFeatureFlags } from '@togglebox/core'
import { HttpClient } from './http'
import { Cache } from './cache'
import { ConfigurationError } from './errors'
import type {
  ClientOptions,
  ConfigResponse,
  ClientEvent,
  EventListener,
} from './types'

/**
 * ToggleBox Client for fetching configs and evaluating feature flags
 */
export class ToggleBoxClient {
  private http: HttpClient
  private cache: Cache
  private platform: string
  private environment: string
  private pollingInterval: number
  private pollingTimer: NodeJS.Timeout | null = null
  private globalContext: EvaluationContext = {}
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
    this.http = new HttpClient(apiUrl, options.fetchImpl)
    this.cache = new Cache(options.cache)

    // Start polling if interval is set
    if (this.pollingInterval > 0) {
      this.startPolling()
    }
  }

  /**
   * Get latest stable configuration
   */
  async getConfig(): Promise<Config> {
    const cacheKey = `config:${this.platform}:${this.environment}`

    // Try cache first
    const cached = this.cache.get<Config>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from API
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/versions/latest/stable`
    const response = await this.http.get<{ data: ConfigResponse }>(path)
    const config = response.data.config

    // Cache
    this.cache.set(cacheKey, config)

    return config
  }

  /**
   * Get all feature flags
   */
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    const cacheKey = `flags:${this.platform}:${this.environment}`

    // Try cache first
    const cached = this.cache.get<FeatureFlag[]>(cacheKey)
    if (cached) {
      return cached
    }

    // Fetch from API
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/feature-flags`
    const response = await this.http.get<{ data: FeatureFlag[] }>(path)
    const flags = response.data

    // Cache
    this.cache.set(cacheKey, flags)

    return flags
  }

  /**
   * Check if a feature flag is enabled
   */
  async isEnabled(flagName: string, context?: EvaluationContext): Promise<boolean> {
    const flags = await this.getFeatureFlags()
    const flag = flags.find(f => f.flagName === flagName)

    if (!flag) {
      return false
    }

    // Merge global context with per-call context
    const evalContext = { ...this.globalContext, ...context }
    const result = evaluateFeatureFlag(flag, evalContext)

    return result.enabled
  }

  /**
   * Get all evaluated feature flags
   */
  async getAllFlags(context?: EvaluationContext): Promise<Record<string, boolean>> {
    const flags = await this.getFeatureFlags()

    // Merge global context with per-call context
    const evalContext = { ...this.globalContext, ...context }
    const results = evaluateMultipleFeatureFlags(flags, evalContext)

    // Convert to simple key-value map
    const flagMap: Record<string, boolean> = {}
    for (const flagName in results) {
      const result = results[flagName]
      if (result) {
        flagMap[flagName] = result.enabled
      }
    }
    return flagMap
  }

  /**
   * Get detailed evaluation result for a flag
   */
  async evaluateFlag(flagName: string, context?: EvaluationContext): Promise<EvaluationResult> {
    const flags = await this.getFeatureFlags()
    const flag = flags.find(f => f.flagName === flagName)

    if (!flag) {
      return { enabled: false, reason: 'Flag not found' }
    }

    // Merge global context with per-call context
    const evalContext = { ...this.globalContext, ...context }
    return evaluateFeatureFlag(flag, evalContext)
  }

  /**
   * Set global evaluation context
   */
  setContext(context: EvaluationContext): void {
    this.globalContext = context
  }

  /**
   * Get current global context
   */
  getContext(): EvaluationContext {
    return { ...this.globalContext }
  }

  /**
   * Manually refresh config and flags
   */
  async refresh(): Promise<void> {
    // Clear cache for this platform/environment
    this.cache.delete(`config:${this.platform}:${this.environment}`)
    this.cache.delete(`flags:${this.platform}:${this.environment}`)

    // Fetch fresh data
    const [config, flags] = await Promise.all([
      this.getConfig(),
      this.getFeatureFlags(),
    ])

    // Emit update event
    this.emit('update', { config, flags })
  }

  /**
   * Start auto-refresh polling
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      return
    }

    this.pollingTimer = setInterval(async () => {
      try {
        await this.refresh()
      } catch (error) {
        this.emit('error', error)
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
  private emit(event: ClientEvent, data: any): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data))
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopPolling()
    this.cache.clear()
    this.listeners.clear()
  }
}
