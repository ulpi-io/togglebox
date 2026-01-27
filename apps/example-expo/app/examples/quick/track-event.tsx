/**
 * Event Tracking Example
 *
 * Shows how to track custom events and A/B test conversions.
 * Events are batched for efficiency and sent on flushStats().
 */
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors, API_URL, PLATFORM, ENVIRONMENT } from '@/lib/constants'

const publicCode = `import { ToggleBoxClient } from '@togglebox/sdk-expo'

const client = new ToggleBoxClient({
  platform: 'mobile',
  environment: 'production',
  apiUrl: 'https://your-api.example.com/api/v1',
})

// Track custom analytics event
function handleButtonClick() {
  client.trackEvent('button_click', { userId: 'user-123' }, {
    properties: {
      buttonId: 'cta-main',
      screen: 'pricing',
    },
  })
}

// Track A/B test conversion
async function handlePurchase(amount: number) {
  await client.trackConversion('checkout-test', { userId: 'user-123' }, {
    metricName: 'purchase',
    value: amount,
  })

  // Send immediately for critical moments
  await client.flushStats()
}

// Cleanup when done
useEffect(() => () => client.destroy(), [])`

const authCode = `import { ToggleBoxClient } from '@togglebox/sdk-expo'

const client = new ToggleBoxClient({
  platform: 'mobile',
  environment: 'production',
  apiUrl: 'https://your-api.example.com/api/v1',
})

// Track custom event with rich properties
function handleFeatureUsage(featureId: string) {
  client.trackEvent('feature_used', { userId: 'user-123' }, {
    experimentKey: 'feature-experiment',  // Link to experiment
    properties: {
      featureId,
      duration: 1500,
      sessionId: 'session-abc',
    },
  })
}

// Track conversion with experiment attribution
async function handleSubscription(plan: string, amount: number) {
  await client.trackConversion('pricing-test', { userId: 'user-123' }, {
    metricName: 'subscription',
    value: amount,
  })

  // Also track as custom event with more detail
  client.trackEvent('subscription_completed', { userId: 'user-123' }, {
    properties: { plan, amount, currency: 'USD' },
  })

  await client.flushStats()  // Ensure data is sent
}

// Set EXPO_PUBLIC_API_KEY=your-key for authenticated tracking`

const keyPoints = [
  'trackEvent() for custom analytics: taps, views, feature usage',
  'trackConversion() for A/B test outcomes: purchases, signups, completions',
  'Events are batched automatically for efficiency',
  'Use flushStats() before critical moments (purchases, app background)',
  'Context must match getVariant() context for accurate attribution',
  'Remember to call client.destroy() on unmount to clean up resources',
]

export default function TrackEventScreen() {
  return (
    <ExamplePage
      title="Track Event"
      description="Track custom analytics events and A/B test conversions. Events are batched for efficiency and sent on flushStats()."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <TrackEventDemo />
    </ExamplePage>
  )
}

function TrackEventDemo() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [clicks, setClicks] = useState(0)
  const [tracking, setTracking] = useState(false)
  const [lastTracked, setLastTracked] = useState<string | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  const handleButtonClick = () => {
    if (!clientRef.current) return
    clientRef.current.trackEvent('button_click', { userId: 'demo-user-123' }, {
      properties: {
        buttonId: 'demo-cta',
        screen: 'track-event-example',
        clickNumber: clicks + 1,
      },
    })
    setClicks((c) => c + 1)
    setLastTracked('Event: button_click')
  }

  const handlePurchase = async () => {
    if (!clientRef.current) return
    setTracking(true)
    try {
      await clientRef.current.trackConversion('checkout-test', { userId: 'demo-user-123' }, {
        metricName: 'purchase',
        value: 99.99,
      })
      await clientRef.current.flushStats()
      setLastTracked('Conversion: purchase ($99.99) - flushed')
    } catch {
      setLastTracked('Error tracking conversion')
    }
    setTracking(false)
  }

  const handleFlush = async () => {
    if (!clientRef.current) return
    setTracking(true)
    try {
      await clientRef.current.flushStats()
      setLastTracked(`Flushed ${clicks} pending events`)
    } catch {
      setLastTracked('Error flushing events')
    }
    setTracking(false)
  }

  return (
    <View style={styles.demo}>
      {/* Track Custom Event */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Custom Event</Text>
        <Text style={styles.cardDescription}>
          General analytics: button taps, screen views, feature usage
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleButtonClick}>
          <Text style={styles.buttonText}>Click Me ({clicks} clicks)</Text>
        </TouchableOpacity>
      </View>

      {/* Track Conversion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Conversion</Text>
        <Text style={styles.cardDescription}>
          A/B test outcomes: link user actions to experiments
        </Text>
        <TouchableOpacity
          style={styles.successButton}
          onPress={handlePurchase}
          disabled={tracking}
        >
          {tracking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Purchase ($99.99)</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Flush Events */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Flush Events</Text>
        <Text style={styles.cardDescription}>
          Send batched events immediately (use before critical moments)
        </Text>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={handleFlush}
          disabled={tracking}
        >
          <Text style={styles.outlineButtonText}>Flush Stats Now</Text>
        </TouchableOpacity>
      </View>

      {/* Result */}
      {lastTracked && (
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Last Action</Text>
          <Text style={styles.resultText}>{lastTracked}</Text>
        </View>
      )}

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Event Tracking vs Config/Flags</Text>
        <Text style={styles.infoText}>
          {'\u2022'} Config/Flags/Experiments: READ from server (what to show){'\n'}
          {'\u2022'} Event Tracking: WRITE to server (what user did){'\n\n'}
          Events are batched automatically. Use flushStats() for critical moments.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  card: {
    backgroundColor: Colors.gray[50],
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gray[900],
  },
  cardDescription: {
    fontSize: 13,
    color: Colors.gray[500],
    marginBottom: 4,
  },
  primaryButton: {
    backgroundColor: Colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  successButton: {
    backgroundColor: Colors.success,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  outlineButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  outlineButtonText: {
    color: Colors.primary[600],
    fontWeight: '600',
    fontSize: 15,
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  resultLabel: {
    fontSize: 11,
    color: Colors.gray[500],
    marginBottom: 2,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#166534',
  },
  infoCard: {
    backgroundColor: Colors.primary[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary[200],
    marginTop: 4,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.primary[800],
  },
  infoText: {
    fontSize: 13,
    color: Colors.primary[700],
    lineHeight: 20,
  },
})
