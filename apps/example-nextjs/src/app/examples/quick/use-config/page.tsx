'use client'

import { useConfig, useToggleBox } from '@togglebox/sdk-nextjs'

/**
 * Config Access Example
 *
 * Use useConfig to access your remote configuration object.
 */
export default function UseConfig() {
  const config = useConfig()
  const { isLoading } = useToggleBox()

  if (isLoading) {
    return <div>Loading config...</div>
  }

  // Access entire config object
  const allConfig = config || {}

  // Access specific values with fallbacks
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
