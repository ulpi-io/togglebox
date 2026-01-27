'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * Feature Toggle Example
 *
 * Shows/hides a feature based on flag evaluation.
 * Includes loading state and error handling.
 */
export default function FeatureToggle() {
  const { isFlagEnabled, isLoading } = useToggleBox()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkFlag() {
      const enabled = await isFlagEnabled('new-dashboard', {
        userId: 'user-123', // Replace with actual user ID
      })
      setShowFeature(enabled)
      setChecked(true)
    }

    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled])

  if (isLoading || !checked) {
    return <div>Loading...</div>
  }

  if (!showFeature) {
    return <OldDashboard />
  }

  return <NewDashboard />
}

function NewDashboard() {
  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
      <h2 className="text-xl font-bold text-green-800">New Dashboard</h2>
      <p className="text-green-700 mt-2">
        This is the new feature-flagged dashboard.
      </p>
    </div>
  )
}

function OldDashboard() {
  return (
    <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      <p className="text-gray-700 mt-2">
        This is the standard dashboard.
      </p>
    </div>
  )
}
