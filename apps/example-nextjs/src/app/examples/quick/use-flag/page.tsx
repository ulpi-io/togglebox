"use client";

import { useState, useEffect } from "react";
import { useFlags } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { flags, isFlagEnabled, isLoading } = useFlags();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    isFlagEnabled("dark-mode", { userId: "user-123" }).then(setDarkMode);
  }, [isFlagEnabled]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
            {darkMode ? "ENABLED" : "DISABLED"}
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
