import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function PollingUpdatesScreen() {
  const { flags, refresh, isLoading } = useFlags()
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const handleRefresh = useCallback(async () => {
    await refresh()
    setRefreshCount((c) => c + 1)
    setLastRefresh(new Date())
  }, [refresh])

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Polling Updates</Text>

      <View style={styles.statusCard}>
        <StatusRow label="Auto-Polling" value="Every 30s" />
        <StatusRow label="Manual Refreshes" value={String(refreshCount)} />
        <StatusRow label="Last Refresh" value={lastRefresh ? lastRefresh.toLocaleTimeString() : 'Never'} />
      </View>

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

      <Text style={styles.sectionTitle}>Flags (pull to refresh)</Text>
      <View style={styles.listContainer}>
        <FlatList
          data={flags}
          keyExtractor={(item) => item.flagKey}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
          renderItem={({ item }) => (
            <View style={styles.flagRow}>
              <Text style={styles.flagKey}>{item.flagKey}</Text>
              <View style={[styles.badge, item.enabled ? styles.onBadge : styles.offBadge]}>
                <Text style={[styles.badgeText, item.enabled && styles.badgeTextOn]}>
                  {item.enabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No flags available</Text>}
        />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Real-Time Updates</Text>
        <Text style={styles.infoText}>
          With pollingInterval enabled, changes made in your dashboard appear here automatically.
        </Text>
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
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  statusCard: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusLabel: { fontSize: 14, color: '#6b7280' },
  statusValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  button: { backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  listContainer: { height: 180, backgroundColor: '#f9fafb', borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', overflow: 'hidden', marginBottom: 16 },
  flagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  flagKey: { fontSize: 14, fontFamily: 'monospace', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  onBadge: { backgroundColor: '#dcfce7' },
  offBadge: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#6b7280' },
  badgeTextOn: { color: '#166534' },
  emptyText: { textAlign: 'center', color: '#9ca3af', padding: 24, fontSize: 14 },
  infoCard: { backgroundColor: '#eff6ff', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' },
  infoTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#1e40af' },
  infoText: { fontSize: 13, color: '#1d4ed8', lineHeight: 20 },
})
