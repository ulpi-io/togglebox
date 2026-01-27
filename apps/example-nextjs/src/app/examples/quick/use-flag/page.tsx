'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * Feature Flag Example
 *
 * Use isFlagEnabled to check if a feature flag is enabled for a user.
 * Pass user context for targeting rules.
 */
export default function UseFlag() {
  const { isFlagEnabled, isLoading } = useToggleBox()
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkFlag() {
      const enabled = await isFlagEnabled('dark-mode', {
        userId: 'user-123',
        country: 'US',
      })
      setDarkModeEnabled(enabled)
      setChecked(true)
    }

    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled])

  if (isLoading || !checked) {
    return <div>Checking flag...</div>
  }

  return (
    <div className={darkModeEnabled ? 'bg-gray-900 text-white p-6 rounded-lg' : 'bg-white text-gray-900 p-6 rounded-lg border'}>
      <h2 className="text-xl font-bold">
        {darkModeEnabled ? '🌙 Dark Mode Enabled' : '☀️ Light Mode'}
      </h2>
      <p className="mt-2">
        The dark-mode flag is {darkModeEnabled ? 'enabled' : 'disabled'} for this user.
      </p>
    </div>
  )
}
