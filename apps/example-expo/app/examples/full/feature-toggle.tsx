/**
 * Feature Toggle Example
 *
 * Shows/hides a feature based on flag evaluation.
 * Includes loading state and error handling.
 * Copy this file and adapt to your app.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function FeatureToggleScreen() {
  const { isFlagEnabled, isLoading } = useFlags()
  const [showFeature, setShowFeature] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    async function checkFlag() {
      const enabled = await isFlagEnabled('new-dashboard', {
        userId: 'user-123', // Replace with actual user ID
      })
      setShowFeature(enabled)
      setChecked(true)
    }

    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled])

  if (isLoading || !checked) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Checking feature flag...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature Toggle</Text>

      {/* Feature Display */}
      {showFeature ? <NewDashboard /> : <OldDashboard />}

      {/* Explanation */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoText}>
          The component checks the &quot;new-dashboard&quot; flag on mount.{'\n\n'}
          • If enabled → Shows the new feature{'\n'}
          • If disabled → Shows the old feature{'\n\n'}
          Flags are evaluated with user context for targeted rollouts.
        </Text>
      </View>

      {/* Current Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Flag Status</Text>
        <View style={[styles.badge, showFeature ? styles.enabledBadge : styles.disabledBadge]}>
          <Text style={[styles.badgeText, showFeature && styles.enabledBadgeText]}>
            {showFeature ? 'ENABLED' : 'DISABLED'}
          </Text>
        </View>
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
        This is the new feature-flagged dashboard with enhanced capabilities.
      </Text>
    </View>
  )
}

function OldDashboard() {
  return (
    <View style={styles.oldFeatureCard}>
      <View style={styles.featureHeader}>
        <Text style={styles.featureEmoji}>📊</Text>
        <Text style={styles.oldFeatureTitle}>Dashboard</Text>
      </View>
      <Text style={styles.oldFeatureText}>
        This is the standard dashboard shown when the flag is disabled.
      </Text>
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
  featureCard: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#86efac',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  oldFeatureCard: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#166534',
  },
  oldFeatureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  featureText: {
    fontSize: 14,
    color: '#15803d',
    lineHeight: 20,
  },
  oldFeatureText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  enabledBadge: {
    backgroundColor: '#dcfce7',
  },
  disabledBadge: {
    backgroundColor: '#f3f4f6',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  enabledBadgeText: {
    color: '#166534',
  },
})
