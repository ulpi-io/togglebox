import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useState } from 'react'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useExperiment, useToggleBox } from '@togglebox/sdk-expo'
import { Loading } from '@/components/Loading'
import {
  assignExperimentVariation,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  hasApiKey,
} from '@/lib/api'
import { Colors, PLATFORM, ENVIRONMENT, DEFAULT_USER_ID } from '@/lib/constants'

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: Colors.gray[100], text: Colors.gray[700] },
  running: { bg: 'rgba(34, 197, 94, 0.1)', text: Colors.success },
  paused: { bg: 'rgba(245, 158, 11, 0.1)', text: Colors.warning },
  completed: { bg: 'rgba(14, 165, 233, 0.1)', text: Colors.primary[700] },
}

export default function ExperimentDetailScreen() {
  const { experimentKey } = useLocalSearchParams<{ experimentKey: string }>()
  const router = useRouter()
  const { experiment, isLoading } = useExperiment(experimentKey, { userId: DEFAULT_USER_ID })
  const { refresh } = useToggleBox()
  const canManage = hasApiKey()

  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [assignmentResult, setAssignmentResult] = useState<{
    variationKey: string
    variationName: string
  } | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [isActioning, setIsActioning] = useState(false)

  const handleAssign = async () => {
    setIsAssigning(true)
    try {
      const result = await assignExperimentVariation(PLATFORM, ENVIRONMENT, experimentKey, userId)
      setAssignmentResult(result.data)
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to assign variation')
    } finally {
      setIsAssigning(false)
    }
  }

  const handleAction = async (action: 'start' | 'pause' | 'complete') => {
    setIsActioning(true)
    try {
      switch (action) {
        case 'start':
          await startExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          Alert.alert('Success', 'Experiment started')
          break
        case 'pause':
          await pauseExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          Alert.alert('Success', 'Experiment paused')
          break
        case 'complete':
          await completeExperiment(PLATFORM, ENVIRONMENT, experimentKey)
          Alert.alert('Success', 'Experiment completed')
          break
      }
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : `Failed to ${action} experiment`)
    } finally {
      setIsActioning(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!experiment) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Experiment Not Found</Text>
        <Text style={styles.errorMessage}>The experiment "{experimentKey}" does not exist.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const status = experiment.status || 'draft'
  const statusStyle = statusColors[status] || statusColors.draft

  return (
    <>
      <Stack.Screen options={{ title: experiment.experimentKey }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{experiment.experimentKey}</Text>
          {experiment.description && (
            <Text style={styles.description}>{experiment.description}</Text>
          )}
          <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.badgeText, { color: statusStyle.text }]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Variations</Text>
          {experiment.variations.map((variation) => (
            <View key={variation.variationKey} style={styles.variationCard}>
              <View style={styles.variationInfo}>
                <Text style={styles.variationName}>
                  {variation.name || variation.variationKey}
                </Text>
                <Text style={styles.variationKey}>Key: {variation.variationKey}</Text>
              </View>
              <View style={styles.variationWeight}>
                <Text style={styles.weightValue}>{variation.weight}%</Text>
                <Text style={styles.weightLabel}>Weight</Text>
              </View>
            </View>
          ))}

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>
              {experiment.variations.reduce((sum, v) => sum + v.weight, 0)}%
            </Text>
          </View>
        </View>

        {canManage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsRow}>
              {status === 'draft' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.startButton]}
                  onPress={() => handleAction('start')}
                  disabled={isActioning}
                >
                  <Text style={styles.actionButtonText}>
                    {isActioning ? 'Starting...' : 'Start Experiment'}
                  </Text>
                </TouchableOpacity>
              )}
              {status === 'running' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.pauseButton]}
                    onPress={() => handleAction('pause')}
                    disabled={isActioning}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActioning ? 'Pausing...' : 'Pause'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleAction('complete')}
                    disabled={isActioning}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActioning ? 'Completing...' : 'Complete'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {status === 'paused' && (
                <>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.startButton]}
                    onPress={() => handleAction('start')}
                    disabled={isActioning}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActioning ? 'Resuming...' : 'Resume'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleAction('complete')}
                    disabled={isActioning}
                  >
                    <Text style={styles.actionButtonText}>
                      {isActioning ? 'Completing...' : 'Complete'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              {status === 'completed' && (
                <Text style={styles.completedText}>
                  This experiment has been completed.
                </Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Assign Variation</Text>
          <Text style={styles.sectionDescription}>
            Test how a specific user would be assigned to a variation.
          </Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Enter user ID"
            />
          </View>

          <TouchableOpacity
            style={styles.assignButton}
            onPress={handleAssign}
            disabled={isAssigning || !userId}
          >
            <Text style={styles.assignButtonText}>
              {isAssigning ? 'Assigning...' : 'Get Assignment'}
            </Text>
          </TouchableOpacity>

          {assignmentResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Assignment Result</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Variation Key:</Text>
                <Text style={styles.resultValue}>{assignmentResult.variationKey}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Variation Name:</Text>
                <Text style={styles.resultName}>{assignmentResult.variationName}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </>
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
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.gray[900],
  },
  description: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
    marginBottom: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 16,
    marginTop: -8,
  },
  variationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    marginBottom: 8,
  },
  variationInfo: {},
  variationName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  variationKey: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
    fontFamily: 'monospace',
  },
  variationWeight: {
    alignItems: 'flex-end',
  },
  weightValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  weightLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[200],
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  startButton: {
    backgroundColor: Colors.success,
  },
  pauseButton: {
    backgroundColor: Colors.warning,
  },
  completeButton: {
    backgroundColor: Colors.primary[600],
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
  completedText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  assignButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  assignButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  resultContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 12,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: Colors.gray[500],
    marginRight: 8,
  },
  resultValue: {
    fontSize: 14,
    color: Colors.gray[900],
    fontFamily: 'monospace',
    backgroundColor: Colors.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  backButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontWeight: '500',
  },
})
