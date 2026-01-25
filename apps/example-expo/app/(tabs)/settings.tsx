import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { hasApiKey } from '@/lib/api'
import { Colors, API_URL, PLATFORM, ENVIRONMENT, DEFAULT_USER_ID } from '@/lib/constants'

export default function SettingsScreen() {
  const apiKeyConfigured = hasApiKey()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Current environment configuration</Text>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>API URL</Text>
          <Text style={styles.rowValue}>{API_URL}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Platform</Text>
          <Text style={styles.rowValue}>{PLATFORM}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Environment</Text>
          <Text style={styles.rowValue}>{ENVIRONMENT}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Default User ID</Text>
          <Text style={styles.rowValue}>{DEFAULT_USER_ID}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>API Key</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, apiKeyConfigured ? styles.statusGreen : styles.statusYellow]} />
            <Text style={[styles.statusText, apiKeyConfigured ? styles.statusTextGreen : styles.statusTextYellow]}>
              {apiKeyConfigured ? 'Configured' : 'Not configured (public mode)'}
            </Text>
          </View>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Offline Storage</Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, styles.statusGreen]} />
            <Text style={[styles.statusText, styles.statusTextGreen]}>
              MMKV Enabled (24h TTL)
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Environment Variables</Text>
        <Text style={styles.infoText}>
          Configure these environment variables in .env:
        </Text>
        <View style={styles.codeBlock}>
          <Text style={styles.code}>{`# Required
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_PLATFORM=mobile
EXPO_PUBLIC_ENVIRONMENT=staging

# Optional
EXPO_PUBLIC_API_KEY=your-api-key-here
EXPO_PUBLIC_USER_ID=demo-user-123`}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Feature Coverage</Text>

        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Remote Config (Tier 1)</Text>
            <Text style={styles.featureDescription}>Fetch and display configurations</Text>
          </View>
          <View style={[styles.badge, styles.availableBadge]}>
            <Text style={[styles.badgeText, styles.availableText]}>Available</Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Feature Flags (Tier 2)</Text>
            <Text style={styles.featureDescription}>List, evaluate, and toggle flags</Text>
          </View>
          <View style={[styles.badge, apiKeyConfigured ? styles.availableBadge : styles.partialBadge]}>
            <Text style={[styles.badgeText, apiKeyConfigured ? styles.availableText : styles.partialText]}>
              {apiKeyConfigured ? 'Full Access' : 'Read-only'}
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Experiments (Tier 3)</Text>
            <Text style={styles.featureDescription}>List, assign, and manage experiments</Text>
          </View>
          <View style={[styles.badge, apiKeyConfigured ? styles.availableBadge : styles.partialBadge]}>
            <Text style={[styles.badgeText, apiKeyConfigured ? styles.availableText : styles.partialText]}>
              {apiKeyConfigured ? 'Full Access' : 'Read-only'}
            </Text>
          </View>
        </View>

        <View style={styles.featureRow}>
          <View style={styles.featureInfo}>
            <Text style={styles.featureName}>Offline Mode</Text>
            <Text style={styles.featureDescription}>MMKV persistence for offline access</Text>
          </View>
          <View style={[styles.badge, styles.availableBadge]}>
            <Text style={[styles.badgeText, styles.availableText]}>Available</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[900],
  },
  subtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
    marginBottom: 24,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  rowValue: {
    fontSize: 14,
    color: Colors.gray[600],
    fontFamily: 'monospace',
    maxWidth: '60%',
    textAlign: 'right',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusGreen: {
    backgroundColor: Colors.success,
  },
  statusYellow: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 14,
  },
  statusTextGreen: {
    color: Colors.success,
  },
  statusTextYellow: {
    color: Colors.warning,
  },
  infoSection: {
    backgroundColor: 'rgba(14, 165, 233, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(14, 165, 233, 0.2)',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary[900],
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.primary[700],
    marginBottom: 12,
  },
  codeBlock: {
    backgroundColor: Colors.primary[900],
    borderRadius: 8,
    padding: 12,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: Colors.primary[100],
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  featureInfo: {
    flex: 1,
    marginRight: 12,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  featureDescription: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  availableBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  partialBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  availableText: {
    color: Colors.success,
  },
  partialText: {
    color: Colors.warning,
  },
})
