'use client'

import { useToggleBox, useConfig, useFlags, useExperiments } from '@togglebox/sdk-nextjs'

/**
 * Provider Setup Example
 *
 * This page demonstrates that the ToggleBoxProvider is working.
 * In your app, wrap your root layout with ToggleBoxProvider:
 *
 * // app/layout.tsx
 * import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <ToggleBoxProvider
 *           platform="web"
 *           environment="production"
 *           apiUrl="https://your-api.com/api/v1"
 *           apiKey={process.env.NEXT_PUBLIC_API_KEY}
 *           pollingInterval={30000}
 *         >
 *           {children}
 *         </ToggleBoxProvider>
 *       </body>
 *     </html>
 *   )
 * }
 */
export default function ProviderSetup() {
  const { isLoading, refresh } = useToggleBox()
  const config = useConfig()
  const flags = useFlags()
  const experiments = useExperiments()

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
