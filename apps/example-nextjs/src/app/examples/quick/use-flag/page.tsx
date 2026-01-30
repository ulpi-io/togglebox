"use client";

import { useFlag, useFlags } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { flag, isLoading } = useFlag("dark-mode");
  const { flags } = useFlags();
  const darkMode = flag?.enabled ?? false;

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="h-8 bg-gray-200 rounded w-40 mb-6 animate-pulse" />
        <div className="max-w-md space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
            <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
            <div className="h-6 bg-gray-200 rounded w-16" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2 animate-pulse">
                <div className="w-2 h-2 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen p-8 ${darkMode ? "bg-gray-900 text-white" : "bg-white"}`}
    >
      <h1 className="text-2xl font-bold mb-6">Feature Flags</h1>

      <div className="max-w-md space-y-4">
        <div
          className={`p-4 rounded-lg ${darkMode ? "bg-green-900" : "bg-green-50"} border border-green-500`}
        >
          <p className="text-sm mb-1">dark-mode flag</p>
          <p className="text-lg font-semibold">
            {darkMode ? "Enabled" : "Disabled"}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">All Flags ({flags.length})</p>
          {flags.map((f) => (
            <div key={f.flagKey} className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${f.enabled ? "bg-green-500" : "bg-gray-400"}`}
              />
              <span className="font-mono text-sm">{f.flagKey}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
