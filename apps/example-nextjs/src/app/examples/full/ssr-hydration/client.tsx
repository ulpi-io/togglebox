'use client'

import { useConfig, useFlags, useExperiments } from '@togglebox/sdk-nextjs'

interface Props {
  serverConfigKeys: number
  serverFlags: number
  serverExperiments: number
}

/**
 * Client Component for SSR Hydration
 *
 * This component receives server-rendered data as props and compares it
 * with client-side data from hooks. This demonstrates:
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW CLIENT HOOKS WORK WITH SSR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Server component fetches data → passes as props
 * 2. Client component renders immediately (no loading state)
 * 3. useConfig(), useFlags(), useExperiments() hydrate from ToggleBoxProvider
 * 4. Data should match (server and client fetched same data)
 * 5. Client hooks can then poll for updates
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOOKS USED
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * useConfig():
 *   - Returns { config, isLoading, error, refresh }
 *   - Config is the raw JSON object from your ToggleBox config
 *
 * useFlags():
 *   - Returns { flags, isLoading, error, refresh }
 *   - flags is an array of all feature flags
 *
 * useExperiments():
 *   - Returns { experiments, isLoading, error, refresh }
 *   - experiments is an array of all experiments
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export function SSRHydrationClient({ serverConfigKeys, serverFlags, serverExperiments }: Props) {
  // Client-side hooks that provide real-time data
  // These sync with the ToggleBoxProvider and can poll for updates
  const { config, refresh, isLoading } = useConfig()
  const { flags } = useFlags()
  const { experiments } = useExperiments()

  const clientConfigKeys = Object.keys(config || {}).length

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h2 className="font-bold text-blue-900">Client-Side (Hydrated)</h2>
      <p className="text-sm text-blue-700 mt-1">
        Data available immediately - no loading flash.
      </p>

      {/* Server vs Client comparison */}
      <table className="w-full mt-4 text-sm">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left">Data</th>
            <th className="text-center">Server</th>
            <th className="text-center">Client</th>
            <th className="text-center">Match</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Config Keys</td>
            <td className="text-center">{serverConfigKeys}</td>
            <td className="text-center">{clientConfigKeys}</td>
            <td className="text-center">{serverConfigKeys === clientConfigKeys ? '✅' : '⚠️'}</td>
          </tr>
          <tr>
            <td>Flags</td>
            <td className="text-center">{serverFlags}</td>
            <td className="text-center">{flags.length}</td>
            <td className="text-center">{serverFlags === flags.length ? '✅' : '⚠️'}</td>
          </tr>
          <tr>
            <td>Experiments</td>
            <td className="text-center">{serverExperiments}</td>
            <td className="text-center">{experiments.length}</td>
            <td className="text-center">{serverExperiments === experiments.length ? '✅' : '⚠️'}</td>
          </tr>
        </tbody>
      </table>

      <button
        onClick={refresh}
        disabled={isLoading}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Refreshing...' : 'Manual Refresh'}
      </button>
    </div>
  )
}
