import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useFlags } from '@togglebox/sdk-expo'

export default function UseFlagScreen() {
  const { flags, isFlagEnabled, isLoading } = useFlags()
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    isFlagEnabled('dark-mode', { userId: 'user-123' }).then(setDarkMode)
  }, [isFlagEnabled])

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return (
    <View style={[styles.container, darkMode && styles.darkContainer]}>
      <Text style={[styles.title, darkMode && styles.darkText]}>Feature Flags</Text>

      <View style={[styles.card, darkMode && styles.darkCard]}>
        <Text style={[styles.label, darkMode && styles.darkLabel]}>dark-mode</Text>
        <Text style={[styles.value, darkMode && styles.darkText]}>
          {darkMode ? 'ENABLED' : 'DISABLED'}
        </Text>
      </View>

      <Text style={[styles.subtitle, darkMode && styles.darkLabel]}>
        All Flags ({flags.length})
      </Text>

      {flags.map((flag) => (
        <View key={flag.flagKey} style={[styles.flagRow, darkMode && styles.darkCard]}>
          <Text style={[styles.flagKey, darkMode && styles.darkText]}>{flag.flagKey}</Text>
          <View style={[styles.badge, flag.enabled ? styles.badgeOn : styles.badgeOff]}>
            <Text style={styles.badgeText}>{flag.enabled ? 'ON' : 'OFF'}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  darkContainer: { backgroundColor: '#1f2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#111827' },
  darkText: { color: '#f9fafb' },
  card: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 8, marginBottom: 16 },
  darkCard: { backgroundColor: '#374151' },
  label: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  darkLabel: { color: '#9ca3af' },
  value: { fontSize: 18, fontWeight: '600', color: '#111827' },
  subtitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  flagRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f9fafb', borderRadius: 8, marginBottom: 8 },
  flagKey: { fontSize: 14, fontFamily: 'monospace', color: '#111827' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeOn: { backgroundColor: '#dcfce7' },
  badgeOff: { backgroundColor: '#f3f4f6' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#166534' },
})
