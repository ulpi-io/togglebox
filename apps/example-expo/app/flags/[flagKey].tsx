import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useFlag, useToggleBox, ToggleBoxClient } from '@togglebox/sdk-expo'
import { Loading } from '@/components/Loading'
import { toggleFlag, hasApiKey } from '@/lib/api'
import { Colors, PLATFORM, ENVIRONMENT, DEFAULT_USER_ID, API_URL } from '@/lib/constants'

export default function FlagDetailScreen() {
  const { flagKey } = useLocalSearchParams<{ flagKey: string }>()
  const router = useRouter()
  const { flag, isLoading } = useFlag(flagKey)
  const { refresh } = useToggleBox()
  const canManage = hasApiKey()

  const [userId, setUserId] = useState(DEFAULT_USER_ID)
  const [country, setCountry] = useState('')
  const [language, setLanguage] = useState('')
  const [evaluationResult, setEvaluationResult] = useState<{
    enabled: boolean
    value: string
    reason: string
  } | null>(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isToggling, setIsToggling] = useState(false)

  // Create a client for evaluation (separate from provider to avoid caching)
  const clientRef = useRef<ToggleBoxClient | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
      cache: { enabled: false, ttl: 0 },
    })

    return () => {
      clientRef.current?.destroy()
    }
  }, [])

  const handleEvaluate = async () => {
    if (!clientRef.current) return

    setIsEvaluating(true)
    try {
      const result = await clientRef.current.getFlag(flagKey, { userId, country, language })
      setEvaluationResult({
        enabled: result.servedValue === 'A',
        value: result.servedValue === 'A' ? String(flag?.valueA) : String(flag?.valueB),
        reason: result.matchedRule
          ? `Matched targeting rule for ${result.matchedRule.country}`
          : result.rolloutApplied
            ? 'Rollout applied'
            : 'Default value',
      })
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to evaluate flag')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleToggle = async () => {
    if (!flag) return
    setIsToggling(true)
    try {
      await toggleFlag(PLATFORM, ENVIRONMENT, flagKey, !flag.enabled)
      Alert.alert('Success', `Flag ${!flag.enabled ? 'enabled' : 'disabled'}`)
      await refresh()
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to toggle flag')
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!flag) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Flag Not Found</Text>
        <Text style={styles.errorMessage}>The flag "{flagKey}" does not exist.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <>
      <Stack.Screen options={{ title: flag.flagKey }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{flag.flagKey}</Text>
          {flag.description && (
            <Text style={styles.description}>{flag.description}</Text>
          )}
        </View>

        <View style={styles.statusRow}>
          <View style={[styles.badge, flag.enabled ? styles.enabledBadge : styles.disabledBadge]}>
            <Text style={[styles.badgeText, flag.enabled ? styles.enabledText : styles.disabledText]}>
              {flag.enabled ? 'Enabled' : 'Disabled'}
            </Text>
          </View>
          {canManage && (
            <TouchableOpacity
              style={[styles.toggleButton, flag.enabled ? styles.disableButton : styles.enableButton]}
              onPress={handleToggle}
              disabled={isToggling}
            >
              <Text style={styles.toggleButtonText}>
                {isToggling ? 'Updating...' : flag.enabled ? 'Disable' : 'Enable'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Flag Configuration</Text>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Value A (Default)</Text>
            <Text style={styles.configValue}>{String(flag.valueA)}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Value B (Alternate)</Text>
            <Text style={styles.configValue}>{String(flag.valueB)}</Text>
          </View>

          {flag.rolloutEnabled && (
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Rollout Percentage</Text>
              <View style={styles.rolloutContainer}>
                <View style={styles.rolloutBar}>
                  <View
                    style={[styles.rolloutFill, { width: `${flag.rolloutPercentageA ?? 100}%` }]}
                  />
                </View>
                <Text style={styles.rolloutText}>{flag.rolloutPercentageA ?? 100}%</Text>
              </View>
            </View>
          )}

          {flag.targeting?.countries && flag.targeting.countries.length > 0 && (
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Targeting Rules</Text>
              <View style={styles.targetingContainer}>
                {flag.targeting.countries.map((rule, index) => (
                  <View key={index} style={styles.targetingRule}>
                    <Text style={styles.targetingText}>
                      {rule.country} → Serve Value {rule.serveValue}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Evaluate Flag</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>User ID</Text>
            <TextInput
              style={styles.input}
              value={userId}
              onChangeText={setUserId}
              placeholder="Enter user ID"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Country (optional)</Text>
            <TextInput
              style={styles.input}
              value={country}
              onChangeText={setCountry}
              placeholder="e.g., US, CA, UK"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Language (optional)</Text>
            <TextInput
              style={styles.input}
              value={language}
              onChangeText={setLanguage}
              placeholder="e.g., en, es, fr"
            />
          </View>

          <TouchableOpacity
            style={styles.evaluateButton}
            onPress={handleEvaluate}
            disabled={isEvaluating || !userId}
          >
            <Text style={styles.evaluateButtonText}>
              {isEvaluating ? 'Evaluating...' : 'Evaluate'}
            </Text>
          </TouchableOpacity>

          {evaluationResult && (
            <View style={styles.resultContainer}>
              <Text style={styles.resultTitle}>Result</Text>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Enabled:</Text>
                <View style={[styles.resultBadge, evaluationResult.enabled ? styles.resultEnabledBadge : styles.resultDisabledBadge]}>
                  <Text style={[styles.resultBadgeText, evaluationResult.enabled ? styles.resultEnabledText : styles.resultDisabledText]}>
                    {evaluationResult.enabled ? 'Yes' : 'No'}
                  </Text>
                </View>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Value:</Text>
                <Text style={styles.resultValue}>{evaluationResult.value}</Text>
              </View>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Reason:</Text>
                <Text style={styles.resultReason}>{evaluationResult.reason}</Text>
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
    marginBottom: 16,
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
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  enabledBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  disabledBadge: {
    backgroundColor: Colors.gray[100],
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  enabledText: {
    color: Colors.success,
  },
  disabledText: {
    color: Colors.gray[600],
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  enableButton: {
    backgroundColor: Colors.success,
  },
  disableButton: {
    backgroundColor: Colors.gray[600],
  },
  toggleButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
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
  configRow: {
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.gray[500],
    marginBottom: 4,
  },
  configValue: {
    fontSize: 14,
    color: Colors.gray[900],
    fontFamily: 'monospace',
    backgroundColor: Colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  rolloutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolloutBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  rolloutFill: {
    height: '100%',
    backgroundColor: Colors.primary[600],
  },
  rolloutText: {
    fontSize: 14,
    color: Colors.gray[600],
    width: 40,
    textAlign: 'right',
  },
  targetingContainer: {
    gap: 8,
  },
  targetingRule: {
    backgroundColor: Colors.gray[50],
    padding: 8,
    borderRadius: 4,
  },
  targetingText: {
    fontSize: 14,
    color: Colors.gray[700],
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
  evaluateButton: {
    backgroundColor: Colors.primary[600],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  evaluateButtonText: {
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
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultEnabledBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  resultDisabledBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultEnabledText: {
    color: Colors.success,
  },
  resultDisabledText: {
    color: Colors.error,
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
  resultReason: {
    fontSize: 14,
    color: Colors.gray[600],
    flex: 1,
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
