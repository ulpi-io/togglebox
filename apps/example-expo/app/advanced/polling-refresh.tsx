/**
 * Polling & Refresh Example
 *
 * Shows auto-polling and manual refresh for keeping data fresh.
 * Copy this file and adapt to your app.
 */
import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useToggleBox, useFlags } from '@togglebox/sdk-expo'

// Provider configuration for polling:
//
// <ToggleBoxProvider
//   platform="mobile"
//   environment="production"
//   apiUrl="https://your-api.example.com/api/v1"
//   pollingInterval={30000}  // Auto-refresh every 30 seconds
// >
//   <App />
// </ToggleBoxProvider>

export default function PollingRefreshScreen() {
  const { refresh, isLoading } = useToggleBox()
  const flags = useFlags()

  const [refreshCount, setRefreshCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    await refresh()
    setRefreshCount((c) => c + 1)
    setLastRefresh(new Date())
  }, [refresh])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Polling & Refresh</Text>

      {/* Polling Status */}
      <View style={styles.card}>
        <StatusRow label="Auto-Polling" value="Every 30s" />
        <StatusRow label="Manual Refreshes" value={String(refreshCount)} />
        <StatusRow
          label="Last Refresh"
          value={lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'}
        />
      </View>

      {/* Manual Refresh Button */}
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={handleRefresh}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Refresh Now</Text>
        )}
      </TouchableOpacity>

      {/* Pull-to-Refresh List */}
      <Text style={styles.sectionTitle}>Flags (pull to refresh)</Text>
      <View style={styles.listContainer}>
        <FlatList
          data={flags}
          keyExtractor={(item) => item.flagKey}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
          }
          renderItem={({ item }) => (
            <View style={styles.flagRow}>
              <Text style={styles.flagKey}>{item.flagKey}</Text>
              <View style={[styles.badge, item.enabled ? styles.onBadge : styles.offBadge]}>
                <Text style={styles.badgeText}>{item.enabled ? 'ON' : 'OFF'}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No flags available</Text>
          }
        />
      </View>
    </View>
  )
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  listContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
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
  onBadge: {
    backgroundColor: '#dcfce7',
  },
  offBadge: {
    backgroundColor: '#f5f5f5',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 24,
  },
})
