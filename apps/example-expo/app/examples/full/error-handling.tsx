/**
 * Error Handling Example
 *
 * Shows how to handle API errors gracefully with retry logic,
 * offline fallback, and cached data display.
 */
import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `import { useFlags } from '@togglebox/sdk-expo'

function ErrorHandlingExample() {
  const { flags, error, isLoading, refresh } = useFlags()

  // Error state with retry option
  if (error) {
    return (
      <View>
        <Text>Error: {error.message}</Text>
        <Button title="Retry" onPress={refresh} />

        {/* Show cached data if available */}
        {flags.length > 0 && (
          <Text>Using {flags.length} cached flags</Text>
        )}
      </View>
    )
  }

  // Loading state (only show if no cached data)
  if (isLoading && flags.length === 0) {
    return <ActivityIndicator />
  }

  // Success - render with data
  return <FlagsList flags={flags} />
}`

const authCode = `import { useFlags } from '@togglebox/sdk-expo'
import { NetInfo } from '@react-native-community/netinfo'

function ErrorHandlingExample() {
  const { flags, error, isLoading, refresh } = useFlags()
  const [isOffline, setIsOffline] = useState(false)

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected)
    })
    return () => unsubscribe()
  }, [])

  // Error handling with different error types
  if (error) {
    const errorType = getErrorType(error)

    return (
      <View>
        {errorType === 'network' && (
          <OfflineBanner message="You're offline" />
        )}
        {errorType === 'auth' && (
          <ErrorBanner message="Check your API key" />
        )}
        {errorType === 'rate_limit' && (
          <ErrorBanner message="Rate limited - retry in 60s" />
        )}

        <Button title="Retry" onPress={refresh} disabled={isOffline} />

        {/* Always show cached data if available */}
        {flags.length > 0 && <FlagsList flags={flags} />}
      </View>
    )
  }

  return <FlagsList flags={flags} />
}

function getErrorType(error: Error): string {
  if (error.message.includes('network')) return 'network'
  if (error.message.includes('401')) return 'auth'
  if (error.message.includes('429')) return 'rate_limit'
  return 'unknown'
}

// With persistToStorage, cached data survives app restarts`

const keyPoints = [
  'Check error state first, then loading, then render data',
  'Always show cached data when available (better UX than empty state)',
  'Use refresh() for manual retry with exponential backoff',
  'Differentiate error types: network, auth (401), rate limit (429), server (500)',
  'With persistToStorage enabled, cached data works offline',
  'Show loading spinner only when no cached data exists',
]

export default function ErrorHandlingScreen() {
  return (
    <ExamplePage
      title="Error Handling"
      description="Handle API errors gracefully with retry logic and offline fallback. Shows cached data when available."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <ErrorHandlingDemo />
    </ExamplePage>
  )
}

function ErrorHandlingDemo() {
  const { flags, error, isLoading, refresh } = useFlags()
  const [simulatedError, setSimulatedError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const handleRetry = useCallback(async () => {
    setRetryCount((c) => c + 1)
    setSimulatedError(null)
    await refresh()
  }, [refresh])

  const simulateError = (type: string) => {
    setSimulatedError(type)
  }

  // Show simulated or real error
  const displayError = simulatedError || (error ? error.message : null)

  if (displayError) {
    return (
      <View style={styles.demo}>
        {/* Error Card */}
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>
            {simulatedError === 'network'
              ? 'Network Error'
              : simulatedError === 'auth'
                ? 'Authentication Error'
                : simulatedError === 'rate_limit'
                  ? 'Rate Limited'
                  : 'Connection Error'}
          </Text>
          <Text style={styles.errorMessage}>
            {simulatedError === 'network'
              ? 'Device appears to be offline'
              : simulatedError === 'auth'
                ? 'Invalid or missing API key (401)'
                : simulatedError === 'rate_limit'
                  ? 'Too many requests - retry in 60s (429)'
                  : displayError}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryText}>Retry ({retryCount})</Text>
          </TouchableOpacity>
        </View>

        {/* Show cached data if available */}
        {flags.length > 0 && (
          <View style={styles.cacheCard}>
            <Text style={styles.cacheTitle}>Using Cached Data</Text>
            <Text style={styles.cacheText}>{flags.length} flags available from cache</Text>
          </View>
        )}

        <TouchableOpacity style={styles.clearButton} onPress={() => setSimulatedError(null)}>
          <Text style={styles.clearButtonText}>Clear Simulated Error</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // Loading state
  if (isLoading && flags.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading flags...</Text>
      </View>
    )
  }

  // Success state
  return (
    <View style={styles.demo}>
      {/* Current Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>✓</Text>
        <Text style={styles.statusTitle}>Connected</Text>
        <Text style={styles.statusText}>{flags.length} flags loaded successfully</Text>
      </View>

      {/* Simulate Errors Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simulate Errors</Text>
        <Text style={styles.cardDescription}>Test error handling by simulating different error types</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.simButton} onPress={() => simulateError('network')}>
            <Text style={styles.simButtonText}>Network</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.simButton} onPress={() => simulateError('auth')}>
            <Text style={styles.simButtonText}>Auth 401</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.simButton} onPress={() => simulateError('rate_limit')}>
            <Text style={styles.simButtonText}>Rate 429</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Common Errors Reference */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Error Type Reference</Text>
        <ErrorTypeRow title="Network Error" description="Device offline or API unreachable" action="Show offline banner, use cache" />
        <ErrorTypeRow title="Auth Error (401)" description="Invalid or missing API key" action="Check EXPO_PUBLIC_API_KEY" />
        <ErrorTypeRow title="Rate Limit (429)" description="Too many requests" action="Wait and retry with backoff" />
        <ErrorTypeRow title="Server Error (500)" description="API server issue" action="Display error, suggest retry" />
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Offline Support</Text>
        <Text style={styles.tipText}>
          With persistToStorage enabled, your app keeps working with cached data even when offline.
        </Text>
      </View>
    </View>
  )
}

function ErrorTypeRow({ title, description, action }: { title: string; description: string; action: string }) {
  return (
    <View style={styles.errorType}>
      <Text style={styles.errorTypeTitle}>{title}</Text>
      <Text style={styles.errorTypeDesc}>{description}</Text>
      <Text style={styles.errorTypeAction}>→ {action}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  cacheCard: {
    backgroundColor: '#fefce8',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  cacheTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ca8a04',
    marginBottom: 4,
  },
  cacheText: {
    fontSize: 13,
    color: '#a16207',
  },
  clearButton: {
    backgroundColor: Colors.gray[100],
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearButtonText: {
    color: Colors.gray[600],
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 4,
    color: '#22c55e',
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusText: {
    fontSize: 14,
    color: '#16a34a',
  },
  card: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.gray[700],
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simButton: {
    flex: 1,
    backgroundColor: Colors.gray[200],
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  simButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  errorType: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  errorTypeTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
    color: Colors.gray[900],
  },
  errorTypeDesc: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  errorTypeAction: {
    fontSize: 12,
    color: Colors.primary[600],
  },
  tipCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  tipTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.primary[800],
  },
  tipText: {
    fontSize: 13,
    color: Colors.primary[700],
    lineHeight: 20,
  },
})
