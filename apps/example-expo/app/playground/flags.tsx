/**
 * Playground - Flags Tab
 *
 * Interactive testing interface for feature flags.
 * View all flags, evaluate with custom context, toggle flags.
 */
import { useState, useCallback } from 'react'
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
import { useFlags } from '@togglebox/sdk-expo'
import { Ionicons } from '@expo/vector-icons'
import { Colors, DEFAULT_USER_ID } from '@/lib/constants'

export default function FlagsPlayground() {
  const { flags, isFlagEnabled, isLoading, refresh } = useFlags()
  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [evaluatedFlags, setEvaluatedFlags] = useState<Record<string, boolean>>({})
  const [evaluating, setEvaluating] = useState<string | null>(null)

  const handleEvaluate = useCallback(
    async (flagKey: string) => {
      setEvaluating(flagKey)
      try {
        const enabled = await isFlagEnabled(flagKey, { userId })
        setEvaluatedFlags((prev) => ({ ...prev, [flagKey]: enabled }))
      } catch {
        // Evaluation failed
      }
      setEvaluating(null)
    },
    [isFlagEnabled, userId]
  )

  const handleEvaluateAll = useCallback(async () => {
    setEvaluating('all')
    const results: Record<string, boolean> = {}
    for (const flag of flags) {
      try {
        results[flag.flagKey] = await isFlagEnabled(flag.flagKey, { userId })
      } catch {
        results[flag.flagKey] = false
      }
    }
    setEvaluatedFlags(results)
    setEvaluating(null)
  }, [flags, isFlagEnabled, userId])

  const renderFlag = ({ item }: { item: { flagKey: string; enabled: boolean; description?: string } }) => {
    const evaluated = evaluatedFlags[item.flagKey]
    const isEvaluating = evaluating === item.flagKey

    return (
      <View style={styles.flagCard}>
        <View style={styles.flagHeader}>
          <Text style={styles.flagKey}>{item.flagKey}</Text>
          <View style={[styles.badge, item.enabled ? styles.badgeEnabled : styles.badgeDisabled]}>
            <Text style={[styles.badgeText, item.enabled && styles.badgeTextEnabled]}>
              {item.enabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        {item.description && <Text style={styles.flagDescription}>{item.description}</Text>}

        <View style={styles.evaluateRow}>
          <TouchableOpacity
            style={[styles.evaluateButton, isEvaluating && styles.evaluateButtonDisabled]}
            onPress={() => handleEvaluate(item.flagKey)}
            disabled={isEvaluating}
          >
            {isEvaluating ? (
              <ActivityIndicator size="small" color={Colors.primary[600]} />
            ) : (
              <>
                <Ionicons name="play" size={14} color={Colors.primary[600]} />
                <Text style={styles.evaluateButtonText}>Evaluate</Text>
              </>
            )}
          </TouchableOpacity>

          {evaluated !== undefined && (
            <View style={styles.evaluatedResult}>
              <Text style={styles.evaluatedLabel}>For user:</Text>
              <View style={[styles.badge, evaluated ? styles.badgeEnabled : styles.badgeDisabled]}>
                <Text style={[styles.badgeText, evaluated && styles.badgeTextEnabled]}>
                  {evaluated ? 'ENABLED' : 'DISABLED'}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* User Context Input */}
      <View style={styles.contextCard}>
        <Text style={styles.contextLabel}>User Context (for evaluation)</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={userId}
            onChangeText={setUserId}
            placeholder="Enter user ID..."
            placeholderTextColor={Colors.gray[400]}
          />
          <TouchableOpacity
            style={[styles.evaluateAllButton, evaluating === 'all' && styles.evaluateAllButtonDisabled]}
            onPress={handleEvaluateAll}
            disabled={evaluating === 'all'}
          >
            {evaluating === 'all' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.evaluateAllButtonText}>Evaluate All</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{flags.length}</Text>
          <Text style={styles.statLabel}>Total Flags</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{flags.filter((f) => f.enabled).length}</Text>
          <Text style={styles.statLabel}>Enabled</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{Object.keys(evaluatedFlags).length}</Text>
          <Text style={styles.statLabel}>Evaluated</Text>
        </View>
      </View>

      {/* Flags List */}
      <FlatList
        data={flags}
        keyExtractor={(item) => item.flagKey}
        renderItem={renderFlag}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>No flags available</Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        }
        contentContainerStyle={flags.length === 0 ? styles.emptyContainer : styles.listContent}
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
  evaluateAllButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
  },
  evaluateAllButtonDisabled: {
    opacity: 0.6,
  },
  evaluateAllButtonText: {
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
    gap: 12,
  },
  flagCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 12,
  },
  flagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  flagKey: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[900],
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeEnabled: {
    backgroundColor: '#dcfce7',
  },
  badgeDisabled: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.gray[500],
  },
  badgeTextEnabled: {
    color: '#166534',
  },
  flagDescription: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 12,
  },
  evaluateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  evaluateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.primary[50],
    borderRadius: 6,
  },
  evaluateButtonDisabled: {
    opacity: 0.6,
  },
  evaluateButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.primary[600],
  },
  evaluatedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evaluatedLabel: {
    fontSize: 12,
    color: Colors.gray[500],
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
