'use server'

/**
 * Server-Side Event Tracking with Server Actions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHEN TO USE SERVER-SIDE TRACKING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use server-side tracking when events originate from server logic:
 *
 *   1. PAYMENT WEBHOOKS
 *      Stripe/PayPal webhooks confirming successful payments
 *      → Track conversion securely without client involvement
 *
 *   2. BACKGROUND JOBS / CRON
 *      Scheduled tasks, data processing completion
 *      → Track automated system events
 *
 *   3. API CALLBACKS
 *      Third-party API responses, OAuth completions
 *      → Track external integration events
 *
 *   4. SECURE EVENTS
 *      Events that shouldn't be spoofable from client
 *      → Server validates before tracking
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Create a ToggleBoxClient instance on the server
 * 2. Call trackEvent() or trackConversion() with user context
 * 3. Call flushStats() to send immediately (no batching needed server-side)
 * 4. Destroy the client to clean up resources
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ToggleBoxClient } from '@togglebox/sdk-nextjs'

// Configuration from environment
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'

/**
 * Track a custom event from the server.
 *
 * Use for: Webhooks, cron jobs, API callbacks, secure events
 */
export async function trackServerEvent(
  userId: string,
  eventName: string,
  properties?: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  // Create a dedicated client for this server-side operation
  const client = new ToggleBoxClient({
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    // Disable polling and caching for server-side (not needed)
    pollingInterval: 0,
  })

  try {
    // Track the event
    client.trackEvent(eventName, { userId }, { properties })

    // Flush immediately - no batching needed on server
    await client.flushStats()

    return { success: true }
  } catch (error) {
    console.error('Server-side event tracking failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    // Always clean up the client
    client.destroy()
  }
}

/**
 * Track a conversion from the server.
 *
 * Use for: Payment confirmation webhooks, subscription activations,
 * or any conversion that should be tracked securely server-side.
 *
 * @param userId - The user ID to attribute the conversion to
 * @param experimentKey - The experiment this conversion is for
 * @param value - Optional monetary value of the conversion
 */
export async function trackServerConversion(
  userId: string,
  experimentKey: string,
  value?: number
): Promise<{ success: boolean; error?: string }> {
  const client = new ToggleBoxClient({
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    pollingInterval: 0,
  })

  try {
    // Track the conversion linked to an experiment
    await client.trackConversion(
      experimentKey,
      { userId },
      {
        metricName: 'conversion',
        value: value ?? 1,
      }
    )

    // Send immediately
    await client.flushStats()

    return { success: true }
  } catch (error) {
    console.error('Server-side conversion tracking failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  } finally {
    client.destroy()
  }
}
