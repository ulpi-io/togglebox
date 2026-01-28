import type { StatsEvent } from '@togglebox/stats'
import type { StatsOptions, EventListener } from './types'
import { HttpClient } from './http'
import { NetworkError } from './errors'

/**
 * Stats Reporter
 *
 * Batches stats events and sends them to the API at regular intervals.
 * Used for tracking config fetches, flag evaluations, experiment exposures, and conversions.
 */
export class StatsReporter {
  private http: HttpClient
  private platform: string
  private environment: string
  private options: Required<StatsOptions>
  private queue: StatsEvent[] = []
  private flushTimer: NodeJS.Timeout | null = null
  private isFlushing = false
  private onFlush: EventListener | null = null
  private onError: EventListener | null = null

  constructor(
    http: HttpClient,
    platform: string,
    environment: string,
    options: StatsOptions = {},
    onFlush?: EventListener,
    onError?: EventListener
  ) {
    this.http = http
    this.platform = platform
    this.environment = environment
    this.options = {
      enabled: options.enabled ?? true,
      batchSize: options.batchSize ?? 20,
      flushIntervalMs: options.flushIntervalMs ?? 10000,
      maxRetries: options.maxRetries ?? 3,
      maxQueueSize: options.maxQueueSize ?? 1000,
    }
    this.onFlush = onFlush ?? null
    this.onError = onError ?? null

    if (this.options.enabled) {
      this.startFlushTimer()
    }
  }

  /**
   * Track a config fetch event.
   */
  trackConfigFetch(key: string): void {
    this.queueEvent({
      type: 'config_fetch',
      key,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track a flag evaluation event.
   */
  trackFlagEvaluation(
    flagKey: string,
    value: 'A' | 'B',
    userId: string,
    country?: string,
    language?: string
  ): void {
    this.queueEvent({
      type: 'flag_evaluation',
      flagKey,
      value,
      userId,
      country,
      language,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track an experiment exposure event.
   */
  trackExperimentExposure(
    experimentKey: string,
    variationKey: string,
    userId: string
  ): void {
    this.queueEvent({
      type: 'experiment_exposure',
      experimentKey,
      variationKey,
      userId,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track a conversion event.
   */
  trackConversion(
    experimentKey: string,
    metricId: string,
    variationKey: string,
    userId: string,
    value?: number
  ): void {
    this.queueEvent({
      type: 'conversion',
      experimentKey,
      metricId,
      variationKey,
      userId,
      value,
      timestamp: new Date().toISOString(),
    })
  }

  /**
   * Track a custom event (general analytics, not tied to experiments).
   */
  trackCustomEvent(
    eventName: string,
    userId: string,
    properties?: Record<string, unknown>
  ): void {
    this.queueEvent({
      type: 'custom_event',
      eventName,
      userId,
      properties,
      timestamp: new Date().toISOString(),
    } as StatsEvent)
  }

  /**
   * Queue an event for sending.
   */
  private queueEvent(event: StatsEvent): void {
    if (!this.options.enabled) {
      return
    }

    // Enforce max queue size to prevent unbounded memory growth
    if (this.queue.length >= this.options.maxQueueSize) {
      this.queue.shift() // Drop oldest event
    }

    this.queue.push(event)

    // Flush if batch size reached
    if (this.queue.length >= this.options.batchSize) {
      void this.flush()
    }
  }

  /**
   * Flush queued events to the API.
   */
  async flush(): Promise<void> {
    if (this.isFlushing || this.queue.length === 0) {
      return
    }

    this.isFlushing = true

    const events = [...this.queue]
    this.queue = []

    try {
      await this.sendWithRetry(events)
      this.onFlush?.({ eventCount: events.length })
    } catch (error) {
      // Only re-queue on non-4xx errors (4xx = client error, won't succeed on retry)
      const isClientError =
        error instanceof NetworkError &&
        error.statusCode !== undefined &&
        error.statusCode >= 400 &&
        error.statusCode < 500
      if (!isClientError) {
        this.queue = [...events, ...this.queue]
      }
      this.onError?.(error)
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Send events with retry logic.
   */
  private async sendWithRetry(events: StatsEvent[], attempt = 1): Promise<void> {
    const path = `/api/v1/platforms/${this.platform}/environments/${this.environment}/stats/events`

    try {
      await this.http.post(path, { events })
    } catch (error) {
      if (attempt < this.options.maxRetries) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000)
        await new Promise((resolve) => setTimeout(resolve, delay))
        return this.sendWithRetry(events, attempt + 1)
      }
      throw error
    }
  }

  /**
   * Start the flush timer.
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      return
    }

    this.flushTimer = setInterval(() => {
      void this.flush()
    }, this.options.flushIntervalMs)
  }

  /**
   * Stop the flush timer.
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    this.stopFlushTimer()
    // Final flush attempt
    void this.flush()
  }
}
