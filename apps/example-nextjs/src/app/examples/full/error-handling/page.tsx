"use client";

import { useFlags } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { flags, error, isLoading, refresh } = useFlags();

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <h1 className="text-2xl font-bold mb-6">Error Handling</h1>

        <div className="max-w-md space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">⚠️</div>
            <h2 className="text-lg font-semibold text-red-800">
              Connection Error
            </h2>
            <p className="text-red-600 text-sm mt-1 mb-4">{error.message}</p>
            <button
              onClick={refresh}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>

          {flags.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800">
                Using Cached Data
              </h3>
              <p className="text-yellow-700 text-sm mt-1">
                {flags.length} flags available from cache
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isLoading && flags.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
        <div className="max-w-md space-y-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-8 mx-auto mb-2" />
            <div className="h-6 bg-gray-200 rounded w-28 mx-auto mb-1" />
            <div className="h-4 bg-gray-200 rounded w-32 mx-auto" />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="py-2 border-b border-gray-200">
                  <div className="h-4 bg-gray-200 rounded w-28 mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-48" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Error Handling</h1>

      <div className="max-w-md space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">✓</div>
          <h2 className="text-lg font-semibold text-green-800">Connected</h2>
          <p className="text-green-600">{flags.length} flags loaded</p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-900">
            Common Error Types
          </h3>
          <div className="space-y-3 text-sm">
            <div className="py-2 border-b border-gray-200">
              <p className="font-medium text-gray-900">Network Error</p>
              <p className="text-gray-500">Device offline or API unreachable</p>
            </div>
            <div className="py-2 border-b border-gray-200">
              <p className="font-medium text-gray-900">Auth Error (401)</p>
              <p className="text-gray-500">Invalid or missing API key</p>
            </div>
            <div className="py-2 border-b border-gray-200">
              <p className="font-medium text-gray-900">Rate Limit (429)</p>
              <p className="text-gray-500">Too many requests</p>
            </div>
            <div className="py-2">
              <p className="font-medium text-gray-900">Server Error (500)</p>
              <p className="text-gray-500">API server issue</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
