import { getServerSideConfig } from '@togglebox/sdk-nextjs'
import { SSRHydrationClient } from './client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

/**
 * SSR + Hydration Example
 *
 * Server component fetches data, client component hydrates.
 * No loading flash - data available immediately.
 */
export default async function SSRHydrationPage() {
  // Server-side fetch
  const { config, flags, experiments } = await getServerSideConfig(
    PLATFORM,
    ENVIRONMENT,
    API_URL
  )

  return (
    <div className="space-y-6">
      {/* Server-rendered stats */}
      <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
        <h2 className="font-bold text-purple-900">Server-Rendered Data</h2>
        <p className="text-sm text-purple-700 mt-1">
          This was fetched on the server. View page source to verify.
        </p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-xl font-bold">{Object.keys(config?.config || {}).length}</div>
            <div className="text-xs">Config Keys</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{flags.length}</div>
            <div className="text-xs">Flags</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{experiments.length}</div>
            <div className="text-xs">Experiments</div>
          </div>
        </div>
      </div>

      {/* Client component with hydration */}
      <SSRHydrationClient
        serverConfigKeys={Object.keys(config?.config || {}).length}
        serverFlags={flags.length}
        serverExperiments={experiments.length}
      />
    </div>
  )
}
