'use client'

import { useFlags } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'
import { useUserContext } from '@/lib/user-context'

/**
 * Feature Toggle Example (Full Implementation)
 *
 * This example shows the complete pattern for feature flags:
 *   1. Fetch flags with useFlags()
 *   2. Evaluate with user context for targeting
 *   3. Handle loading and error states
 *   4. Conditionally render entirely different components
 *
 * WHEN TO USE FEATURE FLAGS
 * ─────────────────────────
 * - Gradual rollouts: Enable for 5% of users, then 25%, then 100%
 * - Beta features: Enable only for users with plan="enterprise"
 * - Kill switches: Instantly disable a broken feature
 * - A/B tests: Show different UIs to different user segments
 *
 * TARGETING CONTEXT
 * ─────────────────
 * The context object can include any attributes for targeting rules:
 *   - userId: Required for percentage-based rollouts
 *   - plan, country, email, etc.: For segment-based targeting
 *
 * See src/lib/user-context.ts for auth provider integration.
 */
export default function FeatureToggle() {
  // Get user context from your auth provider
  const userContext = useUserContext()

  // useFlags() provides isFlagEnabled() for evaluating flags with context
  const { isFlagEnabled, isLoading, error } = useFlags()

  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkFlag() {
      // isFlagEnabled() evaluates the flag with targeting rules
      // The userId ensures consistent results for percentage rollouts
      const enabled = await isFlagEnabled(
        'new-dashboard',  // flagKey - create this in ToggleBox admin
        userContext       // context - for targeting rule evaluation
      )
      setShowFeature(enabled)
      setChecked(true)
    }

    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled, userContext])

  // Handle error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-800">Failed to load flags: {error.message}</p>
        <p className="text-sm text-red-600 mt-1">Showing default experience.</p>
      </div>
    )
  }

  // Handle loading state
  if (isLoading || !checked) {
    return (
      <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    )
  }

  // Render different components based on flag
  // This pattern allows completely different UIs, not just style changes
  if (!showFeature) {
    return <OldDashboard userId={userContext.userId} />
  }

  return <NewDashboard userId={userContext.userId} />
}

/**
 * New Dashboard (shown when flag is enabled)
 */
function NewDashboard({ userId }: { userId: string }) {
  return (
    <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
          NEW
        </span>
        <h2 className="text-xl font-bold text-green-800">New Dashboard</h2>
      </div>
      <p className="text-green-700">
        You&apos;re seeing the new dashboard because the{' '}
        <code className="px-1 bg-green-100 rounded">new-dashboard</code> flag is enabled for you.
      </p>
      <p className="text-xs text-green-600 mt-3">User ID: {userId}</p>
    </div>
  )
}

/**
 * Old Dashboard (shown when flag is disabled)
 */
function OldDashboard({ userId }: { userId: string }) {
  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      <p className="text-gray-700 mt-2">
        This is the standard dashboard. Enable the{' '}
        <code className="px-1 bg-gray-200 rounded">new-dashboard</code> flag to see the new version.
      </p>
      <p className="text-xs text-gray-500 mt-3">User ID: {userId}</p>
    </div>
  )
}
