/**
 * @togglebox/stats - Stats Event Collector
 *
 * Client-side event collection with batching and retry logic.
 * Used by SDKs to send stats to the API.
 */

import type { StatsEvent, StatsEventBatch } from "./types";

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

  /** Maximum queue size to prevent unbounded memory growth (default: 1000) */
  maxQueueSize?: number;

  /** Request timeout in milliseconds (default: 10000) */
  requestTimeoutMs?: number;
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
      apiKey: "",
      enabled: true,
      maxQueueSize: 1000,
      requestTimeoutMs: 10000,
      ...options,
    };

    // Start auto-flush timer
    if (this.options.enabled && this.options.flushIntervalMs > 0) {
      this.flushTimer = setInterval(
        () => this.flush(),
        this.options.flushIntervalMs,
      );
    }
  }

  /**
   * Track a config fetch event.
   */
  trackConfigFetch(key: string, clientId?: string): void {
    this.queueEvent({
      type: "config_fetch",
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
    value: "A" | "B",
    userId: string,
    country?: string,
    language?: string,
  ): void {
    this.queueEvent({
      type: "flag_evaluation",
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
    userId: string,
  ): void {
    this.queueEvent({
      type: "experiment_exposure",
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
    metricId: string,
    variationKey: string,
    userId: string,
    value?: number,
  ): void {
    this.queueEvent({
      type: "conversion",
      experimentKey,
      metricId,
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
    properties?: Record<string, unknown>,
  ): void {
    this.queueEvent({
      type: "custom_event",
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

    // Enforce max queue size to prevent unbounded memory growth
    if (this.queue.length >= this.options.maxQueueSize) {
      // Drop oldest event to make room
      this.queue.shift();
      console.warn("[ToggleBox Stats] Queue full, dropping oldest event");
    }

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
      // Only re-queue for transient errors (network failures, server errors)
      // Don't re-queue for client errors (4xx) as they will never succeed (poison batch)
      const isClientError =
        error instanceof Error && error.message.startsWith("Client error:");
      if (isClientError) {
        console.error(
          "[ToggleBox Stats] Dropping invalid batch (client error):",
          error,
        );
      } else {
        // Re-queue events for transient errors (may succeed on retry)
        this.queue.unshift(...events);

        // Clamp queue size to prevent unbounded memory growth from repeated failures
        if (this.queue.length > this.options.maxQueueSize) {
          const overflow = this.queue.length - this.options.maxQueueSize;
          this.queue.length = this.options.maxQueueSize; // Truncates from end (drops oldest re-queued events)
          console.warn(
            `[ToggleBox Stats] Queue overflow, dropped ${overflow} oldest events`,
          );
        }

        console.error(
          "[ToggleBox Stats] Failed to send events (will retry):",
          error,
        );
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Send batch with retry logic.
   */
  private async sendWithRetry(batch: StatsEventBatch): Promise<void> {
    const {
      apiUrl,
      platform,
      environment,
      apiKey,
      maxRetries,
      requestTimeoutMs = 10000,
    } = this.options;
    const url = `${apiUrl}/api/v1/platforms/${platform}/environments/${environment}/stats/events`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeoutMs);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (apiKey) {
          headers["X-API-Key"] = apiKey;
        }

        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(batch),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return; // Success
        }

        // Non-retryable errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }

        lastError = new Error(`Server error: ${response.status}`);
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(
            `Request timed out after ${requestTimeoutMs}ms`,
          );
        } else {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }

      // Exponential backoff
      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error("Unknown error");
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
