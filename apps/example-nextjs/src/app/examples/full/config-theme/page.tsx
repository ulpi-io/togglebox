"use client";

import { useEffect, useMemo } from "react";
import { useConfig } from "@togglebox/sdk-nextjs";

export default function Page() {
  const { config, isLoading, refresh } = useConfig();

  const defaultTheme = useMemo(
    () => ({
      primaryColor: "#3b82f6",
      secondaryColor: "#6b7280",
      accentColor: "#10b981",
      borderRadius: "8px",
    }),
    [],
  );

  const themeConfig = config?.theme as Record<string, string> | undefined;
  const theme = useMemo(
    () => ({
      ...defaultTheme,
      ...(themeConfig || {}),
    }),
    [defaultTheme, themeConfig],
  );

  useEffect(() => {
    if (isLoading) return;
    const root = document.documentElement;
    root.style.setProperty("--color-primary", theme.primaryColor);
    root.style.setProperty("--color-secondary", theme.secondaryColor);
    root.style.setProperty("--color-accent", theme.accentColor);
    root.style.setProperty("--border-radius", theme.borderRadius);
  }, [theme, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-8">
        <div className="h-9 bg-gray-200 rounded w-56 mb-6 animate-pulse" />
        <div className="max-w-md space-y-6">
          <div className="h-5 bg-gray-200 rounded w-72 animate-pulse" />
          <div className="flex gap-3">
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse" />
            <div className="h-10 bg-gray-200 rounded w-36 animate-pulse" />
          </div>
          <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-32 mb-3" />
            <div className="grid grid-cols-2 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
          <div className="h-10 bg-gray-200 rounded-lg w-36 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <h1
        style={{ color: theme.primaryColor }}
        className="text-3xl font-bold mb-6"
      >
        Config-Driven Theme
      </h1>

      <div className="max-w-md space-y-6">
        <p style={{ color: theme.secondaryColor }}>
          This text uses the secondary color from remote config.
        </p>

        <div className="flex gap-3">
          <button
            style={{
              backgroundColor: theme.primaryColor,
              borderRadius: theme.borderRadius,
            }}
            className="px-4 py-2 text-white"
          >
            Primary Button
          </button>
          <button
            style={{
              backgroundColor: theme.accentColor,
              borderRadius: theme.borderRadius,
            }}
            className="px-4 py-2 text-white"
          >
            Accent Button
          </button>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3 text-gray-900">Current Theme</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(theme).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-gray-500">{key}:</span>
                <span className="font-mono">{value}</span>
                {value.startsWith("#") && (
                  <div
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ backgroundColor: value }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={refresh}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          Refresh Theme
        </button>
      </div>
    </div>
  );
}
