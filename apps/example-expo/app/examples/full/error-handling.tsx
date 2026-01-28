import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function ErrorHandlingScreen() {
  const { flags, error, isLoading, refresh } = useFlags()
  const [simulatedError, setSimulatedError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleRetry = useCallback(async () => {
    setRetryCount((c) => c + 1)
    setSimulatedError(null)
    await refresh()
  }, [refresh])

  const displayError = simulatedError || (error ? error.message : null)

  if (displayError) {
    const errorTitle = simulatedError === 'network' ? 'Network Error'
      : simulatedError === 'auth' ? 'Authentication Error'
      : simulatedError === 'rate_limit' ? 'Rate Limited'
      : 'Connection Error'

    const errorMessage = simulatedError === 'network' ? 'Device appears to be offline'
      : simulatedError === 'auth' ? 'Invalid or missing API key (401)'
      : simulatedError === 'rate_limit' ? 'Too many requests - retry in 60s (429)'
      : displayError

    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>{errorTitle}</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry ({retryCount})</Text>
          </TouchableOpacity>
        </View>

        {flags.length > 0 && (
          <View style={styles.cacheCard}>
            <Text style={styles.cacheTitle}>Using Cached Data</Text>
            <Text style={styles.cacheText}>{flags.length} flags available from cache</Text>
          </View>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={() => setSimulatedError(null)}>
          <Text style={styles.clearButtonText}>Clear Error</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isLoading && flags.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading flags...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Handling</Text>

      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>✓</Text>
        <Text style={styles.statusTitle}>Connected</Text>
        <Text style={styles.statusText}>{flags.length} flags loaded</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simulate Errors</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.simButton} onPress={() => setSimulatedError('network')}>
            <Text style={styles.simButtonText}>Network</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.simButton} onPress={() => setSimulatedError('auth')}>
            <Text style={styles.simButtonText}>Auth 401</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.simButton} onPress={() => setSimulatedError('rate_limit')}>
            <Text style={styles.simButtonText}>Rate 429</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Offline Support</Text>
        <Text style={styles.tipText}>
          With persistToStorage enabled, your app keeps working with cached data even when offline.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  loadingText: { fontSize: 14, color: '#6b7280' },
  errorCard: { backgroundColor: '#fef2f2', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca', marginBottom: 12 },
  errorIcon: { fontSize: 36, marginBottom: 8 },
  errorTitle: { fontSize: 17, fontWeight: '600', color: '#ef4444', marginBottom: 4 },
  errorMessage: { fontSize: 14, color: '#dc2626', textAlign: 'center', marginBottom: 16 },
  retryButton: { backgroundColor: '#ef4444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  cacheCard: { backgroundColor: '#fefce8', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#fef08a', marginBottom: 12 },
  cacheTitle: { fontSize: 14, fontWeight: '600', color: '#ca8a04', marginBottom: 4 },
  cacheText: { fontSize: 13, color: '#a16207' },
  clearButton: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 8, alignItems: 'center' },
  clearButtonText: { color: '#6b7280', fontWeight: '500' },
  statusCard: { backgroundColor: '#f0fdf4', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 16 },
  statusIcon: { fontSize: 32, marginBottom: 4, color: '#22c55e' },
  statusTitle: { fontSize: 17, fontWeight: '600', color: '#22c55e' },
  statusText: { fontSize: 14, color: '#16a34a' },
  card: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 16 },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 12, color: '#374151' },
  buttonRow: { flexDirection: 'row', gap: 8 },
  simButton: { flex: 1, backgroundColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 6, alignItems: 'center' },
  simButtonText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  tipCard: { backgroundColor: '#eff6ff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  tipTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#1e40af' },
  tipText: { fontSize: 13, color: '#1d4ed8', lineHeight: 20 },
})
