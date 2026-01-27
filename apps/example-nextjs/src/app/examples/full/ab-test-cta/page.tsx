'use client'

import { useExperiment, useAnalytics } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * A/B Test CTA Button
 *
 * Shows different CTA text/color based on experiment variant.
 * Tracks impressions on mount and conversions on click.
 */
export default function ABTestCTA() {
  const { experiment, isLoading, getVariant } = useExperiment('cta-experiment', {
    userId: 'user-123', // Replace with actual user ID
  })
  const { trackConversion, trackEvent } = useAnalytics()
  const [variant, setVariant] = useState<string | null>(null)

  // Assign variant and track impression on mount
  useEffect(() => {
    async function assignVariant() {
      if (!experiment || experiment.status !== 'running') return

      const v = await getVariant()
      setVariant(v)

      // Track impression
      if (v) {
        trackEvent('impression', { userId: 'user-123' }, {
          experimentKey: 'cta-experiment',
          variationKey: v,
        })
      }
    }

    if (!isLoading) assignVariant()
  }, [isLoading, experiment, getVariant, trackEvent])

  // Track conversion on click
  const handleClick = async () => {
    if (!variant) return

    await trackConversion('cta-experiment', { userId: 'user-123' }, {
      metricName: 'cta_click',
      value: 1,
    })

    // Your conversion logic here
    console.log('CTA clicked!')
  }

  if (isLoading || !variant) {
    return (
      <button disabled className="px-6 py-3 bg-gray-300 text-gray-500 rounded-lg">
        Loading...
      </button>
    )
  }

  // Variant configurations
  const variants: Record<string, { text: string; className: string }> = {
    control: {
      text: 'Get Started',
      className: 'bg-gray-600 hover:bg-gray-700',
    },
    'variant-a': {
      text: 'Start Free Trial',
      className: 'bg-blue-600 hover:bg-blue-700',
    },
    'variant-b': {
      text: 'Try It Now!',
      className: 'bg-green-600 hover:bg-green-700',
    },
  }

  const config = variants[variant] || variants.control

  return (
    <button
      onClick={handleClick}
      className={`px-6 py-3 text-white font-medium rounded-lg ${config.className}`}
    >
      {config.text}
    </button>
  )
}
