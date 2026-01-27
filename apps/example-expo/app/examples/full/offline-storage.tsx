/**
 * Offline Storage Example
 *
 * Shows how MMKV persistence works for offline support.
 * Data loads instantly from cache, then refreshes in background.
 */
import { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useFlags, useConfig, useExperiments } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `// In _layout.tsx - Enable MMKV persistence
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function Layout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
      persistToStorage={true}           // Enable MMKV caching
      storageTTL={24 * 60 * 60 * 1000}  // 24 hours cache TTL
    >
      <App />
    </ToggleBoxProvider>
  )
}

// In component - data loads instantly from cache
function MyComponent() {
  const { flags, isLoading } = useFlags()

  // flags is populated immediately from MMKV cache
  // isLoading is true while fetching fresh data
  // UI never shows empty state (unless first ever load)

  return (
    <View>
      <Text>{flags.length} flags loaded</Text>
      {isLoading && <Text>Refreshing...</Text>}
    </View>
  )
}`

const authCode = `// In _layout.tsx - Full offline configuration
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function Layout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
      persistToStorage={true}           // Enable MMKV caching
      storageTTL={24 * 60 * 60 * 1000}  // 24 hours cache TTL
      pollingInterval={30000}            // Refresh every 30s when online
    >
      <App />
    </ToggleBoxProvider>
  )
}

// In component - with network awareness
import NetInfo from '@react-native-community/netinfo'

function MyComponent() {
  const { flags, error, refresh } = useFlags()
  const [isOffline, setIsOffline] = useState(false)

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected)
    })
    return unsubscribe
  }, [])

  return (
    <View>
      {isOffline && (
        <OfflineBanner message="Using cached data" />
      )}
      <FlagsList flags={flags} />
      {!isOffline && (
        <Button title="Refresh" onPress={refresh} />
      )}
    </View>
  )
}

// Benefits:
// 1. Instant app startup (no loading spinner)
// 2. Works completely offline
// 3. Auto-refreshes when back online
// 4. Cache auto-expires after storageTTL`

const keyPoints = [
  'persistToStorage enables MMKV caching for instant load',
  'storageTTL controls how long cached data is considered valid',
  'Data loads from cache first, then refreshes in background',
  'App works completely offline with cached data',
  'Combine with pollingInterval for background refresh when online',
  'MMKV is faster than AsyncStorage (synchronous access)',
]

export default function OfflineStorageScreen() {
  return (
    <ExamplePage
      title="Offline Storage"
      description="Enable MMKV persistence for instant app startup and offline support. Data loads from cache first, then refreshes."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <OfflineStorageDemo />
    </ExamplePage>
  )
}

function OfflineStorageDemo() {
  const { flags, isLoading, error, refresh } = useFlags()
  const { config } = useConfig()
  const { experiments } = useExperiments()
  const [simulateOffline, setSimulateOffline] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // Count cached data
  const flagCount = flags.length
  const configKeys = config ? Object.keys(config).length : 0
  const experimentCount = experiments.length

  const handleRefresh = async () => {
    await refresh()
    setLastRefresh(new Date())
  }

  return (
    <View style={styles.demo}>
      {/* Offline Simulation */}
      {simulateOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>📴 Simulating Offline Mode - Using Cached Data</Text>
        </View>
      )}

      {/* Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusIcon}>💾</Text>
        <Text style={styles.statusTitle}>MMKV Storage Active</Text>
        <Text style={styles.statusText}>Data is cached locally for offline use</Text>
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
          value={simulateOffline ? 'Offline (simulated)' : error ? 'Error' : isLoading ? 'Refreshing...' : 'Connected'}
          isOk={!error && !simulateOffline}
        />
        <StatusRow label="Cache" value={flagCount > 0 ? 'Data available' : 'Empty'} isOk={flagCount > 0} />
        <StatusRow
          label="Last Refresh"
          value={lastRefresh ? lastRefresh.toLocaleTimeString() : 'N/A'}
          isOk={true}
        />
      </View>

      {/* Actions */}
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

      {/* How It Works */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How It Works</Text>
        <WorkflowStep number="1" text="App starts → loads from MMKV instantly" />
        <WorkflowStep number="2" text="UI renders with cached data (no spinner)" />
        <WorkflowStep number="3" text="Background fetch updates cache" />
        <WorkflowStep number="4" text="If offline → cache keeps working" />
        <WorkflowStep number="5" text="Cache expires after storageTTL" />
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Why MMKV?</Text>
        <Text style={styles.infoText}>
          MMKV is significantly faster than AsyncStorage because it uses memory-mapped files with synchronous access.
          Your app loads instantly without waiting for async storage reads.
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

function WorkflowStep({ number, text }: { number: string; text: string }) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  offlineBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '500',
  },
  statusCard: {
    backgroundColor: Colors.primary[50],
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  statusIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.primary[700],
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: Colors.primary[600],
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[900],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  card: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.gray[700],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  rowLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: Colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButtonActive: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
  },
  outlineButtonText: {
    color: Colors.gray[700],
    fontWeight: '600',
    fontSize: 15,
  },
  outlineButtonTextActive: {
    color: '#92400e',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary[700],
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray[600],
  },
  infoCard: {
    backgroundColor: Colors.gray[800],
    padding: 14,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.gray[100],
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray[300],
    lineHeight: 20,
  },
})
