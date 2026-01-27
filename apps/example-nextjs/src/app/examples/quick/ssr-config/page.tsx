import { getServerSideConfig } from '@togglebox/sdk-nextjs'

/**
 * SSR Config Example
 *
 * Fetch configuration on the server for instant page loads.
 * No loading spinner - data is pre-rendered in HTML.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'

export default async function SSRConfig() {
  // Fetch on server - no client-side loading
  const { config, flags, experiments } = await getServerSideConfig(
    PLATFORM,
    ENVIRONMENT,
    API_URL
  )

  const configKeys = Object.keys(config?.config || {})
  const enabledFlags = flags.filter(f => f.enabled)
  const runningExperiments = experiments.filter(e => e.status === 'running')

  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <p className="text-purple-800 font-medium">
          This page was server-rendered. View page source to verify.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold">{configKeys.length}</div>
          <div className="text-sm text-gray-500">Config Keys</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold">{enabledFlags.length}/{flags.length}</div>
          <div className="text-sm text-gray-500">Flags Enabled</div>
        </div>
        <div className="p-4 bg-white border rounded-lg text-center">
          <div className="text-2xl font-bold">{runningExperiments.length}/{experiments.length}</div>
          <div className="text-sm text-gray-500">Experiments Running</div>
        </div>
      </div>

      {config && (
        <div>
          <h3 className="font-bold mb-2">Server-Fetched Config</h3>
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-sm overflow-auto">
            {JSON.stringify(config.config, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}
