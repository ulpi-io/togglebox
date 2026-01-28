import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useFlags, useConfig, useExperiments } from '@togglebox/sdk-expo'

export default function OfflineStorageScreen() {
  const { flags, isLoading, error, refresh } = useFlags()
  const { config } = useConfig()
  const { experiments } = useExperiments()
  const [simulateOffline, setSimulateOffline] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const flagCount = flags.length
  const configKeys = config ? Object.keys(config).length : 0
  const experimentCount = experiments.length

  const handleRefresh = async () => {
    await refresh()
    setLastRefresh(new Date())
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Storage</Text>

      {simulateOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📴 Offline Mode - Using Cached Data</Text>
        </View>
      )}

      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>💾</Text>
        <Text style={styles.statusTitle}>MMKV Storage Active</Text>
        <Text style={styles.statusText}>Data is cached locally for offline use</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{flagCount}</Text>
          <Text style={styles.statLabel}>Flags</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{configKeys}</Text>
          <Text style={styles.statLabel}>Config Keys</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{experimentCount}</Text>
          <Text style={styles.statLabel}>Experiments</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <StatusRow
          label="API"
          value={simulateOffline ? 'Offline (simulated)' : error ? 'Error' : isLoading ? 'Refreshing...' : 'Connected'}
          isOk={!error && !simulateOffline}
        />
        <StatusRow label="Cache" value={flagCount > 0 ? 'Data available' : 'Empty'} isOk={flagCount > 0} />
        <StatusRow label="Last Refresh" value={lastRefresh ? lastRefresh.toLocaleTimeString() : 'N/A'} isOk={true} />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, simulateOffline && styles.buttonDisabled]}
          onPress={handleRefresh}
          disabled={simulateOffline}
        >
          <Text style={styles.buttonText}>Refresh Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.outlineButton, simulateOffline && styles.outlineButtonActive]}
          onPress={() => setSimulateOffline(!simulateOffline)}
        >
          <Text style={[styles.outlineButtonText, simulateOffline && styles.outlineButtonTextActive]}>
            {simulateOffline ? 'Go Online' : 'Go Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Why MMKV?</Text>
        <Text style={styles.infoText}>
          MMKV is significantly faster than AsyncStorage because it uses memory-mapped files with synchronous access.
        </Text>
      </View>
    </View>
  )
}

function StatusRow({ label, value, isOk }: { label: string; value: string; isOk: boolean }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: isOk ? '#22c55e' : '#f59e0b' }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  offlineBanner: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fcd34d', marginBottom: 12 },
  offlineBannerText: { fontSize: 13, color: '#92400e', textAlign: 'center', fontWeight: '500' },
  statusCard: { backgroundColor: '#eff6ff', padding: 20, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12 },
  statusIcon: { fontSize: 32, marginBottom: 8 },
  statusTitle: { fontSize: 17, fontWeight: '600', color: '#1d4ed8', marginBottom: 4 },
  statusText: { fontSize: 14, color: '#3b82f6' },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#f9fafb', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#f9fafb', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 12 },
  cardTitle: { fontSize: 13, fontWeight: '600', marginBottom: 10, color: '#374151' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  rowLabel: { fontSize: 14, color: '#6b7280' },
  rowValue: { fontSize: 14, fontWeight: '500' },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  button: { flex: 1, backgroundColor: '#3b82f6', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  outlineButton: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', padding: 14, borderRadius: 8, alignItems: 'center' },
  outlineButtonActive: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  outlineButtonText: { color: '#374151', fontWeight: '600', fontSize: 15 },
  outlineButtonTextActive: { color: '#92400e' },
  infoCard: { backgroundColor: '#1f2937', padding: 14, borderRadius: 8 },
  infoTitle: { fontSize: 13, fontWeight: '600', marginBottom: 6, color: '#f3f4f6' },
  infoText: { fontSize: 13, color: '#d1d5db', lineHeight: 20 },
})
