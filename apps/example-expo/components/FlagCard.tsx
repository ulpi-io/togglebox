import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native'
import { useRouter } from 'expo-router'
import type { Flag } from '@togglebox/sdk-expo'
import { Colors } from '@/lib/constants'

interface FlagCardProps {
  flag: Flag
  onToggle?: (flagKey: string, enabled: boolean) => void
  canToggle?: boolean
}

export function FlagCard({ flag, onToggle, canToggle = false }: FlagCardProps) {
  const router = useRouter()

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push(`/flags/${flag.flagKey}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>{flag.flagKey}</Text>
          {flag.description && (
            <Text style={styles.description} numberOfLines={2}>
              {flag.description}
            </Text>
          )}
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.badge, flag.enabled ? styles.enabledBadge : styles.disabledBadge]}>
            <Text style={[styles.badgeText, flag.enabled ? styles.enabledText : styles.disabledText]}>
              {flag.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>

          {canToggle && onToggle && (
            <Switch
              value={flag.enabled}
              onValueChange={(value) => onToggle(flag.flagKey, value)}
              trackColor={{ false: Colors.gray[300], true: Colors.primary[600] }}
              thumbColor="#ffffff"
            />
          )}
        </View>
      </View>

      <View style={styles.values}>
        <View style={styles.valueTag}>
          <Text style={styles.valueTagText}>Value A: {String(flag.valueA)}</Text>
        </View>
        <View style={styles.valueTag}>
          <Text style={styles.valueTagText}>Value B: {String(flag.valueB)}</Text>
        </View>
        {flag.rolloutPercentage !== undefined && (
          <View style={[styles.valueTag, styles.rolloutTag]}>
            <Text style={styles.rolloutText}>Rollout: {flag.rolloutPercentage}%</Text>
          </View>
        )}
      </View>

      {flag.targeting && flag.targeting.length > 0 && (
        <Text style={styles.targeting}>
          Targeting: {flag.targeting.map((t) => `${t.attribute}=${t.values.join(',')}`).join('; ')}
        </Text>
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  enabledBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  disabledBadge: {
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
  values: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  valueTag: {
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  valueTagText: {
    fontSize: 12,
    color: Colors.gray[700],
    fontFamily: 'monospace',
  },
  rolloutTag: {
    backgroundColor: 'rgba(14, 165, 233, 0.1)',
  },
  rolloutText: {
    fontSize: 12,
    color: Colors.primary[700],
  },
  targeting: {
    fontSize: 12,
    color: Colors.gray[500],
    marginTop: 8,
  },
})
