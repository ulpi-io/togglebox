"use client";

import { useConfig } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { config, isLoading, error, refresh } = useConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

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
