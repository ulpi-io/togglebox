/**
 * Offline Storage Example
 *
 * Shows how MMKV persistence works for offline support.
 * Enable persistToStorage in ToggleBoxProvider.
 * Copy this file and adapt to your app.
 */
import { View, Text, StyleSheet } from 'react-native'
import { useToggleBox, useFlags, useConfig, useExperiments } from '@togglebox/sdk-expo'

// Provider configuration for offline support:
//
// <ToggleBoxProvider
//   platform="mobile"
//   environment="production"
//   apiUrl="https://your-api.example.com/api/v1"
//   persistToStorage={true}           // Enable MMKV storage
//   storageTTL={24 * 60 * 60 * 1000}  // 24 hours cache TTL
// >
//   <App />
// </ToggleBoxProvider>

export default function OfflineStorageScreen() {
  const { isLoading, error } = useToggleBox()
  const flags = useFlags()
  const config = useConfig()
  const experiments = useExperiments()

  // Count cached data
  const flagCount = flags.length
  const configKeys = config ? Object.keys(config).length : 0
  const experimentCount = experiments.length

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Offline Storage</Text>

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>📱</Text>
        <Text style={styles.statusTitle}>MMKV Storage Active</Text>
        <Text style={styles.statusText}>
          Data is cached locally for offline use
        </Text>
      </View>

      {/* Cached Data Stats */}
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

      {/* Connection Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connection Status</Text>
        <StatusRow
          label="API"
          value={error ? 'Offline' : isLoading ? 'Loading...' : 'Connected'}
          isOk={!error}
        />
        <StatusRow
          label="Cache"
          value={flagCount > 0 ? 'Data available' : 'Empty'}
          isOk={flagCount > 0}
        />
      </View>

      {/* How It Works */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <Text style={styles.stepText}>1. App starts → loads from MMKV instantly</Text>
        <Text style={styles.stepText}>2. UI renders with cached data</Text>
        <Text style={styles.stepText}>3. Background fetch updates data</Text>
        <Text style={styles.stepText}>4. If offline → cache keeps working</Text>
      </View>
    </View>
  )
}

function StatusRow({ label, value, isOk }: { label: string; value: string; isOk: boolean }) {
  return (
    <View style={styles.statusRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, { color: isOk ? '#22c55e' : '#ef4444' }]}>
        {value}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#f0f9ff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0284c7',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#0ea5e9',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  rowLabel: {
    fontSize: 14,
    color: '#666',
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepText: {
    fontSize: 13,
    color: '#666',
    paddingVertical: 4,
  },
})
