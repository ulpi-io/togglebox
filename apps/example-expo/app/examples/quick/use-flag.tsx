/**
 * Feature Flags Example
 *
 * Shows how to list flags and evaluate them with user context.
 * Copy this file and adapt to your app.
 */
import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function FeatureFlagsScreen() {
  const { flags, isFlagEnabled, isLoading } = useFlags()

  // Example: evaluate a specific flag for a user
  const [newDashboardEnabled, setNewDashboardEnabled] = useState(false)
  const userId = 'user-123' // Get from your auth system

  useEffect(() => {
    isFlagEnabled('new-dashboard', { userId }).then(setNewDashboardEnabled)
  }, [userId, isFlagEnabled])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Feature Flags</Text>

      {/* Conditional rendering based on flag */}
      {newDashboardEnabled ? (
        <View style={styles.featureCard}>
          <Text style={styles.featureText}>New Dashboard Enabled!</Text>
        </View>
      ) : (
        <View style={[styles.featureCard, styles.disabledCard]}>
          <Text style={styles.featureText}>Classic Dashboard</Text>
        </View>
      )}

      {/* List all flags */}
      <Text style={styles.subtitle}>All Flags ({flags.length})</Text>
      <FlatList
        data={flags}
        keyExtractor={(item) => item.flagKey}
        renderItem={({ item }) => (
          <View style={styles.flagRow}>
            <Text style={styles.flagKey}>{item.flagKey}</Text>
            <View style={[styles.badge, item.enabled ? styles.enabledBadge : styles.disabledBadge]}>
              <Text style={styles.badgeText}>{item.enabled ? 'ON' : 'OFF'}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No flags configured</Text>}
      />
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
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  featureCard: {
    backgroundColor: '#22c55e',
    padding: 16,
    borderRadius: 8,
  },
  disabledCard: {
    backgroundColor: '#e5e5e5',
  },
  featureText: {
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  flagKey: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  enabledBadge: {
    backgroundColor: '#dcfce7',
  },
  disabledBadge: {
    backgroundColor: '#f5f5f5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: '#999',
    paddingVertical: 24,
  },
})
