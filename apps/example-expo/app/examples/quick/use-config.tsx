/**
 * Remote Config Example
 *
 * Shows how to fetch and display remote configuration values.
 * Demonstrates both direct access and typed getter patterns.
 */
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `import { useConfig } from '@togglebox/sdk-expo'

function MyComponent() {
  const { config, isLoading, error } = useConfig()

  if (isLoading) return <ActivityIndicator />
  if (error) return <Text>Error: {error.message}</Text>
  if (!config) return <Text>No config loaded</Text>

  // Direct access
  const theme = config.theme as string
  const apiTimeout = config.apiTimeout as number

  return (
    <View>
      <Text>Theme: {theme}</Text>
      <Text>API Timeout: {apiTimeout}ms</Text>
    </View>
  )
}`

const authCode = `import { useConfig } from '@togglebox/sdk-expo'

function MyComponent() {
  const { config, getConfigValue, isLoading, refresh } = useConfig()

  if (isLoading) return <ActivityIndicator />

  // Type-safe getter with default value
  const theme = getConfigValue('theme', 'light')
  const apiTimeout = getConfigValue('apiTimeout', 5000)
  const features = getConfigValue('features', {})

  return (
    <View>
      <Text>Theme: {theme}</Text>
      <Text>API Timeout: {apiTimeout}ms</Text>
      <Text>Features: {JSON.stringify(features)}</Text>
      <Button title="Refresh" onPress={refresh} />
    </View>
  )
}

// With auth, you can also update configs via internal API
// POST /api/v1/internal/platforms/{p}/environments/{e}/versions`

const keyPoints = [
  'useConfig() returns config object, loading state, error, and refresh function',
  'Access config values directly: config.theme, config.apiTimeout',
  'Use getConfigValue(key, default) for type-safe access with fallbacks',
  'Config is automatically cached (MMKV) when persistToStorage is enabled',
  'Call refresh() to manually fetch latest configuration',
  'In auth mode, you can update configs via the internal API',
]

export default function UseConfigScreen() {
  return (
    <ExamplePage
      title="Use Config"
      description="Read remote configuration values with useConfig() hook. Access config directly or use typed getters with default values."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <ConfigDemo />
    </ExamplePage>
  )
}

function ConfigDemo() {
  const { config, isLoading, error } = useConfig()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading configuration...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.errorCard}>
        <Text style={styles.errorTitle}>Error Loading Config</Text>
        <Text style={styles.errorText}>{error.message}</Text>
      </View>
    )
  }

  if (!config) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyText}>No configuration loaded</Text>
      </View>
    )
  }

  const configKeys = Object.keys(config)

  return (
    <View style={styles.demo}>
      {/* Sample Config Values */}
      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>theme</Text>
        <Text style={styles.valueText}>{String(config.theme ?? 'default')}</Text>
      </View>

      <View style={styles.valueCard}>
        <Text style={styles.valueLabel}>apiTimeout</Text>
        <Text style={styles.valueText}>{String(config.apiTimeout ?? 5000)}ms</Text>
      </View>

      {/* All Config Keys */}
      <View style={styles.keysCard}>
        <Text style={styles.keysLabel}>All Config Keys ({configKeys.length})</Text>
        <Text style={styles.keysText}>
          {configKeys.length > 0 ? configKeys.join(', ') : 'No keys defined'}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
  },
  emptyCard: {
    backgroundColor: Colors.gray[100],
    padding: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  valueCard: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  valueLabel: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  valueText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  keysCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  keysLabel: {
    fontSize: 12,
    color: Colors.primary[700],
    marginBottom: 4,
  },
  keysText: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.primary[900],
  },
})
