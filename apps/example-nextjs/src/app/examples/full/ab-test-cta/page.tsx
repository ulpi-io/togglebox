'use client'

import { useExperiment, useAnalytics } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'
import { useUserContext } from '@/lib/user-context'

/**
 * A/B Test CTA Button (Full Implementation)
 *
 * This example shows a complete A/B test with:
 *   1. Variant assignment with useExperiment()
 *   2. Impression tracking when component mounts
 *   3. Conversion tracking when user clicks
 *   4. Different button styles per variant
 *
 * A/B TEST FLOW
 * ─────────────
 * 1. User lands on page → getVariant() assigns them to control/variant-a/variant-b
 * 2. Component renders → trackEvent('impression') records they saw it
 * 3. User clicks CTA → trackConversion() records the conversion
 * 4. ToggleBox dashboard shows conversion rates per variant
 *
 * WHY TRACK IMPRESSIONS?
 * ──────────────────────
 * Conversion rate = conversions / impressions
 * Without impression tracking, you can't calculate meaningful conversion rates.
 *
 * USER CONTEXT
 * ────────────
 * The userId MUST be stable for:
 *   - Consistent variant assignment (same user = same variant)
 *   - Accurate conversion attribution
 *
 * See src/lib/user-context.ts for auth provider integration.
 */
export default function ABTestCTA() {
  // Get user context from your auth provider
  const userContext = useUserContext()

  // useExperiment fetches experiment and provides getVariant()
  const { experiment, isLoading, getVariant } = useExperiment(
    'cta-experiment',  // experimentKey - create this in ToggleBox admin
    userContext        // context - userId required for consistent assignment
  )

  // useAnalytics provides event and conversion tracking
  const { trackConversion, trackEvent } = useAnalytics()

  const [variant, setVariant] = useState<string | null>(null)
  const [impressionTracked, setImpressionTracked] = useState(false)

  // Assign variant and track impression on mount
  useEffect(() => {
    async function assignAndTrack() {
      // Only proceed if experiment is running
      if (!experiment || experiment.status !== 'running') return

      // Get variant assignment (deterministic based on userId)
      const v = await getVariant()
      setVariant(v)

      // Track impression (user saw this variant)
      // This is essential for calculating conversion rates
      if (v && !impressionTracked) {
        trackEvent(
          'impression',           // eventName - standard name for impressions
          userContext,            // context - links to user
          {
            experimentKey: 'cta-experiment',
            variationKey: v,
          }
        )
        setImpressionTracked(true)
      }
    }

    if (!isLoading) assignAndTrack()
  }, [isLoading, experiment, getVariant, trackEvent, userContext, impressionTracked])

  // Track conversion when user clicks
  const handleClick = async () => {
    if (!variant) return

    // trackConversion() links this action to the experiment
    // This allows ToggleBox to calculate conversion rates per variant
    await trackConversion(
      'cta-experiment',   // experimentKey - must match the experiment
      userContext,        // context - links to user for attribution
      {
        metricName: 'cta_click',  // metricName - the goal being measured
        value: 1,                  // value - can be count, revenue, etc.
      }
    )

    // Your actual conversion logic here
    console.log('CTA clicked! Variant:', variant)
    alert(`Conversion tracked for variant: ${variant}`)
  }

  // Loading state
  if (isLoading || !variant) {
    return (
      <button disabled className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg cursor-wait">
        Loading...
      </button>
    )
  }

  // Variant configurations
  // Each variant tests different copy and styling
  const variants: Record<string, { text: string; className: string; description: string }> = {
    control: {
      text: 'Get Started',
      className: 'bg-gray-600 hover:bg-gray-700',
      description: 'Control: Neutral gray, standard copy',
    },
    'variant-a': {
      text: 'Start Free Trial',
      className: 'bg-blue-600 hover:bg-blue-700',
      description: 'Variant A: Blue with "Free Trial" messaging',
    },
    'variant-b': {
      text: 'Try It Now!',
      className: 'bg-green-600 hover:bg-green-700',
      description: 'Variant B: Green with urgency messaging',
    },
  }

  const config = variants[variant] || variants.control

  return (
    <div className="space-y-4">
      <button
        onClick={handleClick}
        className={`px-6 py-3 text-white font-medium rounded-lg transition-colors ${config.className}`}
      >
        {config.text}
      </button>

      <div className="text-sm text-gray-500 space-y-1">
        <p><strong>Variant:</strong> {variant}</p>
        <p><strong>Strategy:</strong> {config.description}</p>
        <p><strong>User:</strong> {userContext.userId}</p>
      </div>
    </div>
  )
}
