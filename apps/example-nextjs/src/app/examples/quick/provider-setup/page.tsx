'use client'

import { useConfig, useFlags, useExperiments } from '@togglebox/sdk-nextjs'

/**
 * Provider Setup Example
 *
 * This page demonstrates that the ToggleBoxProvider is working correctly.
 * It shows the data from all three tiers: Configs, Flags, and Experiments.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW TO SET UP THE PROVIDER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Wrap your root layout with ToggleBoxProvider:
 *
 * ```tsx
 * // app/layout.tsx
 * import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ToggleBoxProvider
 *           platform="web"              // Your platform name
 *           environment="production"    // Your environment (staging, prod, etc.)
 *           apiUrl="https://your-api.com/api/v1"
 *           apiKey={process.env.NEXT_PUBLIC_API_KEY}  // Optional: for write ops
 *           pollingInterval={30000}     // Optional: auto-refresh every 30s
 *         >
 *           {children}
 *         </ToggleBoxProvider>
 *       </body>
 *     </html>
 *   )
 * }
 * ```
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * PROVIDER PROPS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Required:
 *   - platform: string - Your platform name (matches ToggleBox admin)
 *   - environment: string - Your environment (production, staging, etc.)
 *   - apiUrl: string - Your ToggleBox API URL
 *
 * Optional:
 *   - apiKey: string - API key for write operations (set via env var)
 *   - pollingInterval: number - Auto-refresh interval in ms (0 = disabled)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHAT THE PROVIDER DOES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. Creates a ToggleBoxClient instance
 * 2. Fetches configs, flags, and experiments from the API
 * 3. Provides data to all child components via React Context
 * 4. Handles polling/refresh automatically
 * 5. Cleans up resources on unmount
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export default function ProviderSetup() {
  // These hooks access data provided by ToggleBoxProvider
  // They work because this component is wrapped by the provider
  const { config, isLoading, refresh } = useConfig()
  const { flags } = useFlags()
  const { experiments } = useExperiments()

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="font-bold text-green-800">Provider Active</h2>
        <p className="text-green-700 text-sm">
          ToggleBoxProvider is configured and working.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{Object.keys(config || {}).length}</div>
          <div className="text-sm text-gray-500">Config Keys</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{flags.length}</div>
          <div className="text-sm text-gray-500">Flags</div>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg text-center">
          <div className="text-2xl font-bold">{experiments.length}</div>
          <div className="text-sm text-gray-500">Experiments</div>
        </div>
      </div>

      <button
        onClick={refresh}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        Refresh Data
      </button>
    </div>
  )
}
