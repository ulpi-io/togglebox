import { View, Text, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native'
import { useState, useCallback } from 'react'
import { useExperiments, useToggleBox } from '@togglebox/sdk-expo'
import { ExperimentCard } from '@/components/ExperimentCard'
import { Loading } from '@/components/Loading'
import { startExperiment, pauseExperiment, completeExperiment, hasApiKey } from '@/lib/api'
import { Colors, PLATFORM, ENVIRONMENT } from '@/lib/constants'

export default function ExperimentsScreen() {
  const experiments = useExperiments()
  const { isLoading, refresh } = useToggleBox()
  const [refreshing, setRefreshing] = useState(false)
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)
  const canManage = hasApiKey()

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await refresh()
    setRefreshing(false)
  }, [refresh])

  const handleStart = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await startExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      Alert.alert('Success', `Experiment "${experimentKey}" started`)
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to start experiment')
    } finally {
      setActionInProgress(null)
    }
  }

  const handlePause = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await pauseExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      Alert.alert('Success', `Experiment "${experimentKey}" paused`)
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to pause experiment')
    } finally {
      setActionInProgress(null)
    }
  }

  const handleComplete = async (experimentKey: string) => {
    setActionInProgress(experimentKey)
    try {
      await completeExperiment(PLATFORM, ENVIRONMENT, experimentKey)
      Alert.alert('Success', `Experiment "${experimentKey}" completed`)
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to complete experiment')
    } finally {
      setActionInProgress(null)
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
      <Text style={styles.title}>Experiments</Text>
      <Text style={styles.subtitle}>
        Interactive experiment testing with management actions
      </Text>

      {!canManage && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            <Text style={styles.warningBold}>Public mode:</Text> Experiment management actions
            are disabled. Set EXPO_PUBLIC_API_KEY to enable experiment control.
          </Text>
        </View>
      )}

      {experiments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No experiments configured</Text>
          <Text style={styles.emptySubtext}>
            Create experiments in the admin dashboard to see them here
          </Text>
        </View>
      ) : (
        experiments.map((experiment) => (
          <ExperimentCard
            key={experiment.experimentKey}
            experiment={experiment}
            onStart={handleStart}
            onPause={handlePause}
            onComplete={handleComplete}
            canManage={canManage && actionInProgress !== experiment.experimentKey}
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
