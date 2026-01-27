import { getServerSideConfig } from '@togglebox/sdk-nextjs'

/**
 * Server-Side Rendering (SSR) Configuration Example
 *
 * This example shows how to:
 *   1. Fetch config on the server with getServerSideConfig()
 *   2. Pre-render data in HTML (no loading spinner)
 *   3. Get configs, flags, AND experiments in a single server call
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY getServerSideConfig?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Benefits of server-side fetching:
 *   - Instant page load (data in HTML, no client-side fetch)
 *   - Better SEO (content visible to crawlers)
 *   - No loading spinners or content flashes
 *   - Single API call gets configs, flags, and experiments together
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHEN TO USE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Use SSR for:
 *   - Landing pages where speed matters
 *   - Pages with SEO requirements
 *   - Initial page load optimization
 *
 * Use client-side (useConfig) for:
 *   - Real-time updates (polling)
 *   - Personalized content based on client state
 *   - After user interactions
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOTE: This is a Server Component (no 'use client' directive)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Configuration from environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'

export default async function SSRConfig() {
  // getServerSideConfig() fetches ALL data in one call on the server
  // This happens BEFORE the page is sent to the browser
  // Returns: { config, flags, experiments }
  const { config, flags, experiments } = await getServerSideConfig(
    PLATFORM,     // Your platform name (e.g., 'web', 'mobile', 'api')
    ENVIRONMENT,  // Your environment (e.g., 'production', 'staging')
    API_URL       // Your ToggleBox API URL
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
