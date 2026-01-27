/**
 * Config-Driven Theme Example
 *
 * Shows how to apply dynamic theming based on remote configuration.
 * Theme values update in real-time when config changes (with polling).
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `import { useMemo } from 'react'
import { useConfig } from '@togglebox/sdk-expo'

const defaultTheme = {
  primaryColor: '#3b82f6',
  secondaryColor: '#6b7280',
  accentColor: '#10b981',
  borderRadius: 8,
}

function ConfigThemeExample() {
  const { config } = useConfig()

  // Merge remote config theme with defaults
  const theme = useMemo(() => ({
    ...defaultTheme,
    ...(config?.theme || {}),
  }), [config?.theme])

  return (
    <View>
      <Text style={{ color: theme.primaryColor }}>
        Themed Heading
      </Text>
      <TouchableOpacity
        style={{
          backgroundColor: theme.primaryColor,
          borderRadius: theme.borderRadius,
        }}
      >
        <Text>Primary Button</Text>
      </TouchableOpacity>
    </View>
  )
}`

const authCode = `import { useMemo, useCallback } from 'react'
import { useConfig } from '@togglebox/sdk-expo'
import { updateConfig } from '@/lib/api'  // Your API helper

function ConfigThemeExample() {
  const { config, refresh } = useConfig()

  const theme = useMemo(() => ({
    primaryColor: '#3b82f6',
    secondaryColor: '#6b7280',
    accentColor: '#10b981',
    borderRadius: 8,
    ...(config?.theme || {}),
  }), [config?.theme])

  // Update theme in remote config (requires API key)
  const handleThemeChange = useCallback(async (updates: object) => {
    await updateConfig('mobile', 'production', {
      theme: { ...config?.theme, ...updates }
    })
    await refresh()  // Fetch updated config
  }, [config?.theme, refresh])

  return (
    <View>
      <ThemedContent theme={theme} />
      <ColorPicker
        currentColor={theme.primaryColor}
        onColorChange={(color) => handleThemeChange({ primaryColor: color })}
      />
    </View>
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for config updates
// With pollingInterval, theme changes propagate to all users`

const keyPoints = [
  'Store theme values in remote config object',
  'Merge remote config with local defaults for fallback',
  'useMemo prevents unnecessary re-renders on config changes',
  'With polling enabled, theme changes appear in real-time',
  'Great for seasonal themes, A/B testing colors, branding updates',
  'In auth mode, you can update theme values remotely',
]

export default function ConfigThemeScreen() {
  return (
    <ExamplePage
      title="Config Theme"
      description="Apply dynamic theming from remote configuration. Change colors, border radius, and other visual properties without app updates."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <ConfigThemeDemo />
    </ExamplePage>
  )
}

function ConfigThemeDemo() {
  const { config } = useConfig()

  const defaultTheme = useMemo(
    () => ({
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280',
      accentColor: '#10b981',
      borderRadius: 8,
    }),
    []
  )

  const themeConfig = config?.theme as Record<string, string | number> | undefined
  const theme = useMemo(
    () => ({
      ...defaultTheme,
      ...(themeConfig || {}),
    }),
    [defaultTheme, themeConfig]
  )

  const borderRadius = typeof theme.borderRadius === 'number' ? theme.borderRadius : 8

  return (
    <View style={styles.demo}>
      {/* Themed Header */}
      <Text style={[styles.heading, { color: theme.primaryColor as string }]}>
        Themed Heading
      </Text>

      {/* Themed Text */}
      <Text style={[styles.text, { color: theme.secondaryColor as string }]}>
        This text uses the secondary color from remote config. Change it in your dashboard!
      </Text>

      {/* Themed Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.primaryColor as string,
              borderRadius,
            },
          ]}
        >
          <Text style={styles.buttonText}>Primary</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.accentColor as string,
              borderRadius,
            },
          ]}
        >
          <Text style={styles.buttonText}>Accent</Text>
        </TouchableOpacity>
      </View>

      {/* Current Theme Values */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Theme Values</Text>
        <ThemeRow label="primaryColor" value={theme.primaryColor as string} isColor />
        <ThemeRow label="secondaryColor" value={theme.secondaryColor as string} isColor />
        <ThemeRow label="accentColor" value={theme.accentColor as string} isColor />
        <ThemeRow label="borderRadius" value={`${borderRadius}px`} />
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipText}>
          With polling enabled, theme updates in your config will appear here automatically without app restart.
        </Text>
      </View>
    </View>
  )
}

function ThemeRow({
  label,
  value,
  isColor,
}: {
  label: string
  value: string
  isColor?: boolean
}) {
  return (
    <View style={styles.themeRow}>
      <Text style={styles.themeLabel}>{label}</Text>
      <View style={styles.themeValueRow}>
        {isColor && <View style={[styles.colorSwatch, { backgroundColor: value }]} />}
        <Text style={styles.themeValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  card: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.gray[700],
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  themeLabel: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.gray[500],
  },
  themeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.gray[900],
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  tipCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  tipText: {
    fontSize: 13,
    color: Colors.primary[700],
    lineHeight: 20,
  },
})
