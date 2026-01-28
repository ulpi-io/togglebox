'use client'

import { useState, useEffect } from 'react'
import { useFlags } from '@togglebox/sdk-nextjs'

export default function Page() {
  const { isFlagEnabled, isLoading, error, refresh } = useFlags()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoading) return
    isFlagEnabled('new-dashboard', { userId: 'user-123' }).then((enabled) => {
      setShowFeature(enabled)
      setChecked(true)
    })
  }, [isLoading, isFlagEnabled])

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-md bg-red-50 border border-red-200 rounded-lg p-6">
          <p className="font-semibold text-red-800 mb-2">Failed to load flags</p>
          <p className="text-red-600 text-sm mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !checked) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-md bg-gray-50 border border-gray-200 rounded-lg p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Feature Toggle</h1>

      <div className="max-w-md">
        {showFeature ? (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                NEW
              </span>
              <h2 className="text-xl font-bold text-green-800">New Dashboard</h2>
            </div>
            <p className="text-green-700">
              The <code className="px-1 bg-green-100 rounded">new-dashboard</code> flag is enabled.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
            <p className="text-gray-600 mt-2">
              Enable the <code className="px-1 bg-gray-200 rounded">new-dashboard</code> flag to
              see the new version.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
