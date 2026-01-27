/**
 * Feature Toggle Example
 *
 * Complete production pattern for showing/hiding features based on flag evaluation.
 * Includes loading states, error handling, and conditional rendering.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors, DEFAULT_USER_ID } from '@/lib/constants'

const publicCode = `import { useState, useEffect } from 'react'
import { useFlags } from '@togglebox/sdk-expo'

function FeatureToggleExample() {
  const { isFlagEnabled, isLoading } = useFlags()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoading) return

    isFlagEnabled('new-dashboard', { userId: 'user-123' })
      .then((enabled) => {
        setShowFeature(enabled)
        setChecked(true)
      })
  }, [isLoading, isFlagEnabled])

  // Loading state while checking flag
  if (isLoading || !checked) {
    return <LoadingSpinner />
  }

  // Conditional rendering based on flag
  return showFeature ? <NewDashboard /> : <OldDashboard />
}`

const authCode = `import { useState, useEffect, useCallback } from 'react'
import { useFlags } from '@togglebox/sdk-expo'
import { toggleFlag } from '@/lib/api'

function FeatureToggleExample() {
  const { isFlagEnabled, refresh, isLoading } = useFlags()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  const checkFlag = useCallback(async () => {
    const enabled = await isFlagEnabled('new-dashboard', { userId: 'user-123' })
    setShowFeature(enabled)
    setChecked(true)
  }, [isFlagEnabled])

  useEffect(() => {
    if (!isLoading) checkFlag()
  }, [isLoading, checkFlag])

  // Admin toggle (requires API key)
  const handleToggle = async (enabled: boolean) => {
    await toggleFlag('mobile', 'production', 'new-dashboard', enabled)
    await refresh()
    await checkFlag()
  }

  if (isLoading || !checked) return <LoadingSpinner />

  return (
    <View>
      {showFeature ? <NewDashboard /> : <OldDashboard />}
      <AdminToggle onToggle={handleToggle} enabled={showFeature} />
    </View>
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for toggle operations`

const keyPoints = [
  'Check flag after SDK loads (wait for isLoading === false)',
  'Track "checked" state to prevent flash of wrong content',
  'Show loading spinner while evaluating flag',
  'Use conditional rendering for different feature versions',
  'Context object enables user-targeted rollouts',
  'In auth mode, admins can toggle flags via internal API',
]

export default function FeatureToggleScreen() {
  return (
    <ExamplePage
      title="Feature Toggle"
      description="Production pattern for conditionally showing features. Includes proper loading states and user-targeted evaluation."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <FeatureToggleDemo />
    </ExamplePage>
  )
}

function FeatureToggleDemo() {
  const { isFlagEnabled, isLoading } = useFlags()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (isLoading) return

    isFlagEnabled('new-dashboard', { userId: DEFAULT_USER_ID })
      .then((enabled) => {
        setShowFeature(enabled)
        setChecked(true)
      })
  }, [isLoading, isFlagEnabled])

  if (isLoading || !checked) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Checking feature flag...</Text>
      </View>
    )
  }

  return (
    <View style={styles.demo}>
      {/* Conditional Feature Rendering */}
      {showFeature ? <NewDashboard /> : <OldDashboard />}

      {/* Status Badge */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Flag Status</Text>
        <View style={[styles.badge, showFeature ? styles.badgeEnabled : styles.badgeDisabled]}>
          <Text style={[styles.badgeText, showFeature && styles.badgeTextEnabled]}>
            {showFeature ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
      </View>

      {/* Explanation */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          1. Component mounts → SDK loads data{'\n'}
          2. After load → evaluate flag for user{'\n'}
          3. Show loading spinner during evaluation{'\n'}
          4. Render appropriate feature version{'\n\n'}
          User context enables targeted rollouts.
        </Text>
      </View>
    </View>
  )
}

function NewDashboard() {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureHeader}>
        <Text style={styles.featureEmoji}>✨</Text>
        <Text style={styles.featureTitle}>New Dashboard</Text>
      </View>
      <Text style={styles.featureText}>
        This is the new feature-flagged dashboard with enhanced capabilities and modern design.
      </Text>
    </View>
  )
}

function OldDashboard() {
  return (
    <View style={styles.oldFeatureCard}>
      <View style={styles.featureHeader}>
        <Text style={styles.featureEmoji}>📊</Text>
        <Text style={styles.oldFeatureTitle}>Classic Dashboard</Text>
      </View>
      <Text style={styles.oldFeatureText}>
        This is the standard dashboard shown when the new-dashboard flag is disabled.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 16,
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
  featureCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    padding: 20,
    borderRadius: 12,
  },
  oldFeatureCard: {
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    padding: 20,
    borderRadius: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureEmoji: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
  },
  oldFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[700],
  },
  featureText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  oldFeatureText: {
    fontSize: 14,
    color: Colors.gray[500],
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  badgeEnabled: {
    backgroundColor: '#dcfce7',
  },
  badgeDisabled: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  badgeTextEnabled: {
    color: '#166534',
  },
  infoCard: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.gray[700],
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray[600],
    lineHeight: 20,
  },
})
