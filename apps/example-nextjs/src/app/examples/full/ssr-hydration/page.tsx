import { getServerSideConfig } from '@togglebox/sdk-nextjs'
import { SSRHydrationClient } from './client'

/**
 * SSR + Client Hydration Example (Full Implementation)
 *
 * This example shows the recommended pattern for combining:
 *   1. Server-side data fetching (getServerSideConfig)
 *   2. Client-side hydration and interactivity
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY SSR + HYDRATION?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Best of both worlds:
 *   - INSTANT page load (data pre-rendered in HTML)
 *   - NO loading spinners on initial load
 *   - REAL-TIME updates after hydration (polling, manual refresh)
 *   - SEO-friendly (content visible to crawlers)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * This file (Server Component):
 *   1. Fetches data on the server with getServerSideConfig()
 *   2. Renders static content immediately
 *   3. Passes data to client component as props
 *
 * client.tsx (Client Component):
 *   1. Uses useConfig(), useFlags() for real-time updates
 *   2. Compares server vs client data
 *   3. Provides manual refresh button
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOTE: This is a Server Component (async function, no 'use client')
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Configuration from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

export default async function SSRHydrationPage() {
  // Server-side fetch - happens BEFORE HTML is sent to browser
  // This data will be embedded in the initial HTML
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
