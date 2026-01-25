import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { useFlags, useToggleBox } from '@togglebox/sdk-expo'
import { FlagCard } from '@/components/FlagCard'
import { Loading } from '@/components/Loading'
import { toggleFlag, hasApiKey } from '@/lib/api'
import { Colors, PLATFORM, ENVIRONMENT } from '@/lib/constants'

export default function FlagsScreen() {
  const flags = useFlags()
  const { isLoading, refresh } = useToggleBox()
  const [refreshing, setRefreshing] = useState(false)
  const [isToggling, setIsToggling] = useState<string | null>(null)
  const canToggle = hasApiKey()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const handleToggle = async (flagKey: string, enabled: boolean) => {
    setIsToggling(flagKey)
    try {
      await toggleFlag(PLATFORM, ENVIRONMENT, flagKey, enabled)
      Alert.alert('Success', `Flag "${flagKey}" ${enabled ? 'enabled' : 'disabled'}`)
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to toggle flag')
    } finally {
      setIsToggling(null)
    }
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
      <Text style={styles.title}>Feature Flags</Text>
      <Text style={styles.subtitle}>
        Tier 2: Two-value flags with country/language targeting
      </Text>

      {!canToggle && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Public mode:</Text> Toggle actions are disabled.
            Set EXPO_PUBLIC_API_KEY to enable flag management.
          </Text>
        </View>
      )}

      {flags.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No feature flags configured</Text>
          <Text style={styles.emptySubtext}>
            Create flags in the admin dashboard to see them here
          </Text>
        </View>
      ) : (
        flags.map((flag) => (
          <FlagCard
            key={flag.flagKey}
            flag={flag}
            onToggle={handleToggle}
            canToggle={canToggle && isToggling !== flag.flagKey}
          />
        ))
      )}
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
  warningBanner: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
  },
  warningBold: {
    fontWeight: '600',
  },
  emptyContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray[500],
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 8,
    textAlign: 'center',
  },
})
