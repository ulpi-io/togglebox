import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors, API_URL, PLATFORM, ENVIRONMENT } from '@/lib/constants'

interface ExampleLinkProps {
  title: string
  description: string
  href: string
  icon: keyof typeof Ionicons.glyphMap
}

function ExampleLink({ title, description, href, icon }: ExampleLinkProps) {
  const router = useRouter()

  return (
    <TouchableOpacity
      style={styles.linkCard}
      onPress={() => router.push(href as '/')}
      activeOpacity={0.7}
    >
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={24} color={Colors.primary[600]} />
      </View>
      <View style={styles.linkContent}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray[400]} />
    </TouchableOpacity>
  )
}

function SectionHeader({ title, emoji }: { title: string; emoji: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionEmoji}>{emoji}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  )
}

export default function HomePage() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>ToggleBox SDK Examples</Text>
        <Text style={styles.subtitle}>Expo / React Native</Text>
      </View>

      {/* Connection Status */}
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>API URL</Text>
          <Text style={styles.statusValue} numberOfLines={1}>{API_URL}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Platform</Text>
          <Text style={styles.statusValue}>{PLATFORM}</Text>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Environment</Text>
          <Text style={styles.statusValue}>{ENVIRONMENT}</Text>
        </View>
      </View>

      {/* Quick Start */}
      <SectionHeader title="QUICK START" emoji="&#x26A1;" />
      <Text style={styles.sectionSubtitle}>Simple patterns to get started</Text>
      <View style={styles.linkGroup}>
        <ExampleLink
          title="Provider Setup"
          description="Configure ToggleBoxProvider"
          href="/quick/provider-setup"
          icon="settings-outline"
        />
        <ExampleLink
          title="Remote Config"
          description="Fetch & display configuration"
          href="/quick/remote-config"
          icon="cloud-download-outline"
        />
        <ExampleLink
          title="Feature Flags"
          description="List flags & evaluate with context"
          href="/quick/feature-flags"
          icon="flag-outline"
        />
        <ExampleLink
          title="Experiments"
          description="List & assign variants"
          href="/quick/experiments"
          icon="flask-outline"
        />
      </View>

      {/* Advanced */}
      <SectionHeader title="ADVANCED" emoji="&#x1F527;" />
      <Text style={styles.sectionSubtitle}>Production-ready patterns</Text>
      <View style={styles.linkGroup}>
        <ExampleLink
          title="Conversion Tracking"
          description="Track experiment conversions"
          href="/advanced/conversion-tracking"
          icon="analytics-outline"
        />
        <ExampleLink
          title="Offline Storage"
          description="MMKV persistence for offline"
          href="/advanced/offline-storage"
          icon="cloud-offline-outline"
        />
        <ExampleLink
          title="Polling & Refresh"
          description="Auto-refresh & pull-to-refresh"
          href="/advanced/polling-refresh"
          icon="sync-outline"
        />
        <ExampleLink
          title="Health Check"
          description="API health monitoring"
          href="/advanced/health-check"
          icon="pulse-outline"
        />
        <ExampleLink
          title="Error Handling"
          description="Error states & offline fallback"
          href="/advanced/error-handling"
          icon="warning-outline"
        />
        <ExampleLink
          title="Full Integration"
          description="Complete real-world example"
          href="/advanced/full-integration"
          icon="rocket-outline"
        />
      </View>

      {/* Playground */}
      <SectionHeader title="PLAYGROUND" emoji="&#x1F3AE;" />
      <Text style={styles.sectionSubtitle}>Interactive testing</Text>
      <View style={styles.linkGroup}>
        <ExampleLink
          title="Interactive Testing"
          description="Test flags, experiments, config"
          href="/playground"
          icon="game-controller-outline"
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Each example shows both Public and Auth mode code variants
        </Text>
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
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.gray[900],
  },
  subtitle: {
    fontSize: 16,
    color: Colors.gray[500],
    marginTop: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  sectionEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[700],
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  linkGroup: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 24,
    overflow: 'hidden',
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  linkIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 2,
  },
  linkDescription: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  footerText: {
    fontSize: 13,
    color: Colors.gray[400],
    textAlign: 'center',
  },
})
