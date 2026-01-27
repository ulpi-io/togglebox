'use client'

import { useConfig, useFlags, useToggleBoxClient } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * Real-time Polling Updates
 *
 * Listens for config/flag updates and reacts to changes.
 * Uses event listeners to show when data refreshes.
 */
export default function PollingUpdates() {
  const { config, refresh, isLoading } = useConfig()
  const { flags } = useFlags()
  const client = useToggleBoxClient()
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Listen for polling updates
  useEffect(() => {
    if (!client) return

    const handleUpdate = () => {
      setLastUpdate(new Date())
      console.log('Config updated via polling')
    }

    client.on('update', handleUpdate)
    return () => client.off('update', handleUpdate)
  }, [client])

  const handleManualRefresh = async () => {
    await refresh()
    setLastUpdate(new Date())
  }

  const configKeys = Object.keys(config || {}).length
  const enabledFlags = flags.filter(f => f.enabled).length

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        <span>Polling active (30s interval)</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{configKeys}</div>
          <div className="text-sm text-gray-500">Config Keys</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{enabledFlags}/{flags.length}</div>
          <div className="text-sm text-gray-500">Flags Enabled</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </span>
        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Refreshing...' : 'Refresh Now'}
        </button>
      </div>
    </div>
  )
}
