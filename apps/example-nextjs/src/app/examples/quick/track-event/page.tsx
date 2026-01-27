'use client'

/**
 * Event Tracking Example
 *
 * This example shows how to track user events and experiment conversions.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * DATA FLOW: TRACKING vs. CONFIGS/FLAGS/EXPERIMENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CONFIGS, FLAGS, EXPERIMENTS (READ operations):
 *   Server ──────> SDK ──────> Your App
 *   • Data flows FROM server TO your app
 *   • Determines WHAT to show users
 *
 * EVENT TRACKING (WRITE operations):
 *   Your App ──────> SDK ──────> Server
 *   • Data flows FROM your app TO the server
 *   • Records WHAT users do
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * CLIENT vs. SERVER TRACKING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * CLIENT-SIDE (useAnalytics hook):
 *   Use for browser interactions:
 *     • Button clicks, form submissions, scroll events
 *     • Page views, UI interactions
 *     • Real-time user engagement
 *
 * SERVER-SIDE (ToggleBoxClient in Server Actions):
 *   Use for server-originated events:
 *     • Payment webhooks (Stripe, PayPal)
 *     • Cron job completions
 *     • API callbacks, background jobs
 *     • Events requiring security/validation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useAnalytics } from '@togglebox/sdk-nextjs'
import { useState } from 'react'
import { useUserContext } from '@/lib/user-context'
import { trackServerEvent, trackServerConversion } from './actions'

export default function TrackEvent() {
  // Get user context from your auth provider
  const userContext = useUserContext()

  // useAnalytics provides trackEvent and trackConversion
  const { trackEvent, trackConversion } = useAnalytics()

  const [clicks, setClicks] = useState(0)
  const [serverResult, setServerResult] = useState<string | null>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT-SIDE TRACKING
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Track a generic event (button click)
   *
   * trackEvent() is for general analytics:
   *   - Page views, button clicks, form submissions
   *   - Not tied to a specific experiment
   *   - Useful for understanding user behavior
   */
  const handleButtonClick = () => {
    trackEvent(
      'button_click',     // eventName - descriptive name for the action
      userContext,        // context - links event to user for analytics
      {
        properties: {
          buttonId: 'cta-main',
          page: '/pricing',
        },
      }
    )
    setClicks(c => c + 1)
  }

  /**
   * Track an experiment conversion
   *
   * trackConversion() links the action to an experiment:
   *   - Used to calculate A/B test results
   *   - Links user action to the variant they saw
   *   - value can be revenue, count, or any metric
   */
  const handlePurchase = async () => {
    await trackConversion(
      'pricing-page',     // experimentKey - which experiment to attribute to
      userContext,        // context - links to user for attribution
      {
        metricName: 'purchase',  // goal name
        value: 99.99,            // metric value (revenue, count, etc.)
      }
    )
    alert('Purchase conversion tracked!')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER-SIDE TRACKING (via Server Actions)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Track event from server (Server Action)
   *
   * Use server-side tracking when:
   *   - Event originates from backend (webhooks, cron)
   *   - Need to validate before tracking (payment confirmation)
   *   - Security-sensitive events
   */
  const handleServerTracking = async () => {
    const result = await trackServerEvent(userContext.userId, 'server_action_demo')
    setServerResult(result.success ? 'Server event tracked!' : 'Failed')
  }

  const handleServerConversion = async () => {
    const result = await trackServerConversion(
      userContext.userId,
      'checkout-experiment',
      149.99
    )
    setServerResult(result.success ? 'Server conversion tracked!' : 'Failed')
  }

  return (
    <div className="space-y-6">
      {/* Client-Side Tracking */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="font-bold mb-1 text-blue-900">Client-Side Tracking</h2>
        <p className="text-sm text-blue-700 mb-4">
          For browser interactions (clicks, views, form submissions)
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleButtonClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Track Click ({clicks})
          </button>
          <button
            onClick={handlePurchase}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Track Conversion
          </button>
        </div>
      </div>

      {/* Server-Side Tracking */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h2 className="font-bold mb-1 text-purple-900">Server-Side Tracking</h2>
        <p className="text-sm text-purple-700 mb-4">
          For webhooks, API routes, background jobs (uses Server Actions)
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleServerTracking}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Server Event
          </button>
          <button
            onClick={handleServerConversion}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Server Conversion
          </button>
        </div>
        {serverResult && (
          <p className="mt-3 text-sm text-purple-800">✓ {serverResult}</p>
        )}
      </div>

      {/* User Context Display */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">Current User Context</h3>
        <pre className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
          {JSON.stringify(userContext, null, 2)}
        </pre>
      </div>
    </div>
  )
}
