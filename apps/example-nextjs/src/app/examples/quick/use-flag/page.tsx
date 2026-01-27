'use client'

import { useFlags } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'
import { useUserContext } from '@/lib/user-context'

/**
 * Feature Flag Example
 *
 * This example shows how to:
 *   1. Check if a feature flag is enabled for a specific user
 *   2. Pass user context for targeting rules (e.g., enable for specific countries)
 *   3. Conditionally render UI based on flag status
 *
 * WHY useFlags + isFlagEnabled?
 * ─────────────────────────────
 * - useFlags() fetches all flags and provides helper methods
 * - isFlagEnabled(flagKey, context) evaluates targeting rules server-side
 * - Context allows targeting: enable for 10% of users, specific countries, etc.
 *
 * USER CONTEXT
 * ────────────
 * Pass any attributes you want to target on:
 *   - userId: Required for percentage rollouts (consistent assignment)
 *   - country, plan, email: Optional, for targeting rules
 *
 * See src/lib/user-context.ts for how to get user context from your auth provider.
 */
export default function UseFlag() {
  // Get user context from your auth provider
  // This provides userId, country, plan, etc. for targeting
  const userContext = useUserContext()

  // useFlags() returns all flags and the isFlagEnabled() helper
  // isFlagEnabled() evaluates targeting rules with the provided context
  const { isFlagEnabled, isLoading } = useFlags()

  const [darkModeEnabled, setDarkModeEnabled] = useState(false)
  const [checked, setChecked] = useState(false)

  // Check flag status when flags are loaded
  useEffect(() => {
    async function checkFlag() {
      // isFlagEnabled() sends context to server for rule evaluation
      // This ensures consistent behavior across client/server
      const enabled = await isFlagEnabled(
        'dark-mode',   // flagKey - matches what you created in ToggleBox admin
        userContext    // context - used for targeting rules
      )
      setDarkModeEnabled(enabled)
      setChecked(true)
    }

    // Only check once flags are loaded
    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled, userContext])

  // Show loading state while fetching flags
  if (isLoading || !checked) {
    return <div className="p-4 text-gray-500">Checking flag...</div>
  }

  // Render different UI based on flag status
  return (
    <div
      className={
        darkModeEnabled
          ? 'bg-gray-900 text-white p-6 rounded-lg'
          : 'bg-white text-gray-900 p-6 rounded-lg border'
      }
    >
      <h2 className="text-xl font-bold">
        {darkModeEnabled ? '🌙 Dark Mode Enabled' : '☀️ Light Mode'}
      </h2>
      <p className="mt-2">
        The <code className="px-1 bg-gray-200 dark:bg-gray-700 rounded">dark-mode</code> flag
        is <strong>{darkModeEnabled ? 'enabled' : 'disabled'}</strong> for this user.
      </p>
      <p className="text-xs mt-4 opacity-60">
        User: {userContext.userId} | Country: {userContext.country}
      </p>
    </div>
  )
}
