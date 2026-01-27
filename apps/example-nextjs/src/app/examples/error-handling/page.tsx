'use client'

import { useToggleBox, useFlags } from '@togglebox/sdk-nextjs'

/**
 * Error Handling Example
 *
 * Shows how to handle API errors gracefully.
 * Includes loading state, error UI with retry, and cached data fallback.
 */
export default function ErrorHandling() {
  const { error, isLoading, refresh } = useToggleBox()
  const flags = useFlags()

  // Error state - show error UI with retry
  if (error) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg text-center">
          <div className="text-4xl mb-2">⚠️</div>
          <h2 className="text-lg font-semibold text-red-800">Connection Error</h2>
          <p className="text-red-600 mt-1 mb-4">{error.message}</p>
          <button
            onClick={refresh}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>

        {/* Show cached data if available */}
        {flags.length > 0 && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Using Cached Data</h3>
            <p className="text-yellow-700 text-sm mt-1">
              {flags.length} flags available from cache
            </p>
          </div>
        )}
      </div>
    )
  }

  // Loading state
  if (isLoading && flags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    )
  }

  // Success state
  return (
    <div className="space-y-6">
      {/* Current Status */}
      <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
        <div className="text-3xl mb-2">✓</div>
        <h2 className="text-lg font-semibold text-green-800">Connected</h2>
        <p className="text-green-600">{flags.length} flags loaded</p>
      </div>

      {/* Common Error Types Reference */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">Common Error Types</h3>

        <div className="space-y-3">
          <ErrorType
            title="Network Error"
            description="Device offline or API unreachable"
            action="Show offline banner, use cached data"
          />
          <ErrorType
            title="Auth Error (401)"
            description="Invalid or missing API key"
            action="Check NEXT_PUBLIC_API_KEY configuration"
          />
          <ErrorType
            title="Rate Limit (429)"
            description="Too many requests"
            action="Wait and retry with exponential backoff"
          />
          <ErrorType
            title="Server Error (500)"
            description="API server issue"
            action="Display error message, suggest retry"
          />
        </div>
      </div>

      {/* Tip */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-blue-700 text-sm">
          💡 With SSR hydration, your app can display cached data immediately
          while refreshing in the background, providing a seamless user experience
          even when the API is temporarily unavailable.
        </p>
      </div>
    </div>
  )
}

function ErrorType({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: string
}) {
  return (
    <div className="py-3 border-b border-gray-200 last:border-0">
      <div className="font-medium">{title}</div>
      <div className="text-sm text-gray-500">{description}</div>
      <div className="text-sm text-blue-600 mt-1">→ {action}</div>
    </div>
  )
}
