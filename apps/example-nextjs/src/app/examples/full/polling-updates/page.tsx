'use client'

import { useConfig, useFlags, useToggleBoxClient } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

/**
 * Real-time Polling Updates Example
 *
 * This example shows how to:
 *   1. Access the underlying ToggleBoxClient with useToggleBoxClient()
 *   2. Listen for polling update events with client.on('update')
 *   3. Manually refresh data with refresh()
 *   4. Show real-time update indicators
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW POLLING WORKS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * When you configure ToggleBoxProvider with pollingInterval:
 *
 *   <ToggleBoxProvider pollingInterval={30000}>  // 30 seconds
 *
 * The SDK automatically:
 *   1. Fetches fresh data every 30 seconds
 *   2. Emits an 'update' event when data changes
 *   3. Updates all hooks (useConfig, useFlags, useExperiments) automatically
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * useToggleBoxClient() HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Returns the underlying ToggleBoxClient instance from the Provider.
 * Use it when you need:
 *   - Event listeners (on/off)
 *   - Direct API access
 *   - Low-level SDK control
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * EVENT LISTENERS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Available events:
 *   - 'update': Fired when data is refreshed (polling or manual)
 *   - 'error': Fired when a request fails
 *
 * Usage:
 *   client.on('update', () => console.log('Data refreshed!'))
 *   client.off('update', handler)  // Remove listener
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export default function PollingUpdates() {
  // useConfig() provides refresh() for manual data refresh
  const { config, refresh, isLoading } = useConfig()
  const { flags } = useFlags()

  // useToggleBoxClient() returns the underlying client from the Provider
  // Use this to access event listeners and low-level SDK features
  const client = useToggleBoxClient()
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  // Listen for polling updates using the client's event system
  useEffect(() => {
    if (!client) return

    // Handler called whenever data is refreshed (by polling or manually)
    const handleUpdate = () => {
      setLastUpdate(new Date())
      console.log('Config updated via polling')
    }

    // Subscribe to update events
    client.on('update', handleUpdate)

    // IMPORTANT: Unsubscribe on cleanup to prevent memory leaks
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
