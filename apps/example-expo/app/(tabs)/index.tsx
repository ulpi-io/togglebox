import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { useState, useCallback } from 'react'
import { useToggleBox } from '@togglebox/sdk-expo'
import { Loading } from '@/components/Loading'
import { ConfigViewer } from '@/components/ConfigViewer'
import { Colors } from '@/lib/constants'

export default function DashboardScreen() {
  const { config, flags, experiments, isLoading, error, refresh } = useToggleBox()
  const [refreshing, setRefreshing] = useState(false)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (isLoading) {
    return <Loading />
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>ToggleBox Expo SDK Example</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.primary[600] }]}>
            {config ? Object.keys(config).length : 0}
          </Text>
          <Text style={styles.statLabel}>Config Keys</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {flags.length}
          </Text>
          <Text style={styles.statLabel}>Feature Flags</Text>
          <Text style={styles.statSubtext}>
            {flags.filter((f) => f.enabled).length} enabled
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#8b5cf6' }]}>
            {experiments.length}
          </Text>
          <Text style={styles.statLabel}>Experiments</Text>
          <Text style={styles.statSubtext}>
            {experiments.filter((e) => e.status === 'running').length} running
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Configuration Preview</Text>
        </View>
        <ConfigViewer config={config} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Flags</Text>
        {flags.length === 0 ? (
          <Text style={styles.emptyText}>No flags configured</Text>
        ) : (
          flags.slice(0, 3).map((flag) => (
            <View key={flag.flagKey} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{flag.flagKey}</Text>
              <View style={[styles.badge, flag.enabled ? styles.enabledBadge : styles.disabledBadge]}>
                <Text style={[styles.badgeText, flag.enabled ? styles.enabledText : styles.disabledText]}>
                  {flag.enabled ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Experiments</Text>
        {experiments.length === 0 ? (
          <Text style={styles.emptyText}>No experiments configured</Text>
        ) : (
          experiments.slice(0, 3).map((exp) => (
            <View key={exp.experimentKey} style={styles.listItem}>
              <Text style={styles.listItemTitle}>{exp.experimentKey}</Text>
              <View style={[
                styles.badge,
                exp.status === 'running' ? styles.runningBadge :
                exp.status === 'paused' ? styles.pausedBadge : styles.draftBadge
              ]}>
                <Text style={[
                  styles.badgeText,
                  exp.status === 'running' ? styles.runningText :
                  exp.status === 'paused' ? styles.pausedText : styles.draftText
                ]}>
                  {exp.status || 'draft'}
                </Text>
              </View>
            </View>
          ))
        )}
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
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  statSubtext: {
    fontSize: 12,
    color: Colors.gray[400],
    marginTop: 4,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  enabledBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  disabledBadge: {
    backgroundColor: Colors.gray[100],
  },
  runningBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  pausedBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  draftBadge: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  enabledText: {
    color: Colors.success,
  },
  disabledText: {
    color: Colors.gray[600],
  },
  runningText: {
    color: Colors.success,
  },
  pausedText: {
    color: Colors.warning,
  },
  draftText: {
    color: Colors.gray[600],
  },
  emptyText: {
    color: Colors.gray[500],
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
})
