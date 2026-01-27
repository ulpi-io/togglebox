/**
 * Full Integration Example
 *
 * A complete example combining all SDK features.
 * Copy this file and adapt to your app.
 */
import { useState, useEffect, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useToggleBox, useFlags, useConfig, useExperiments } from '@togglebox/sdk-expo'

// Your _layout.tsx provider setup:
//
// <ToggleBoxProvider
//   platform="mobile"
//   environment="production"
//   apiUrl="https://your-api.example.com/api/v1"
//   pollingInterval={30000}
//   persistToStorage={true}
//   storageTTL={24 * 60 * 60 * 1000}
// >
//   <App />
// </ToggleBoxProvider>

export default function FullIntegrationScreen() {
  const { isFlagEnabled, getVariant, refresh, error, isLoading } = useToggleBox()
  const flags = useFlags()
  const config = useConfig()
  const experiments = useExperiments()

  const [refreshing, setRefreshing] = useState(false)
  const [showNewLayout, setShowNewLayout] = useState<boolean | null>(null)
  const [checkoutVariant, setCheckoutVariant] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(true)

  const userId = 'user-123' // Get from your auth system

  // Evaluate flags and experiments on mount
  useEffect(() => {
    const evaluate = async () => {
      setEvaluating(true)
      try {
        const [flagResult, variantResult] = await Promise.all([
          isFlagEnabled('new-layout', { userId }),
          getVariant('checkout-test', { userId }),
        ])
        setShowNewLayout(flagResult)
        setCheckoutVariant(variantResult)
      } catch {
        setShowNewLayout(false)
        setCheckoutVariant('control')
      }
      setEvaluating(false)
    }
    evaluate()
  }, [userId, isFlagEnabled, getVariant])

  // Pull-to-refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  // Stats
  const configKeys = config ? Object.keys(config).length : 0
  const enabledFlags = flags.filter((f) => f.enabled).length
  const runningExperiments = experiments.filter((e) => e.status === 'running').length

  // Error state
  if (error && flags.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.title}>Full Integration</Text>

      {/* Stats Overview */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{configKeys}</Text>
          <Text style={styles.statLabel}>Config Keys</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{flags.length}</Text>
          <Text style={styles.statLabel}>Flags ({enabledFlags} on)</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{experiments.length}</Text>
          <Text style={styles.statLabel}>Experiments</Text>
        </View>
      </View>

      {/* Evaluation Results */}
      <View style={styles.evaluationCard}>
        <Text style={styles.sectionTitle}>Targeted Evaluation</Text>
        <Text style={styles.userId}>User: {userId}</Text>

        {evaluating ? (
          <View style={styles.evaluatingRow}>
            <ActivityIndicator size="small" color="#0ea5e9" />
            <Text style={styles.evaluatingText}>Evaluating...</Text>
          </View>
        ) : (
          <>
            <EvaluationRow
              label="new-layout flag"
              value={showNewLayout ? 'Enabled' : 'Disabled'}
              isEnabled={showNewLayout || false}
            />
            <EvaluationRow
              label="checkout-test experiment"
              value={checkoutVariant || 'Not assigned'}
              isEnabled={!!checkoutVariant}
            />
          </>
        )}
      </View>

      {/* Feature Preview */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Feature Preview</Text>

        {/* Layout based on flag */}
        <Text style={styles.previewLabel}>Layout (based on flag):</Text>
        <View style={[styles.previewBox, showNewLayout && styles.previewBoxEnabled]}>
          <Text style={styles.previewText}>
            {showNewLayout ? '📱 New Grid Layout' : '📋 Classic List Layout'}
          </Text>
        </View>

        {/* Checkout based on experiment */}
        <Text style={styles.previewLabel}>Checkout (based on experiment):</Text>
        <View style={[styles.previewBox, checkoutVariant === 'new-checkout' && styles.previewBoxEnabled]}>
          <Text style={styles.previewText}>
            {checkoutVariant === 'new-checkout' ? '⚡ One-Click Checkout' : '🛒 Standard Checkout'}
          </Text>
        </View>
      </View>

      {/* Refresh Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoText}>
          Pull down to refresh • Auto-refreshes every 30s
        </Text>
        {error && (
          <Text style={styles.warningText}>
            ⚠️ {error.message}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

function EvaluationRow({
  label,
  value,
  isEnabled,
}: {
  label: string
  value: string
  isEnabled: boolean
}) {
  return (
    <View style={styles.evaluationRow}>
      <Text style={styles.evaluationLabel}>{label}</Text>
      <View style={[styles.evaluationBadge, isEnabled ? styles.enabledBadge : styles.disabledBadge]}>
        <Text style={[styles.evaluationValue, isEnabled ? styles.enabledText : styles.disabledText]}>
          {value}
        </Text>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  evaluationCard: {
    backgroundColor: '#f0f9ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  userId: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    marginBottom: 12,
  },
  evaluatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evaluatingText: {
    color: '#0ea5e9',
  },
  evaluationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0f2fe',
  },
  evaluationLabel: {
    fontSize: 13,
    color: '#666',
    fontFamily: 'monospace',
  },
  evaluationBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  enabledBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  disabledBadge: {
    backgroundColor: '#e5e5e5',
  },
  evaluationValue: {
    fontSize: 12,
    fontWeight: '600',
  },
  enabledText: {
    color: '#22c55e',
  },
  disabledText: {
    color: '#666',
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    marginTop: 8,
  },
  previewBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  previewBoxEnabled: {
    borderColor: '#22c55e',
    backgroundColor: '#f0fdf4',
  },
  previewText: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    textAlign: 'center',
    marginTop: 8,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
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
})
