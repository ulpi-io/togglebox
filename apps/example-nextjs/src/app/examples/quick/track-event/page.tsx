'use client'

/**
 * Event Tracking Example
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY EVENT TRACKING IS SEPARATE FROM CONFIGS, FLAGS & EXPERIMENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ToggleBox has THREE TIERS of functionality with different data flow patterns:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ TIER 1-3: CONFIGS, FLAGS, EXPERIMENTS (READ operations)                     │
 * │                                                                             │
 * │   Server ──────> SDK ──────> Your App                                       │
 * │                                                                             │
 * │   • Data flows FROM the server TO your app                                  │
 * │   • Can be fetched server-side (SSR) or client-side                         │
 * │   • Determines WHAT to show users                                           │
 * │   • Examples: feature toggles, A/B test variants, remote config             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EVENT TRACKING (WRITE operations)                                           │
 * │                                                                             │
 * │   Your App ──────> SDK ──────> Server                                       │
 * │                                                                             │
 * │   • Data flows FROM your app TO the server                                  │
 * │   • Primarily client-side (browser interactions)                            │
 * │   • Records WHAT users do                                                   │
 * │   • Examples: clicks, page views, purchases, conversions                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * WHY CLIENT-SIDE BY DEFAULT?
 * ───────────────────────────
 * Event tracking captures user interactions that happen in the browser:
 *   • Button clicks, form submissions, scroll depth
 *   • User session context (device, browser, timezone)
 *   • Real-time interaction timestamps
 *
 * For server-side tracking (API routes, webhooks, background jobs),
 * see the "Server-Side Tracking" section below with Server Actions.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useAnalytics } from '@togglebox/sdk-nextjs'
import { useState } from 'react'
import { trackServerEvent, trackServerConversion } from './actions'

export default function TrackEvent() {
  const { trackEvent, trackConversion } = useAnalytics()
  const [clicks, setClicks] = useState(0)
  const [serverResult, setServerResult] = useState<string | null>(null)

  // ═══════════════════════════════════════════════════════════════════════════
  // CLIENT-SIDE TRACKING (Browser interactions)
  // ═══════════════════════════════════════════════════════════════════════════
  // Use this for tracking user interactions in the browser:
  //   • Button clicks, form submissions
  //   • Page views, scroll events
  //   • UI interactions that happen in real-time
  //
  // The SDK batches events and sends them efficiently to reduce network calls.

  const handleButtonClick = () => {
    trackEvent('button_click', { userId: 'user-123' }, {
      properties: {
        buttonId: 'cta-main',
        page: '/pricing',
      },
    })
    setClicks(c => c + 1)
  }

  const handlePurchase = async () => {
    // trackConversion links this event to an experiment for A/B test analysis
    await trackConversion('pricing-page', { userId: 'user-123' }, {
      metricName: 'purchase',
      value: 99.99,
    })
    alert('Purchase tracked!')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SERVER-SIDE TRACKING (API routes, webhooks, background jobs)
  // ═══════════════════════════════════════════════════════════════════════════
  // Use Server Actions or API Routes when tracking events that:
  //   • Originate from server-side logic (webhooks, cron jobs)
  //   • Need to be tracked securely (payment confirmations)
  //   • Don't involve direct user interaction
  //
  // See actions.ts for the Server Action implementation.

  const handleServerTracking = async () => {
    const result = await trackServerEvent('user-123', 'server_action_demo')
    setServerResult(result.success ? 'Server event tracked!' : 'Failed')
  }

  const handleServerConversion = async () => {
    const result = await trackServerConversion('user-123', 'checkout-experiment', 149.99)
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

      {/* Explanation */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-bold mb-2">When to use each?</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Client-side (useAnalytics):</strong> Button clicks, page views, form submissions, UI interactions</p>
          <p><strong>Server-side (Server Actions):</strong> Payment webhooks, cron jobs, API callbacks, secure events</p>
        </div>
      </div>
    </div>
  )
}
