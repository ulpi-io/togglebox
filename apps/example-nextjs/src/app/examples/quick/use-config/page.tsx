"use client";

import { useConfig } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { config, isLoading, error, refresh } = useConfig();

  if (error) {
    return (
      <div className="min-h-screen p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-red-600 text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse" />
        <div className="space-y-4 max-w-md">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-24" />
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-20 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-28" />
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse" />
        </div>
      </div>
    );
  }

  const theme = (config?.theme as string) ?? "light";
  const apiTimeout = (config?.apiTimeout as number) ?? 5000;

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Remote Config</h1>

      <div className="space-y-4 max-w-md">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">theme</p>
          <p className="text-lg font-medium">{theme}</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">apiTimeout</p>
          <p className="text-lg font-medium">{apiTimeout}ms</p>
        </div>

        <button
          onClick={refresh}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Config
        </button>
      </div>
    </div>
  );
}
