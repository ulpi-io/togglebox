/**
 * Error Handling Example
 *
 * Shows how to handle API errors gracefully.
 * Copy this file and adapt to your app.
 */
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function ErrorHandlingScreen() {
  const { flags, error, isLoading, refresh } = useFlags()

  // Error state - show error UI with retry
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Connection Error</Text>
          <Text style={styles.errorMessage}>{error.message}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>

        {/* Show cached data if available */}
        {flags.length > 0 && (
          <View style={styles.cacheCard}>
            <Text style={styles.cacheTitle}>Using Cached Data</Text>
            <Text style={styles.cacheText}>
              {flags.length} flags available from cache
            </Text>
          </View>
        )}
      </View>
    )
  }

  // Loading state
  if (isLoading && flags.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  // Success state
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Error Handling</Text>

      {/* Current Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>✓</Text>
        <Text style={styles.statusTitle}>Connected</Text>
        <Text style={styles.statusText}>{flags.length} flags loaded</Text>
      </View>

      {/* Common Errors Reference */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Common Error Types</Text>

        <ErrorType
          title="Network Error"
          description="Device offline or API unreachable"
          action="Show offline banner, use cached data"
        />
        <ErrorType
          title="Auth Error (401)"
          description="Invalid or missing API key"
          action="Check EXPO_PUBLIC_API_KEY"
        />
        <ErrorType
          title="Rate Limit (429)"
          description="Too many requests"
          action="Wait and retry with backoff"
        />
        <ErrorType
          title="Server Error (500)"
          description="API server issue"
          action="Display error, suggest retry"
        />
      </View>

      {/* Tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipText}>
          💡 With persistToStorage enabled, your app keeps working with cached data even when offline.
        </Text>
      </View>
    </View>
  )
}

function ErrorType({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: string
}) {
  return (
    <View style={styles.errorType}>
      <Text style={styles.errorTypeTitle}>{title}</Text>
      <Text style={styles.errorTypeDesc}>{description}</Text>
      <Text style={styles.errorTypeAction}>→ {action}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ef4444',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#ef4444',
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
    padding: 16,
    borderRadius: 8,
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
  statusCard: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
  },
  statusText: {
    fontSize: 14,
    color: '#16a34a',
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
  errorType: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  errorTypeTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  errorTypeDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  errorTypeAction: {
    fontSize: 12,
    color: '#0ea5e9',
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
