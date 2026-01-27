import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl, Modal, FlatList } from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { useConfig } from '@togglebox/sdk-expo'
import { ConfigViewer } from '@/components/ConfigViewer'
import { Loading } from '@/components/Loading'
import { getConfigVersions, getConfigVersion } from '@/lib/api'
import { Colors, PLATFORM, ENVIRONMENT } from '@/lib/constants'

interface ConfigVersion {
  version: string
  isStable: boolean
  createdAt: string
}

export default function ConfigScreen() {
  const currentConfig = useConfig()
  const [versions, setVersions] = useState<ConfigVersion[]>([])
  const [selectedVersion, setSelectedVersion] = useState<string>('stable')
  const [displayedConfig, setDisplayedConfig] = useState<Record<string, unknown> | null>(null)
  const [isStable, setIsStable] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  const loadVersions = useCallback(async () => {
    try {
      const response = await getConfigVersions(PLATFORM, ENVIRONMENT)
      setVersions(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions')
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadVersions()
  }, [loadVersions])

  useEffect(() => {
    if (selectedVersion === 'stable' && currentConfig) {
      setDisplayedConfig(currentConfig)
      setIsStable(true)
    }
  }, [selectedVersion, currentConfig])

  const handleVersionChange = async (version: string) => {
    setSelectedVersion(version)
    setShowPicker(false)

    if (version === 'stable') {
      setDisplayedConfig(currentConfig)
      setIsStable(true)
      return
    }

    setIsLoading(true)
    try {
      const response = await getConfigVersion(PLATFORM, ENVIRONMENT, version)
      setDisplayedConfig(response.data.config)
      setIsStable(response.data.isStable)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load version')
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadVersions()
  }, [loadVersions])

  const getVersionLabel = (version: string) => {
    if (version === 'stable') return 'Latest Stable'
    const v = versions.find((ver) => ver.version === version)
    return v ? `${v.version}${v.isStable ? ' (stable)' : ''}` : version
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadVersions}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Remote Configuration</Text>
      <Text style={styles.subtitle}>
        Interactive config viewer with version selection
      </Text>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Version</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.pickerButtonText}>{getVersionLabel(selectedVersion)}</Text>
          <Text style={styles.pickerArrow}>&#x25BC;</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Version</Text>
            <FlatList
              data={[{ version: 'stable', isStable: true, createdAt: '' }, ...versions]}
              keyExtractor={(item) => item.version}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalItem,
                    selectedVersion === item.version && styles.modalItemSelected,
                  ]}
                  onPress={() => handleVersionChange(item.version)}
                >
                  <Text
                    style={[
                      styles.modalItemText,
                      selectedVersion === item.version && styles.modalItemTextSelected,
                    ]}
                  >
                    {item.version === 'stable'
                      ? 'Latest Stable'
                      : `${item.version}${item.isStable ? ' (stable)' : ''}`}
                  </Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {isLoading ? (
        <Loading />
      ) : (
        <ConfigViewer
          config={displayedConfig}
          version={selectedVersion === 'stable' ? 'Latest Stable' : selectedVersion}
          isStable={isStable}
        />
      )}

      {versions.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Version History</Text>
          {versions.map((v) => (
            <TouchableOpacity
              key={v.version}
              style={styles.historyItem}
              onPress={() => handleVersionChange(v.version)}
            >
              <View style={styles.historyItemLeft}>
                <Text style={styles.historyVersion}>{v.version}</Text>
                <Text style={styles.historyDate}>
                  {new Date(v.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={[styles.badge, v.isStable ? styles.stableBadge : styles.draftBadge]}>
                <Text style={[styles.badgeText, v.isStable ? styles.stableText : styles.draftText]}>
                  {v.isStable ? 'Stable' : 'Draft'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
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
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.gray[700],
    marginBottom: 8,
  },
  pickerButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[300],
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: Colors.gray[900],
  },
  pickerArrow: {
    fontSize: 12,
    color: Colors.gray[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  modalItemSelected: {
    backgroundColor: Colors.primary[50],
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.gray[900],
  },
  modalItemTextSelected: {
    color: Colors.primary[600],
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    color: Colors.gray[500],
  },
  historySection: {
    marginTop: 24,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  historyItemLeft: {},
  historyVersion: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'monospace',
    color: Colors.gray[900],
  },
  historyDate: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  stableBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  draftBadge: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stableText: {
    color: Colors.success,
  },
  draftText: {
    color: Colors.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorText: {
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
