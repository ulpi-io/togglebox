'use client'

import { useExperiment } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * Experiment Example
 *
 * Use useExperiment to get A/B test variant assignments.
 * Users are deterministically assigned based on their ID.
 */
export default function UseExperiment() {
  const { experiment, isLoading, getVariant } = useExperiment('pricing-page', {
    userId: 'user-123', // Replace with actual user ID
  })
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    async function assignVariant() {
      if (!experiment || experiment.status !== 'running') return
      const v = await getVariant()
      setVariant(v)
    }

    if (!isLoading) assignVariant()
  }, [isLoading, experiment, getVariant])

  if (isLoading) {
    return <div>Loading experiment...</div>
  }

  if (!experiment || experiment.status !== 'running') {
    return <div>Experiment not running</div>
  }

  // Render different content based on variant
  const variants: Record<string, { price: string; cta: string }> = {
    control: { price: '$9.99/mo', cta: 'Start Trial' },
    'variant-a': { price: '$7.99/mo', cta: 'Get Started' },
    'variant-b': { price: '$99/year', cta: 'Save 20%' },
  }

  const content = variants[variant || 'control'] || variants.control

  return (
    <div className="p-6 bg-white border rounded-lg text-center">
      <h2 className="text-2xl font-bold">{content.price}</h2>
      <p className="text-gray-600 mt-2">Pro Plan</p>
      <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg">
        {content.cta}
      </button>
      <p className="text-xs text-gray-400 mt-4">Variant: {variant}</p>
    </div>
  )
}
