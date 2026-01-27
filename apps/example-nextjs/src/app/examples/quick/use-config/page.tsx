'use client'

import { useConfig } from '@togglebox/sdk-nextjs'

/**
 * Remote Configuration Example
 *
 * This example shows how to:
 *   1. Fetch remote configuration with useConfig()
 *   2. Access configuration values with type safety
 *   3. Provide fallback defaults for missing values
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY useConfig?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Remote configuration allows you to:
 *   - Change app behavior without deploying new code
 *   - A/B test different settings
 *   - Roll out changes gradually
 *   - Kill switches for problematic features
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. useConfig() fetches config from ToggleBox API via the provider
 * 2. Config is cached and refreshed automatically (via pollingInterval)
 * 3. Returns { config, isLoading, error, refresh }
 *
 * The config object is whatever JSON you stored in ToggleBox admin:
 *   { "theme": "dark", "maxRetries": 5, "apiEndpoint": "..." }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * BEST PRACTICES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Always provide fallback defaults:
 *   const theme = config?.theme ?? 'light'  // Works even if config fails to load
 *
 * Type your config values:
 *   const maxRetries = (config?.maxRetries as number) ?? 3
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export default function UseConfigExample() {
  // useConfig() returns the remote config object from ToggleBox
  // The config is automatically fetched when the component mounts
  const { config, isLoading } = useConfig()

  // Show loading state while fetching config
  if (isLoading) {
    return <div>Loading config...</div>
  }

  // Access entire config object (useful for debugging)
  const allConfig = config || {}

  // Access specific values with type casting and fallbacks
  // ALWAYS provide fallbacks - config may be empty on first load or if API fails
  const apiEndpoint = (config?.apiEndpoint as string) || 'https://api.example.com'
  const maxRetries = (config?.maxRetries as number) || 3
  const theme = (config?.theme as string) || 'light'

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-2">Config Values</h2>
        <p>API Endpoint: {apiEndpoint}</p>
        <p>Max Retries: {maxRetries}</p>
        <p>Theme: {theme}</p>
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <h2 className="font-bold mb-2">Full Config ({Object.keys(allConfig).length} keys)</h2>
        <pre className="text-sm overflow-auto">
          {JSON.stringify(allConfig, null, 2)}
        </pre>
      </div>
    </div>
  )
}
