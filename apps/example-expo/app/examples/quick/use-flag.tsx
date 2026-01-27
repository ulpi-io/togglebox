/**
 * Feature Flags Example
 *
 * Shows how to list flags and evaluate them with user context.
 * Demonstrates conditional rendering based on flag state.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Switch } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { AuthMode } from '@/components/AuthModeToggle'
import { Colors, DEFAULT_USER_ID } from '@/lib/constants'
import { toggleFlag, hasApiKey } from '@/lib/api'

const publicCode = `import { useFlags } from '@togglebox/sdk-expo'

function FeatureFlagsExample() {
  const { flags, isFlagEnabled, isLoading } = useFlags()
  const [showFeature, setShowFeature] = useState(false)

  // Evaluate flag with user context for targeting
  useEffect(() => {
    isFlagEnabled('new-dashboard', { userId: 'user-123' })
      .then(setShowFeature)
  }, [isFlagEnabled])

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      {/* Conditional rendering based on flag */}
      {showFeature ? <NewDashboard /> : <OldDashboard />}

      {/* List all flags */}
      <FlatList
        data={flags}
        keyExtractor={(item) => item.flagKey}
        renderItem={({ item }) => (
          <Text>{item.flagKey}: {item.enabled ? 'ON' : 'OFF'}</Text>
        )}
      />
    </View>
  )
}`

const authCode = `import { useFlags } from '@togglebox/sdk-expo'
import { toggleFlag } from '@/lib/api'  // Your API helper

function FeatureFlagsExample() {
  const { flags, isFlagEnabled, refresh } = useFlags()
  const [showFeature, setShowFeature] = useState(false)

  useEffect(() => {
    isFlagEnabled('new-dashboard', { userId: 'user-123' })
      .then(setShowFeature)
  }, [isFlagEnabled])

  // Toggle flag via internal API (requires API key)
  const handleToggle = async (flagKey: string, enabled: boolean) => {
    await toggleFlag('mobile', 'production', flagKey, enabled)
    await refresh()  // Refresh to get updated state
  }

  return (
    <FlatList
      data={flags}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text>{item.flagKey}</Text>
          <Switch
            value={item.enabled}
            onValueChange={(v) => handleToggle(item.flagKey, v)}
          />
        </View>
      )}
    />
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for write operations`

const keyPoints = [
  'useFlags() returns all flags, isFlagEnabled function, loading state',
  'isFlagEnabled(flagKey, context) evaluates flag for a specific user',
  'Context object allows user targeting: { userId, email, attributes }',
  'Use conditional rendering to show/hide features based on flag state',
  'In auth mode, you can toggle flags via internal API',
  'Call refresh() after toggling to update local state',
]

export default function UseFlagScreen() {
  return (
    <ExamplePage
      title="Use Flag"
      description="Check feature flags and conditionally render UI. Flags can be evaluated with user context for targeted rollouts."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      {(mode) => <FlagDemo mode={mode} />}
    </ExamplePage>
  )
}

function FlagDemo({ mode }: { mode: AuthMode }) {
  const { flags, isFlagEnabled, isLoading, refresh } = useFlags()
  const [evaluated, setEvaluated] = useState<boolean | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => {
    isFlagEnabled('new-dashboard', { userId: DEFAULT_USER_ID }).then(setEvaluated)
  }, [isFlagEnabled])

  const handleToggle = async (flagKey: string, enabled: boolean) => {
    if (!hasApiKey()) return
    setToggling(flagKey)
    try {
      await toggleFlag('mobile', 'staging', flagKey, enabled)
      await refresh()
    } finally {
      setToggling(null)
    }
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Loading flags...</Text>
      </View>
    )
  }

  return (
    <View style={styles.demo}>
      {/* Evaluated Flag Result */}
      <View style={[styles.evalCard, evaluated ? styles.evalEnabled : styles.evalDisabled]}>
        <Text style={styles.evalLabel}>new-dashboard (for {DEFAULT_USER_ID})</Text>
        <Text style={[styles.evalValue, evaluated ? styles.evalTextEnabled : styles.evalTextDisabled]}>
          {evaluated === null ? 'Checking...' : evaluated ? 'ENABLED' : 'DISABLED'}
        </Text>
      </View>

      {/* Conditional Rendering Example */}
      {evaluated ? (
        <View style={styles.featureCard}>
          <Text style={styles.featureTitle}>New Dashboard</Text>
          <Text style={styles.featureText}>This feature is enabled for you!</Text>
        </View>
      ) : (
        <View style={styles.oldFeatureCard}>
          <Text style={styles.oldFeatureTitle}>Classic Dashboard</Text>
          <Text style={styles.oldFeatureText}>New dashboard is not available yet.</Text>
        </View>
      )}

      {/* All Flags List */}
      <Text style={styles.listTitle}>All Flags ({flags.length})</Text>
      {flags.length === 0 ? (
        <Text style={styles.emptyText}>No flags configured</Text>
      ) : (
        <FlatList
          data={flags}
          keyExtractor={(item) => item.flagKey}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.flagRow}>
              <View style={styles.flagInfo}>
                <Text style={styles.flagKey}>{item.flagKey}</Text>
                <View style={[styles.badge, item.enabled ? styles.badgeOn : styles.badgeOff]}>
                  <Text style={[styles.badgeText, item.enabled && styles.badgeTextOn]}>
                    {item.enabled ? 'ON' : 'OFF'}
                  </Text>
                </View>
              </View>
              {mode === 'auth' && hasApiKey() && (
                <Switch
                  value={item.enabled}
                  onValueChange={(v) => handleToggle(item.flagKey, v)}
                  disabled={toggling === item.flagKey}
                  trackColor={{ true: Colors.success }}
                />
              )}
            </View>
          )}
        />
      )}
      {mode === 'auth' && !hasApiKey() && (
        <Text style={styles.noApiKeyText}>Set EXPO_PUBLIC_API_KEY to enable toggling</Text>
      )}
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
  evalCard: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  evalEnabled: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  evalDisabled: {
    backgroundColor: Colors.gray[50],
    borderColor: Colors.gray[200],
  },
  evalLabel: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  evalValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  evalTextEnabled: {
    color: Colors.success,
  },
  evalTextDisabled: {
    color: Colors.gray[500],
  },
  featureCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#15803d',
  },
  oldFeatureCard: {
    backgroundColor: Colors.gray[50],
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  oldFeatureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 4,
  },
  oldFeatureText: {
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
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  flagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  flagKey: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.gray[900],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeOn: {
    backgroundColor: '#dcfce7',
  },
  badgeOff: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  badgeTextOn: {
    color: '#166534',
  },
  noApiKeyText: {
    fontSize: 12,
    color: Colors.gray[400],
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
})
