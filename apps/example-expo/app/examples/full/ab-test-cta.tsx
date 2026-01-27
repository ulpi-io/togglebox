/**
 * A/B Test CTA Example
 *
 * Shows how to render different CTAs based on experiment variant
 * and track conversions for measuring results.
 */
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useExperiments, ToggleBoxClient } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors, API_URL, PLATFORM, ENVIRONMENT, DEFAULT_USER_ID } from '@/lib/constants'

const publicCode = `import { useState, useEffect, useRef } from 'react'
import { useExperiments, ToggleBoxClient } from '@togglebox/sdk-expo'

function ABTestCTAExample() {
  const { getVariant, isLoading } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)
  const clientRef = useRef<ToggleBoxClient | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({ platform, environment, apiUrl })
    return () => clientRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      getVariant('pricing-cta', { userId: 'user-123' })
        .then(setVariant)
    }
  }, [isLoading, getVariant])

  const handleCTAClick = () => {
    // Track conversion when user clicks
    clientRef.current?.trackConversion('pricing-cta', { userId: 'user-123' }, {
      metricName: 'cta_click',
    })
  }

  if (!variant) return <LoadingSpinner />

  // Render different CTA based on variant
  if (variant === 'urgent') {
    return <Button onPress={handleCTAClick}>🔥 Limited Offer!</Button>
  }
  return <Button onPress={handleCTAClick}>Start Free Trial</Button>
}`

const authCode = `import { useState, useEffect, useRef } from 'react'
import { useExperiments, ToggleBoxClient } from '@togglebox/sdk-expo'
import { startExperiment, completeExperiment } from '@/lib/api'

function ABTestCTAExample() {
  const { experiments, getVariant, refresh, isLoading } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)
  const clientRef = useRef<ToggleBoxClient | null>(null)

  // ... client setup and variant assignment ...

  const handleCTAClick = async () => {
    clientRef.current?.trackConversion('pricing-cta', { userId: 'user-123' }, {
      metricName: 'cta_click',
      value: 1,  // Optional numeric value
    })
    await clientRef.current?.flushStats()  // Send immediately
  }

  // Admin controls (requires API key)
  const handleStartExperiment = async () => {
    await startExperiment('mobile', 'production', 'pricing-cta')
    await refresh()
  }

  const handleCompleteExperiment = async () => {
    await completeExperiment('mobile', 'production', 'pricing-cta')
    await refresh()
  }

  return (
    <View>
      {variant === 'urgent' ? <UrgentCTA onClick={handleCTAClick} /> : <StandardCTA onClick={handleCTAClick} />}
      <ExperimentControls onStart={handleStartExperiment} onComplete={handleCompleteExperiment} />
    </View>
  )
}

// Set EXPO_PUBLIC_API_KEY=your-key for experiment controls`

const keyPoints = [
  'getVariant() assigns user to a variant deterministically',
  'Same user always gets the same variant (consistent experience)',
  'Render completely different UI based on assigned variant',
  'trackConversion() records when user completes desired action',
  'Use flushStats() to send conversion data immediately',
  'In auth mode, you can start/pause/complete experiments',
]

export default function ABTestCTAScreen() {
  return (
    <ExamplePage
      title="A/B Test CTA"
      description="Test different call-to-action variants and track conversions to measure which performs better."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <ABTestDemo />
    </ExamplePage>
  )
}

function ABTestDemo() {
  const { getVariant, isLoading } = useExperiments()
  const [variant, setVariant] = useState<string | null>(null)
  const [clicks, setClicks] = useState(0)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const clientRef = useRef<ToggleBoxClient | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      getVariant('pricing-cta', { userId: DEFAULT_USER_ID }).then(setVariant)
    }
  }, [isLoading, getVariant])

  const handleCTAClick = async () => {
    if (!clientRef.current) return
    setClicks((c) => c + 1)
    try {
      await clientRef.current.trackConversion('pricing-cta', { userId: DEFAULT_USER_ID }, {
        metricName: 'cta_click',
        value: 1,
      })
      await clientRef.current.flushStats()
      setLastAction(`Conversion tracked: cta_click (click #${clicks + 1})`)
    } catch {
      setLastAction('Error tracking conversion')
    }
  }

  if (isLoading || variant === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={styles.loadingText}>Assigning variant...</Text>
      </View>
    )
  }

  return (
    <View style={styles.demo}>
      {/* Variant Info */}
      <View style={styles.variantCard}>
        <Text style={styles.variantLabel}>Your assigned variant</Text>
        <Text style={styles.variantValue}>{variant || 'control'}</Text>
      </View>

      {/* CTA Buttons - Different based on variant */}
      {variant === 'urgent' ? (
        <TouchableOpacity style={styles.urgentButton} onPress={handleCTAClick}>
          <Text style={styles.buttonText}>🔥 Limited Time Offer - Start Now!</Text>
        </TouchableOpacity>
      ) : variant === 'social-proof' ? (
        <TouchableOpacity style={styles.socialButton} onPress={handleCTAClick}>
          <Text style={styles.buttonText}>Join 10,000+ Happy Users</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.controlButton} onPress={handleCTAClick}>
          <Text style={styles.buttonText}>Start Your Free Trial</Text>
        </TouchableOpacity>
      )}

      {/* Click Counter */}
      <View style={styles.statsRow}>
        <Text style={styles.statsLabel}>Clicks tracked</Text>
        <Text style={styles.statsValue}>{clicks}</Text>
      </View>

      {/* Last Action */}
      {lastAction && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{lastAction}</Text>
        </View>
      )}

      {/* Explanation */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>A/B Testing Flow</Text>
        <Text style={styles.infoText}>
          1. User visits page → getVariant() assigns variant{'\n'}
          2. App renders CTA based on assigned variant{'\n'}
          3. User clicks → trackConversion() records it{'\n'}
          4. Data sent to server for analysis{'\n\n'}
          Compare conversion rates across variants to find the winner.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  variantCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
  },
  variantLabel: {
    fontSize: 12,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  variantValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary[700],
    fontFamily: 'monospace',
  },
  urgentButton: {
    backgroundColor: '#ef4444',
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  socialButton: {
    backgroundColor: Colors.success,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: Colors.primary[500],
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statsLabel: {
    fontSize: 14,
    color: Colors.gray[600],
  },
  statsValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  resultText: {
    fontSize: 13,
    color: '#166534',
  },
  infoCard: {
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.gray[700],
  },
  infoText: {
    fontSize: 13,
    color: Colors.gray[600],
    lineHeight: 20,
  },
})
