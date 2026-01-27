'use client'

import { useConfig } from '@togglebox/sdk-nextjs'
import { useEffect, useMemo } from 'react'

/**
 * Config-Driven Theming Example (Full Implementation)
 *
 * This example shows how to:
 *   1. Use remote config to drive UI theming
 *   2. Apply config values to CSS variables
 *   3. Provide sensible fallback defaults
 *   4. Update theme dynamically when config changes
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * USE CASE: REMOTE THEMING
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Why use remote config for theming?
 *   - A/B test different color schemes
 *   - Seasonal or promotional themes
 *   - Brand customization for white-label apps
 *   - Fix theme bugs without deploying
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * HOW IT WORKS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 1. useConfig() fetches remote config from ToggleBox
 * 2. Config contains a "theme" object: { primaryColor: '#3b82f6', ... }
 * 3. We merge remote theme with default values (fallback if not set)
 * 4. Theme values are applied to CSS custom properties
 * 5. CSS variables update the UI: var(--color-primary)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * REMOTE CONFIG STRUCTURE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * In ToggleBox admin, your config might look like:
 *
 *   {
 *     "theme": {
 *       "primaryColor": "#6366f1",
 *       "secondaryColor": "#64748b",
 *       "accentColor": "#f59e0b",
 *       "borderRadius": "12px"
 *     }
 *   }
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export default function ConfigTheme() {
  // useConfig() returns the entire config object
  // The config structure depends on what you stored in ToggleBox admin
  const { config, isLoading } = useConfig()

  // Define default theme values - used when config is loading or missing
  // IMPORTANT: Always have defaults so your app works even if ToggleBox is down
  const defaultTheme = useMemo(() => ({
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    accentColor: '#10b981',
    borderRadius: '8px',
  }), [])

  // Get theme from config or use defaults
  // config?.theme accesses the nested "theme" object from your remote config
  const themeConfig = config?.theme as Record<string, string> | undefined
  const theme = useMemo(() => ({
    ...defaultTheme,          // Start with defaults
    ...(themeConfig || {}),   // Override with remote values (if available)
  }), [defaultTheme, themeConfig])

  // Apply theme to CSS custom properties
  // This allows any CSS to use: var(--color-primary)
  useEffect(() => {
    if (isLoading) return  // Don't apply until config is loaded
    const root = document.documentElement
    root.style.setProperty('--color-primary', theme.primaryColor)
    root.style.setProperty('--color-secondary', theme.secondaryColor)
    root.style.setProperty('--color-accent', theme.accentColor)
    root.style.setProperty('--border-radius', theme.borderRadius)
  }, [theme, isLoading])

  if (isLoading) {
    return <div className="animate-pulse">Loading theme...</div>
  }

  return (
    <div className="space-y-4">
      <h1 style={{ color: theme.primaryColor }} className="text-2xl font-bold">
        Themed Heading
      </h1>

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
    </div>
  )
}
