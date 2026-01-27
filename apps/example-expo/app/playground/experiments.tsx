/**
 * Playground - Experiments Tab
 *
 * Interactive testing interface for A/B experiments.
 * View all experiments, assign variants, track conversions.
 */
import { useState, useCallback, useRef, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useExperiments, ToggleBoxClient } from '@togglebox/sdk-expo'
import { Ionicons } from '@expo/vector-icons'
import { Colors, API_URL, PLATFORM, ENVIRONMENT, DEFAULT_USER_ID } from '@/lib/constants'

export default function ExperimentsPlayground() {
  const { experiments, getVariant, isLoading, refresh } = useExperiments()
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [assignedVariants, setAssignedVariants] = useState<Record<string, string>>({})
  const [assigning, setAssigning] = useState<string | null>(null)
  const clientRef = useRef<ToggleBoxClient | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  const handleAssignVariant = useCallback(
    async (experimentKey: string) => {
      setAssigning(experimentKey)
      try {
        const variant = await getVariant(experimentKey, { userId })
        setAssignedVariants((prev) => ({ ...prev, [experimentKey]: variant || 'control' }))
      } catch {
        setAssignedVariants((prev) => ({ ...prev, [experimentKey]: 'error' }))
      }
      setAssigning(null)
    },
    [getVariant, userId]
  )

  const handleTrackConversion = useCallback(
    async (experimentKey: string) => {
      if (!clientRef.current) return
      try {
        await clientRef.current.trackConversion(experimentKey, { userId }, { metricName: 'click' })
        await clientRef.current.flushStats()
        // Visual feedback could be added here
      } catch {
        // Tracking failed
      }
    },
    [userId]
  )

  const handleAssignAll = useCallback(async () => {
    setAssigning('all')
    const results: Record<string, string> = {}
    for (const exp of experiments) {
      try {
        const variant = await getVariant(exp.experimentKey, { userId })
        results[exp.experimentKey] = variant || 'control'
      } catch {
        results[exp.experimentKey] = 'error'
      }
    }
    setAssignedVariants(results)
    setAssigning(null)
  }, [experiments, getVariant, userId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return '#22c55e'
      case 'paused':
        return '#f59e0b'
      case 'completed':
        return Colors.gray[400]
      default:
        return Colors.gray[500]
    }
  }

  const renderExperiment = ({
    item,
  }: {
    item: { experimentKey: string; name?: string; status: string; variants?: string[] }
  }) => {
    const assigned = assignedVariants[item.experimentKey]
    const isAssigning = assigning === item.experimentKey

    return (
      <View style={styles.expCard}>
        <View style={styles.expHeader}>
          <View>
            <Text style={styles.expKey}>{item.experimentKey}</Text>
            {item.name && <Text style={styles.expName}>{item.name}</Text>}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
          </View>
        </View>

        {/* Variants */}
        {item.variants && item.variants.length > 0 && (
          <View style={styles.variantsRow}>
            <Text style={styles.variantsLabel}>Variants:</Text>
            <View style={styles.variantsList}>
              {item.variants.map((v) => (
                <View
                  key={v}
                  style={[styles.variantChip, assigned === v && styles.variantChipActive]}
                >
                  <Text style={[styles.variantChipText, assigned === v && styles.variantChipTextActive]}>
                    {v}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, isAssigning && styles.actionButtonDisabled]}
            onPress={() => handleAssignVariant(item.experimentKey)}
            disabled={isAssigning}
          >
            {isAssigning ? (
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            ) : (
              <>
                <Ionicons name="shuffle" size={14} color={Colors.primary[600]} />
                <Text style={styles.actionButtonText}>Assign</Text>
              </>
            )}
          </TouchableOpacity>

          {assigned && assigned !== 'error' && (
            <TouchableOpacity
              style={styles.trackButton}
              onPress={() => handleTrackConversion(item.experimentKey)}
            >
              <Ionicons name="analytics" size={14} color={Colors.success} />
              <Text style={styles.trackButtonText}>Track Conversion</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Assigned Result */}
        {assigned && (
          <View style={styles.assignedResult}>
            <Text style={styles.assignedLabel}>Assigned variant:</Text>
            <Text style={[styles.assignedValue, assigned === 'error' && styles.assignedError]}>
              {assigned}
            </Text>
          </View>
        )}
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* User Context Input */}
      <View style={styles.contextCard}>
        <Text style={styles.contextLabel}>User Context (for variant assignment)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter user ID..."
            placeholderTextColor={Colors.gray[400]}
          />
          <TouchableOpacity
            style={[styles.assignAllButton, assigning === 'all' && styles.assignAllButtonDisabled]}
            onPress={handleAssignAll}
            disabled={assigning === 'all'}
          >
            {assigning === 'all' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.assignAllButtonText}>Assign All</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{experiments.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{experiments.filter((e) => e.status === 'running').length}</Text>
          <Text style={styles.statLabel}>Running</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Object.keys(assignedVariants).length}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
      </View>

      {/* Experiments List */}
      <FlatList
        data={experiments}
        keyExtractor={(item) => item.experimentKey}
        renderItem={renderExperiment}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No experiments available</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
        contentContainerStyle={experiments.length === 0 ? styles.emptyContainer : styles.listContent}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  contextCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  contextLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[600],
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray[900],
  },
  assignAllButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  assignAllButtonDisabled: {
    opacity: 0.6,
  },
  assignAllButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.gray[900],
  },
  statLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  listContent: {
    padding: 16,
  },
  expCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 12,
  },
  expHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  expKey: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[900],
    fontFamily: 'monospace',
  },
  expName: {
    fontSize: 13,
    color: Colors.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  variantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  variantsLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  variantsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.gray[100],
    borderRadius: 4,
  },
  variantChipActive: {
    backgroundColor: Colors.primary[100],
    borderWidth: 1,
    borderColor: Colors.primary[300],
  },
  variantChipText: {
    fontSize: 12,
    color: Colors.gray[600],
    fontFamily: 'monospace',
  },
  variantChipTextActive: {
    color: Colors.primary[700],
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary[50],
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary[600],
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0fdf4',
    borderRadius: 6,
  },
  trackButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.success,
  },
  assignedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.gray[100],
  },
  assignedLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  assignedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
    fontFamily: 'monospace',
  },
  assignedError: {
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.gray[500],
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.gray[400],
    marginTop: 4,
  },
})
