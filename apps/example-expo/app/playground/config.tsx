/**
 * Playground - Config Tab
 *
 * Interactive viewer for remote configuration.
 * Browse config keys, view JSON values, copy values.
 */
import { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native'
import { useConfig } from '@togglebox/sdk-expo'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/lib/constants'
import * as Clipboard from 'expo-clipboard'

export default function ConfigPlayground() {
  const { config, isLoading, refresh } = useConfig()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set())
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const copyValue = useCallback(async (key: string, value: unknown) => {
    await Clipboard.setStringAsync(JSON.stringify(value, null, 2))
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }, [])

  const getTypeLabel = (value: unknown): string => {
    if (value === null) return 'null'
    if (Array.isArray(value)) return 'array'
    return typeof value
  }

  const getTypeColor = (value: unknown): string => {
    if (value === null) return Colors.gray[400]
    if (typeof value === 'boolean') return '#8b5cf6'
    if (typeof value === 'number') return '#3b82f6'
    if (typeof value === 'string') return '#22c55e'
    if (Array.isArray(value)) return '#f59e0b'
    if (typeof value === 'object') return '#ec4899'
    return Colors.gray[500]
  }

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null'
    if (typeof value === 'boolean') return value.toString()
    if (typeof value === 'number') return value.toString()
    if (typeof value === 'string') return `"${value}"`
    if (Array.isArray(value)) return `[${value.length} items]`
    if (typeof value === 'object') return `{${Object.keys(value).length} keys}`
    return String(value)
  }

  // Filter config entries by search query
  const configEntries = config ? Object.entries(config) : []
  const filteredEntries = configEntries.filter(([key]) =>
    key.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
    >
      {/* Search */}
      <View style={styles.searchCard}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={Colors.gray[400]} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search config keys..."
            placeholderTextColor={Colors.gray[400]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.gray[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{configEntries.length}</Text>
          <Text style={styles.statLabel}>Total Keys</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{filteredEntries.length}</Text>
          <Text style={styles.statLabel}>Matching</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>
            {configEntries.filter(([, v]) => typeof v === 'object' && v !== null).length}
          </Text>
          <Text style={styles.statLabel}>Objects</Text>
        </View>
      </View>

      {/* Config Entries */}
      <View style={styles.configList}>
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={48} color={Colors.gray[300]} />
            <Text style={styles.emptyText}>
              {searchQuery ? 'No matching keys' : 'No config available'}
            </Text>
            <Text style={styles.emptySubtext}>Pull down to refresh</Text>
          </View>
        ) : (
          filteredEntries.map(([key, value]) => {
            const isExpanded = expandedKeys.has(key)
            const isObject = typeof value === 'object' && value !== null
            const isCopied = copiedKey === key

            return (
              <View key={key} style={styles.configItem}>
                <TouchableOpacity
                  style={styles.configHeader}
                  onPress={() => isObject && toggleExpand(key)}
                  activeOpacity={isObject ? 0.7 : 1}
                >
                  <View style={styles.configKeyRow}>
                    {isObject && (
                      <Ionicons
                        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
                        size={16}
                        color={Colors.gray[400]}
                      />
                    )}
                    <Text style={styles.configKey}>{key}</Text>
                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(value) + '20' }]}>
                      <Text style={[styles.typeText, { color: getTypeColor(value) }]}>
                        {getTypeLabel(value)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.configActions}>
                    <TouchableOpacity
                      style={styles.copyButton}
                      onPress={() => copyValue(key, value)}
                    >
                      <Ionicons
                        name={isCopied ? 'checkmark' : 'copy-outline'}
                        size={16}
                        color={isCopied ? Colors.success : Colors.gray[500]}
                      />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                {/* Value Preview */}
                {!isExpanded && (
                  <Text style={[styles.configValue, { color: getTypeColor(value) }]} numberOfLines={1}>
                    {formatValue(value)}
                  </Text>
                )}

                {/* Expanded JSON */}
                {isExpanded && isObject && (
                  <View style={styles.expandedContent}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <Text style={styles.jsonText}>{JSON.stringify(value, null, 2)}</Text>
                    </ScrollView>
                  </View>
                )}
              </View>
            )
          })
        )}
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Config Types</Text>
        <View style={styles.typeGuide}>
          <TypeGuideItem color="#22c55e" label="string" />
          <TypeGuideItem color="#3b82f6" label="number" />
          <TypeGuideItem color="#8b5cf6" label="boolean" />
          <TypeGuideItem color="#f59e0b" label="array" />
          <TypeGuideItem color="#ec4899" label="object" />
        </View>
      </View>
    </ScrollView>
  )
}

function TypeGuideItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.typeGuideItem}>
      <View style={[styles.typeGuideDot, { backgroundColor: color }]} />
      <Text style={styles.typeGuideLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  searchCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    borderWidth: 1,
    borderColor: Colors.gray[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.gray[900],
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
  configList: {
    padding: 16,
  },
  configItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginBottom: 12,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configKeyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  configKey: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[900],
    fontFamily: 'monospace',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  configActions: {
    flexDirection: 'row',
    gap: 8,
  },
  copyButton: {
    padding: 4,
  },
  configValue: {
    fontSize: 13,
    fontFamily: 'monospace',
    marginTop: 8,
  },
  expandedContent: {
    backgroundColor: Colors.gray[50],
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  jsonText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: Colors.gray[700],
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
  infoCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 10,
  },
  typeGuide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeGuideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeGuideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  typeGuideLabel: {
    fontSize: 12,
    color: Colors.gray[500],
  },
})
