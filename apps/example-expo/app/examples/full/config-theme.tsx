/**
 * Config-Driven Theme Example
 *
 * Applies theme colors from remote config.
 * Falls back to defaults if config not available.
 * Copy this file and adapt to your app.
 */
import { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'

export default function ConfigThemeScreen() {
  const config = useConfig()

  const defaultTheme = useMemo(
    () => ({
      primaryColor: '#3b82f6',
      secondaryColor: '#6b7280',
      accentColor: '#10b981',
      borderRadius: 8,
    }),
    []
  )

  // Get theme from config or use defaults
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
    <View style={styles.container}>
      <Text style={styles.title}>Config Theme</Text>

      {/* Themed Header */}
      <Text style={[styles.heading, { color: theme.primaryColor as string }]}>
        Themed Heading
      </Text>

      {/* Themed Text */}
      <Text style={[styles.text, { color: theme.secondaryColor as string }]}>
        This text uses the secondary color from remote config.
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
          💡 Update the theme object in your remote config to see changes reflected here
          instantly (with polling enabled).
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
        {isColor && (
          <View
            style={[styles.colorSwatch, { backgroundColor: value }]}
          />
        )}
        <Text style={styles.themeValue}>{value}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  themeLabel: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#666',
  },
  themeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  themeValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  tipCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
  },
  tipText: {
    fontSize: 13,
    color: '#0284c7',
    lineHeight: 20,
  },
})
