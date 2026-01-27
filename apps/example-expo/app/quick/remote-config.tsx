/**
 * Remote Config Example
 *
 * Shows how to fetch and display remote configuration.
 * Copy this file and adapt to your app.
 */
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useConfig, useToggleBox } from '@togglebox/sdk-expo'

export default function RemoteConfigScreen() {
  const config = useConfig()
  const { isLoading } = useToggleBox()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!config) {
    return (
      <View style={styles.center}>
        <Text>No configuration loaded</Text>
      </View>
    )
  }

  // Access config values directly
  const theme = config.theme as string | undefined
  const apiTimeout = config.apiTimeout as number | undefined

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Remote Config</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Theme</Text>
        <Text style={styles.value}>{theme ?? 'default'}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>API Timeout</Text>
        <Text style={styles.value}>{apiTimeout ?? 5000}ms</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>All Keys</Text>
        <Text style={styles.value}>{Object.keys(config).join(', ') || 'none'}</Text>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
})
