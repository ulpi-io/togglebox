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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
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
