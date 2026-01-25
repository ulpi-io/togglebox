/**
 * @togglebox/stats - Stats Event Collector
 *
 * Client-side event collection with batching and retry logic.
 * Used by SDKs to send stats to the API.
 */

import type { StatsEvent, StatsEventBatch } from './types';

/**
 * Collector configuration options.
 */
export interface CollectorOptions {
  /** API endpoint for sending events */
  apiUrl: string;

  /** Platform identifier */
  platform: string;

  /** Environment identifier */
  environment: string;

  /** Maximum events per batch (default: 20) */
  batchSize?: number;

  /** Auto-flush interval in milliseconds (default: 10000) */
  flushIntervalMs?: number;

  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;

  /** API key for authentication (optional) */
  apiKey?: string;

  /** Whether stats collection is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Stats event collector for client-side use.
 *
 * @remarks
 * Batches events and sends them to the API periodically.
 * Includes retry logic with exponential backoff.
 *
 * @example
 * ```ts
 * const collector = new StatsCollector({
 *   apiUrl: 'https://api.example.com',
 *   platform: 'web',
 *   environment: 'production',
 * });
 *
 * // Queue events
 * collector.trackConfigFetch('api_url');
 * collector.trackFlagEvaluation('dark-mode', 'A', 'user-123');
 *
 * // Events are automatically flushed every 10 seconds
 * // or when batch size is reached
 *
 * // Cleanup on unmount
 * collector.destroy();
 * ```
 */
export class StatsCollector {
  private readonly options: Required<CollectorOptions>;
  private queue: StatsEvent[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isFlushing = false;

  constructor(options: CollectorOptions) {
    this.options = {
      batchSize: 20,
      flushIntervalMs: 10000,
      maxRetries: 3,
      apiKey: '',
      enabled: true,
      ...options,
    };

    // Start auto-flush timer
    if (this.options.enabled && this.options.flushIntervalMs > 0) {
      this.flushTimer = setInterval(
        () => this.flush(),
        this.options.flushIntervalMs
      );
    }
  }

  /**
   * Track a config fetch event.
   */
  trackConfigFetch(key: string, clientId?: string): void {
    this.queueEvent({
      type: 'config_fetch',
      key,
      clientId,
      timestamp: new Date().toISOString(),
    });
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
    });
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
    });
  }

  /**
   * Track a conversion event.
   */
  trackConversion(
    experimentKey: string,
    metricName: string,
    variationKey: string,
    userId: string,
    value?: number
  ): void {
    this.queueEvent({
      type: 'conversion',
      experimentKey,
      metricName,
      variationKey,
      userId,
      value,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Track a custom event.
   */
  trackCustomEvent(
    eventName: string,
    userId?: string,
    properties?: Record<string, unknown>
  ): void {
    this.queueEvent({
      type: 'custom_event',
      eventName,
      userId,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Queue an event for sending.
   */
  private queueEvent(event: StatsEvent): void {
    if (!this.options.enabled) return;

    this.queue.push(event);

    // Auto-flush if batch size reached
    if (this.queue.length >= this.options.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush queued events to the API.
   */
  async flush(): Promise<void> {
    if (!this.options.enabled || this.isFlushing || this.queue.length === 0) {
      return;
    }

    this.isFlushing = true;

    // Take events from queue
    const events = this.queue.splice(0, this.options.batchSize);
    const batch: StatsEventBatch = { events };

    try {
      await this.sendWithRetry(batch);
    } catch (error) {
      // Put events back at the front of the queue
      this.queue.unshift(...events);
      console.error('[ToggleBox Stats] Failed to send events:', error);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Send batch with retry logic.
   */
  private async sendWithRetry(batch: StatsEventBatch): Promise<void> {
    const { apiUrl, platform, environment, apiKey, maxRetries } = this.options;
    const url = `${apiUrl}/api/v1/platforms/${platform}/environments/${environment}/stats/events`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        if (apiKey) {
          headers['X-API-Key'] = apiKey;
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(batch),
        });

        if (response.ok) {
          return; // Success
        }

        // Non-retryable errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }

        lastError = new Error(`Server error: ${response.status}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Unknown error');
  }

  /**
   * Get the number of queued events.
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if collector is enabled.
   */
  isEnabled(): boolean {
    return this.options.enabled;
  }

  /**
   * Cleanup resources.
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush (fire and forget)
    this.flush().catch(() => {});
  }
}
