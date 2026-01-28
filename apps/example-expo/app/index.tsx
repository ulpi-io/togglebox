import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.EXPO_PUBLIC_PLATFORM || 'mobile'
const ENVIRONMENT = process.env.EXPO_PUBLIC_ENVIRONMENT || 'staging'

interface ExampleLinkProps {
  title: string
  description: string
  href: string
}

function ExampleLink({ title, description, href }: ExampleLinkProps) {
  const router = useRouter()

  return (
    <TouchableOpacity
      style={styles.linkCard}
      onPress={() => router.push(href as '/')}
      activeOpacity={0.7}
    >
      <View style={styles.linkContent}>
        <Text style={styles.linkTitle}>{title}</Text>
        <Text style={styles.linkDescription}>{description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
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
      <View style={styles.header}>
        <Text style={styles.title}>ToggleBox SDK Examples</Text>
        <Text style={styles.subtitle}>Expo / React Native</Text>
      </View>

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

      <SectionHeader title="QUICK START" emoji="⚡" />
      <Text style={styles.sectionSubtitle}>Simple patterns to get started</Text>
      <View style={styles.linkGroup}>
        <ExampleLink title="Use Config" description="Read remote configuration" href="/examples/quick/use-config" />
        <ExampleLink title="Use Flag" description="Check feature flags" href="/examples/quick/use-flag" />
        <ExampleLink title="Use Experiment" description="Get A/B test variants" href="/examples/quick/use-experiment" />
        <ExampleLink title="Track Event" description="Track events & conversions" href="/examples/quick/track-event" />
      </View>

      <SectionHeader title="FULL EXAMPLES" emoji="🔧" />
      <Text style={styles.sectionSubtitle}>Production-ready patterns</Text>
      <View style={styles.linkGroup}>
        <ExampleLink title="Feature Toggle" description="Full pattern with loading & fallback" href="/examples/full/feature-toggle" />
        <ExampleLink title="A/B Test CTA" description="Variant rendering & conversion tracking" href="/examples/full/ab-test-cta" />
        <ExampleLink title="Config Theme" description="Dynamic theming from config" href="/examples/full/config-theme" />
        <ExampleLink title="Polling Updates" description="Real-time updates with polling" href="/examples/full/polling-updates" />
        <ExampleLink title="Error Handling" description="Error states & offline fallback" href="/examples/full/error-handling" />
        <ExampleLink title="Offline Storage" description="MMKV persistence for offline" href="/examples/full/offline-storage" />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  statusCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#e5e7eb' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statusLabel: { fontSize: 14, color: '#6b7280' },
  statusValue: { fontSize: 14, fontWeight: '500', color: '#111827', flex: 1, textAlign: 'right', marginLeft: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 4 },
  sectionEmoji: { fontSize: 18, marginRight: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#374151', letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  linkGroup: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 24, overflow: 'hidden' },
  linkCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  linkContent: { flex: 1 },
  linkTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  linkDescription: { fontSize: 13, color: '#6b7280' },
  chevron: { fontSize: 24, color: '#9ca3af' },
})
