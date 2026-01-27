/**
 * Experiments Example
 *
 * Shows how to list experiments and assign users to variants.
 * Demonstrates conditional UI rendering based on assigned variant.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useExperiments } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { AuthMode } from '@/components/AuthModeToggle'
import { Colors, DEFAULT_USER_ID } from '@/lib/constants'
import { startExperiment, pauseExperiment, completeExperiment, hasApiKey } from '@/lib/api'

const publicCode = `import { useExperiments } from '@togglebox/sdk-expo'

function ExperimentsExample() {
  const { experiments, getVariant, isLoading } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)

  // Assign user to experiment variant
  useEffect(() => {
    getVariant('checkout-test', { userId: 'user-123' })
      .then(setVariant)
  }, [getVariant])

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      {/* Render different UI based on variant */}
      {variant === 'new-checkout' ? (
        <Button title="One-Click Purchase" />
      ) : (
        <Button title="Proceed to Checkout" />
      )}

      {/* List all experiments */}
      <FlatList
        data={experiments}
        renderItem={({ item }) => (
          <Text>{item.experimentKey}: {item.status}</Text>
        )}
      />
    </View>
  )
}`

const authCode = `import { useExperiments } from '@togglebox/sdk-expo'
import { startExperiment, completeExperiment } from '@/lib/api'

function ExperimentsExample() {
  const { experiments, getVariant, refresh } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    getVariant('checkout-test', { userId: 'user-123' })
      .then(setVariant)
  }, [getVariant])

  // Manage experiment lifecycle (requires API key)
  const handleStart = async (experimentKey: string) => {
    await startExperiment('mobile', 'production', experimentKey)
    await refresh()
  }

  const handleComplete = async (experimentKey: string) => {
    await completeExperiment('mobile', 'production', experimentKey)
    await refresh()
  }

  return (
    <FlatList
      data={experiments}
      renderItem={({ item }) => (
        <View>
          <Text>{item.experimentKey}: {item.status}</Text>
          {item.status === 'draft' && (
            <Button title="Start" onPress={() => handleStart(item.experimentKey)} />
          )}
          {item.status === 'running' && (
            <Button title="Complete" onPress={() => handleComplete(item.experimentKey)} />
          )}
        </View>
      )}
    />
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for write operations`

const keyPoints = [
  'useExperiments() returns all experiments, getVariant function, loading state',
  'getVariant(experimentKey, context) assigns user to a variant deterministically',
  'Same user always gets the same variant (consistent assignment)',
  'Use conditional rendering to show different UI per variant',
  'In auth mode, you can start/pause/complete experiments via API',
  'Experiment statuses: draft, running, paused, completed',
]

export default function UseExperimentScreen() {
  return (
    <ExamplePage
      title="Use Experiment"
      description="Assign users to A/B test variants and render different UI. Variant assignment is deterministic - same user gets same variant."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      {(mode) => <ExperimentDemo mode={mode} />}
    </ExamplePage>
  )
}

function ExperimentDemo({ mode }: { mode: AuthMode }) {
  const { experiments, getVariant, isLoading, refresh } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    getVariant('checkout-test', { userId: DEFAULT_USER_ID }).then(setVariant)
  }, [getVariant])

  const handleAction = async (experimentKey: string, action: 'start' | 'pause' | 'complete') => {
    if (!hasApiKey()) return
    setLoading(`${experimentKey}-${action}`)
    try {
      if (action === 'start') await startExperiment('mobile', 'staging', experimentKey)
      else if (action === 'pause') await pauseExperiment('mobile', 'staging', experimentKey)
      else await completeExperiment('mobile', 'staging', experimentKey)
      await refresh()
    } finally {
      setLoading(null)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading experiments...</Text>
      </View>
    )
  }

  return (
    <View style={styles.demo}>
      {/* Assigned Variant */}
      <View style={styles.variantCard}>
        <Text style={styles.variantLabel}>checkout-test variant (for {DEFAULT_USER_ID})</Text>
        <Text style={styles.variantValue}>{variant ?? 'Not assigned'}</Text>
      </View>

      {/* Variant-based UI */}
      {variant === 'new-checkout' ? (
        <TouchableOpacity style={styles.newButton}>
          <Text style={styles.buttonText}>One-Click Purchase</Text>
        </TouchableOpacity>
      ) : variant === 'control' ? (
        <TouchableOpacity style={styles.controlButton}>
          <Text style={styles.buttonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.noVariant}>
          <Text style={styles.noVariantText}>No experiment running or user not assigned</Text>
        </View>
      )}

      {/* All Experiments */}
      <Text style={styles.listTitle}>All Experiments ({experiments.length})</Text>
      {experiments.length === 0 ? (
        <Text style={styles.emptyText}>No experiments configured</Text>
      ) : (
        <FlatList
          data={experiments}
          keyExtractor={(item) => item.experimentKey}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.experimentRow}>
              <View style={styles.experimentInfo}>
                <Text style={styles.experimentKey}>{item.experimentKey}</Text>
                <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
                  <Text style={[styles.statusText, getStatusTextStyle(item.status)]}>
                    {item.status.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.variationCount}>{item.variations.length} variants</Text>
              {mode === 'auth' && hasApiKey() && (
                <View style={styles.actions}>
                  {item.status === 'draft' && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleAction(item.experimentKey, 'start')}
                      disabled={loading === `${item.experimentKey}-start`}
                    >
                      <Text style={styles.actionText}>Start</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'running' && (
                    <>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAction(item.experimentKey, 'pause')}
                        disabled={loading === `${item.experimentKey}-pause`}
                      >
                        <Text style={styles.actionText}>Pause</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleAction(item.experimentKey, 'complete')}
                        disabled={loading === `${item.experimentKey}-complete`}
                      >
                        <Text style={styles.actionText}>Complete</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}
            </View>
          )}
        />
      )}
      {mode === 'auth' && !hasApiKey() && (
        <Text style={styles.noApiKeyText}>Set EXPO_PUBLIC_API_KEY to manage experiments</Text>
      )}
    </View>
  )
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'running': return styles.statusRunning
    case 'completed': return styles.statusCompleted
    case 'paused': return styles.statusPaused
    default: return styles.statusDraft
  }
}

function getStatusTextStyle(status: string) {
  switch (status) {
    case 'running': return styles.statusTextRunning
    case 'completed': return styles.statusTextCompleted
    case 'paused': return styles.statusTextPaused
    default: return styles.statusTextDraft
  }
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
  variantCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  variantLabel: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  variantValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  newButton: {
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: Colors.primary[500],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  noVariant: {
    backgroundColor: Colors.gray[100],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  noVariantText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.gray[400],
    textAlign: 'center',
    paddingVertical: 16,
  },
  experimentRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  experimentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  experimentKey: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.gray[900],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusDraft: {
    backgroundColor: Colors.gray[100],
  },
  statusRunning: {
    backgroundColor: '#dcfce7',
  },
  statusPaused: {
    backgroundColor: '#fef3c7',
  },
  statusCompleted: {
    backgroundColor: Colors.primary[100],
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextDraft: {
    color: Colors.gray[600],
  },
  statusTextRunning: {
    color: '#166534',
  },
  statusTextPaused: {
    color: '#b45309',
  },
  statusTextCompleted: {
    color: Colors.primary[700],
  },
  variationCount: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.primary[500],
    borderRadius: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  noApiKeyText: {
    fontSize: 12,
    color: Colors.gray[400],
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
})
