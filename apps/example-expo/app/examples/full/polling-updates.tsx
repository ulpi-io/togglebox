/**
 * Polling & Refresh Example
 *
 * Shows auto-polling for real-time updates and manual refresh patterns.
 * Includes pull-to-refresh for mobile-friendly data refresh.
 */
import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `// In _layout.tsx - Enable auto-polling
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://your-api.example.com/api/v1"
  pollingInterval={30000}  // Auto-refresh every 30 seconds
>
  <App />
</ToggleBoxProvider>

// In component - Manual refresh
function PollingExample() {
  const { flags, refresh, isLoading } = useFlags()

  return (
    <FlatList
      data={flags}
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
        />
      }
      renderItem={({ item }) => (
        <FlagItem flag={item} />
      )}
    />
  )
}`

const authCode = `// In _layout.tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://your-api.example.com/api/v1"
  pollingInterval={30000}     // Auto-refresh every 30s
  persistToStorage={true}      // Cache for offline
  storageTTL={86400000}        // 24h cache TTL
>
  <App />
</ToggleBoxProvider>

// In component - with manual refresh and last update time
function PollingExample() {
  const { flags, refresh, isLoading } = useFlags()
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const handleRefresh = useCallback(async () => {
    await refresh()
    setLastRefresh(new Date())
  }, [refresh])

  return (
    <View>
      <Text>Last refresh: {lastRefresh?.toLocaleTimeString()}</Text>
      <Button title="Refresh Now" onPress={handleRefresh} disabled={isLoading} />
      <FlatList
        data={flags}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => <FlagItem flag={item} />}
      />
    </View>
  )
}

// Changes made in dashboard appear after next poll or manual refresh`

const keyPoints = [
  'pollingInterval enables automatic background refresh',
  'refresh() function allows manual data refresh',
  'Pull-to-refresh pattern with RefreshControl',
  'Combine with persistToStorage for offline + fresh data',
  'isLoading state indicates when refresh is in progress',
  'Typical polling intervals: 30s-60s for real-time, 5-15m for static data',
]

export default function PollingUpdatesScreen() {
  return (
    <ExamplePage
      title="Polling Updates"
      description="Keep data fresh with automatic polling and manual refresh. Includes pull-to-refresh for native mobile experience."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <PollingDemo />
    </ExamplePage>
  )
}

function PollingDemo() {
  const { flags, refresh, isLoading } = useFlags()
  const [refreshCount, setRefreshCount] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const handleRefresh = useCallback(async () => {
    await refresh()
    setRefreshCount((c) => c + 1)
    setLastRefresh(new Date())
  }, [refresh])

  return (
    <View style={styles.demo}>
      {/* Polling Status */}
      <View style={styles.statusCard}>
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
                <Text style={[styles.badgeText, item.enabled && styles.badgeTextOn]}>
                  {item.enabled ? 'ON' : 'OFF'}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No flags available</Text>}
        />
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Real-Time Updates</Text>
        <Text style={styles.infoText}>
          With pollingInterval enabled, changes you make in your dashboard will appear here automatically.
          Pull down on the list to refresh manually.
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
  demo: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  button: {
    backgroundColor: Colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 4,
  },
  listContainer: {
    height: 180,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    overflow: 'hidden',
  },
  flagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
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
  onBadge: {
    backgroundColor: '#dcfce7',
  },
  offBadge: {
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
  emptyText: {
    textAlign: 'center',
    color: Colors.gray[400],
    padding: 24,
    fontSize: 14,
  },
  infoCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: Colors.primary[800],
  },
  infoText: {
    fontSize: 13,
    color: Colors.primary[700],
    lineHeight: 20,
  },
})
