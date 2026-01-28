'use client'

import { useState } from 'react'
import { useConfig, useFlags } from '@togglebox/sdk-nextjs'

export default function Page() {
  const { config, refresh, isLoading } = useConfig()
  const { flags } = useFlags()
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const handleRefresh = async () => {
    await refresh()
    setLastUpdate(new Date())
  }

  const configKeys = Object.keys(config || {}).length
  const enabledFlags = flags.filter((f) => f.enabled).length

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Polling Updates</h1>

      <div className="max-w-md space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          <span className="text-gray-700">Polling active (configurable interval)</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold">{configKeys}</div>
            <div className="text-sm text-gray-500">Config Keys</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <div className="text-2xl font-bold">
              {enabledFlags}/{flags.length}
            </div>
            <div className="text-sm text-gray-500">Flags Enabled</div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Refreshing...' : 'Refresh Now'}
          </button>
        </div>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">How Polling Works</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Provider fetches fresh data at configurable intervals</li>
            <li>• Set pollingInterval prop on ToggleBoxProvider</li>
            <li>• Hooks automatically reflect the new data</li>
            <li>• Call refresh() for manual updates</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
