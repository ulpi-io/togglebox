/**
 * Provider Setup Example
 *
 * Shows the ToggleBoxProvider configuration for both public and authenticated modes.
 * This is usually done in your root _layout.tsx file.
 */
import { View, Text, StyleSheet } from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors } from '@/lib/constants'

const publicCode = `// _layout.tsx
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
    >
      <Stack />
    </ToggleBoxProvider>
  )
}

// That's it! All child components can now use SDK hooks.`

const authCode = `// _layout.tsx
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
      tenantSubdomain="your-tenant"        // Cloud multi-tenancy
      pollingInterval={30000}              // Auto-refresh every 30s
      persistToStorage={true}              // Enable MMKV storage
      storageTTL={24 * 60 * 60 * 1000}     // 24 hours cache TTL
    >
      <Stack />
    </ToggleBoxProvider>
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for write operations
// All child components can now use SDK hooks.`

const keyPoints = [
  'Wrap your entire app with ToggleBoxProvider in _layout.tsx',
  'Public mode: Only platform, environment, and apiUrl are required',
  'Auth mode: Add tenantSubdomain for cloud multi-tenancy',
  'pollingInterval enables automatic data refresh (optional)',
  'persistToStorage with storageTTL enables offline support via MMKV',
  'All child components can use useConfig(), useFlags(), useExperiments() hooks',
]

export default function ProviderSetupScreen() {
  return (
    <ExamplePage
      title="Provider Setup"
      description="Configure ToggleBoxProvider at the root of your app to enable SDK hooks throughout your component tree."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <ProviderDemo />
    </ExamplePage>
  )
}

function ProviderDemo() {
  const { isLoading, error } = useConfig()

  return (
    <View style={styles.demo}>
      {/* Connection Status */}
      <View style={[styles.statusCard, error && styles.statusCardError]}>
        <Text style={styles.statusLabel}>Connection Status</Text>
        <Text style={[styles.statusValue, error && styles.statusValueError]}>
          {error ? 'Error' : isLoading ? 'Connecting...' : 'Connected'}
        </Text>
      </View>

      {/* Current Configuration */}
      <Text style={styles.configTitle}>Current Configuration</Text>
      <ConfigRow label="platform" value="mobile" />
      <ConfigRow label="environment" value="staging" />
      <ConfigRow label="pollingInterval" value="30000 (30s)" />
      <ConfigRow label="persistToStorage" value="true" />
      <ConfigRow label="storageTTL" value="86400000 (24h)" />
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
  demo: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: Colors.primary[50],
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  statusCardError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.success,
  },
  statusValueError: {
    color: Colors.error,
  },
  configTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginTop: 8,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  configLabel: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.gray[500],
  },
  configValue: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.gray[900],
  },
})
