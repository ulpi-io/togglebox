/**
 * Provider Setup Example
 *
 * Shows the ToggleBoxProvider configuration options.
 * This is usually done in your root _layout.tsx file.
 * Copy this pattern and adapt to your app.
 */
import { View, Text, StyleSheet } from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'

// Your _layout.tsx should look like this:
//
// import { ToggleBoxProvider } from '@togglebox/sdk-expo'
//
// export default function RootLayout() {
//   return (
//     <ToggleBoxProvider
//       platform="mobile"
//       environment="production"
//       apiUrl="https://your-api.example.com/api/v1"
//       pollingInterval={30000}           // Auto-refresh every 30s
//       persistToStorage={true}           // Enable MMKV storage
//       storageTTL={24 * 60 * 60 * 1000}  // 24 hours cache
//       tenantSubdomain="your-tenant"     // For cloud multi-tenancy
//     >
//       <Stack />
//     </ToggleBoxProvider>
//   )
// }

export default function ProviderSetupScreen() {
  const { isLoading, error } = useConfig()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Provider Setup</Text>

      {/* Connection Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Connection Status</Text>
        <Text style={styles.statusValue}>
          {error ? 'Error' : isLoading ? 'Connecting...' : 'Connected'}
        </Text>
      </View>

      {/* Current Configuration (from this example app) */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Configuration</Text>
        <ConfigRow label="platform" value="mobile" />
        <ConfigRow label="environment" value="production" />
        <ConfigRow label="pollingInterval" value="30000 (30s)" />
        <ConfigRow label="persistToStorage" value="true" />
      </View>

      <Text style={styles.hint}>
        The provider is configured in _layout.tsx.
        All child components can use the SDK hooks.
      </Text>
    </View>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
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
    marginBottom: 24,
  },
  statusCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 12,
    color: '#666',
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#22c55e',
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
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  configLabel: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#666',
  },
  configValue: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  hint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
})
