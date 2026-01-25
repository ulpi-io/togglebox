import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import type { Experiment } from '@togglebox/sdk-expo'
import { Colors } from '@/lib/constants'

interface ExperimentCardProps {
  experiment: Experiment
  onStart?: (key: string) => void
  onPause?: (key: string) => void
  onComplete?: (key: string) => void
  canManage?: boolean
}

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: Colors.gray[100], text: Colors.gray[700] },
  running: { bg: 'rgba(34, 197, 94, 0.1)', text: Colors.success },
  paused: { bg: 'rgba(245, 158, 11, 0.1)', text: Colors.warning },
  completed: { bg: 'rgba(14, 165, 233, 0.1)', text: Colors.primary[700] },
}

export function ExperimentCard({
  experiment,
  onStart,
  onPause,
  onComplete,
  canManage = false,
}: ExperimentCardProps) {
  const router = useRouter()
  const status = experiment.status || 'draft'
  const statusStyle = statusColors[status] || statusColors.draft

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/experiments/${experiment.experimentKey}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{experiment.experimentKey}</Text>
          {experiment.description && (
            <Text style={styles.description} numberOfLines={2}>
              {experiment.description}
            </Text>
          )}
        </View>

        <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.badgeText, { color: statusStyle.text }]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </View>
      </View>

      <View style={styles.variations}>
        <Text style={styles.variationsLabel}>Variations</Text>
        <View style={styles.variationsList}>
          {experiment.variations.map((variation) => (
            <View key={variation.variationKey} style={styles.variationTag}>
              <Text style={styles.variationName}>
                {variation.name || variation.variationKey}
              </Text>
              <Text style={styles.variationWeight}>{variation.weight}%</Text>
            </View>
          ))}
        </View>
      </View>

      {canManage && (
        <View style={styles.actions}>
          {status === 'draft' && onStart && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => onStart(experiment.experimentKey)}
            >
              <Text style={styles.actionButtonText}>Start</Text>
            </TouchableOpacity>
          )}
          {status === 'running' && onPause && (
            <TouchableOpacity
              style={[styles.actionButton, styles.pauseButton]}
              onPress={() => onPause(experiment.experimentKey)}
            >
              <Text style={styles.actionButtonText}>Pause</Text>
            </TouchableOpacity>
          )}
          {status === 'paused' && onStart && (
            <TouchableOpacity
              style={[styles.actionButton, styles.startButton]}
              onPress={() => onStart(experiment.experimentKey)}
            >
              <Text style={styles.actionButtonText}>Resume</Text>
            </TouchableOpacity>
          )}
          {(status === 'running' || status === 'paused') && onComplete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => onComplete(experiment.experimentKey)}
            >
              <Text style={styles.actionButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  description: {
    fontSize: 14,
    color: Colors.gray[500],
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  variations: {
    marginTop: 16,
  },
  variationsLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[500],
    marginBottom: 8,
  },
  variationsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  variationTag: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  variationName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[900],
  },
  variationWeight: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
  },
})
