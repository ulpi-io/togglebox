'use client'

import { useConfig } from '@togglebox/sdk-nextjs'
import { useEffect, useMemo } from 'react'

/**
 * Config-Driven Theme
 *
 * Applies theme colors from remote config to CSS variables.
 * Falls back to defaults if config not available.
 */
export default function ConfigTheme() {
  const { config, isLoading } = useConfig()

  const defaultTheme = useMemo(() => ({
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    accentColor: '#10b981',
    borderRadius: '8px',
  }), [])

  // Get theme from config or use defaults
  const themeConfig = config?.theme as Record<string, string> | undefined
  const theme = useMemo(() => ({
    ...defaultTheme,
    ...(themeConfig || {}),
  }), [defaultTheme, themeConfig])

  // Apply theme to CSS variables
  useEffect(() => {
    if (isLoading) return
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
