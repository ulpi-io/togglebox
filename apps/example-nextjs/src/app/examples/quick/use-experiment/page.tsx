'use client'

import { useExperiment } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'
import { useUserContext } from '@/lib/user-context'

/**
 * Experiment Example (A/B Testing)
 *
 * This example shows how to:
 *   1. Get a user's assigned variant for an experiment
 *   2. Render different UI based on the variant
 *   3. Ensure consistent variant assignment (same user = same variant)
 *
 * WHY useExperiment?
 * ──────────────────
 * - Fetches experiment config and checks if it's running
 * - Assigns users to variants deterministically (based on userId hash)
 * - Returns the same variant for the same user every time
 *
 * USER CONTEXT
 * ────────────
 * The userId in context MUST be stable (same user = same ID).
 * See src/lib/user-context.ts for how to get user IDs from your auth provider.
 */
export default function UseExperiment() {
  // Get user context from your auth provider
  // In production, this comes from NextAuth, Clerk, Firebase, etc.
  const userContext = useUserContext()

  // useExperiment fetches the experiment and provides getVariant()
  // Pass the user context so variants are assigned consistently
  const { experiment, isLoading, getVariant } = useExperiment(
    'pricing-page',  // experimentKey - matches what you created in ToggleBox admin
    userContext      // context - must include userId for deterministic assignment
  )

  const [variant, setVariant] = useState<string | null>(null)

  // Assign variant when experiment loads
  // getVariant() returns the same variant for the same userId every time
  useEffect(() => {
    async function assignVariant() {
      // Only assign if experiment exists and is running
      if (!experiment || experiment.status !== 'running') return

      // getVariant() hashes the userId to pick a variant
      // Same user always gets the same variant (deterministic)
      const v = await getVariant()
      setVariant(v)
    }

    if (!isLoading) assignVariant()
  }, [isLoading, experiment, getVariant])

  // Show loading state while fetching experiment config
  if (isLoading) {
    return <div className="p-4 text-gray-500">Loading experiment...</div>
  }

  // Handle case where experiment doesn't exist or isn't running
  if (!experiment || experiment.status !== 'running') {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Experiment &quot;pricing-page&quot; is not running.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          Create it in ToggleBox admin and set status to &quot;running&quot;.
        </p>
      </div>
    )
  }

  // Define content for each variant
  // In production, you might fetch this from a CMS or config
  const variants: Record<string, { price: string; cta: string; badge?: string }> = {
    control: {
      price: '$9.99/mo',
      cta: 'Start Trial',
    },
    'variant-a': {
      price: '$7.99/mo',
      cta: 'Get Started',
      badge: 'Best Value',
    },
    'variant-b': {
      price: '$99/year',
      cta: 'Save 20%',
      badge: 'Annual',
    },
  }

  const content = variants[variant || 'control'] || variants.control

  return (
    <div className="p-6 bg-white border rounded-lg text-center max-w-sm">
      {content.badge && (
        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded mb-2">
          {content.badge}
        </span>
      )}
      <h2 className="text-2xl font-bold">{content.price}</h2>
      <p className="text-gray-600 mt-2">Pro Plan</p>
      <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
        {content.cta}
      </button>
      <p className="text-xs text-gray-400 mt-4">
        Variant: {variant} | User: {userContext.userId}
      </p>
    </div>
  )
}
