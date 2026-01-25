import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { Colors } from '@/lib/constants'

interface ConfigViewerProps {
  config: Record<string, unknown> | null
  version?: string
  isStable?: boolean
}

export function ConfigViewer({ config, version, isStable }: ConfigViewerProps) {
  if (!config) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No configuration loaded</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {(version || isStable !== undefined) && (
        <View style={styles.header}>
          {version && (
            <Text style={styles.versionText}>
              Version: <Text style={styles.versionCode}>{version}</Text>
            </Text>
          )}
          {isStable !== undefined && (
            <View style={[styles.badge, isStable ? styles.stableBadge : styles.unstableBadge]}>
              <Text style={[styles.badgeText, isStable ? styles.stableBadgeText : styles.unstableBadgeText]}>
                {isStable ? 'Stable' : 'Unstable'}
              </Text>
            </View>
          )}
        </View>
      )}
      <ScrollView style={styles.codeContainer} horizontal={false}>
        <Text style={styles.code}>{JSON.stringify(config, null, 2)}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.gray[900],
    borderRadius: 8,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: Colors.gray[800],
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 14,
    color: Colors.gray[300],
  },
  versionCode: {
    color: Colors.primary[400],
    fontFamily: 'monospace',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stableBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  unstableBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  stableBadgeText: {
    color: Colors.success,
  },
  unstableBadgeText: {
    color: Colors.warning,
  },
  codeContainer: {
    maxHeight: 300,
    padding: 16,
  },
  code: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: Colors.gray[100],
    lineHeight: 20,
  },
  empty: {
    backgroundColor: Colors.gray[100],
    borderRadius: 8,
    padding: 16,
  },
  emptyText: {
    color: Colors.gray[500],
    textAlign: 'center',
  },
})
