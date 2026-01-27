/**
 * Event Tracking Example
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * WHY EVENT TRACKING IS SEPARATE FROM CONFIGS, FLAGS & EXPERIMENTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * ToggleBox has THREE TIERS of functionality with different data flow patterns:
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ TIER 1-3: CONFIGS, FLAGS, EXPERIMENTS (READ operations)                     │
 * │                                                                             │
 * │   Server ──────> SDK ──────> Your App                                       │
 * │                                                                             │
 * │   • Data flows FROM the server TO your app                                  │
 * │   • Fetched once, cached locally (MMKV for offline)                         │
 * │   • Determines WHAT to show users                                           │
 * │   • Examples: feature toggles, A/B test variants, remote config             │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │ EVENT TRACKING (WRITE operations)                                           │
 * │                                                                             │
 * │   Your App ──────> SDK ──────> Server                                       │
 * │                                                                             │
 * │   • Data flows FROM your app TO the server                                  │
 * │   • Batched and sent efficiently (reduces network calls)                    │
 * │   • Records WHAT users do                                                   │
 * │   • Examples: taps, screen views, purchases, conversions                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
 *
 * KEY DIFFERENCES:
 * ────────────────
 *
 *   useConfig(), useFlags(), useExperiments()
 *   → READ data FROM server → render UI accordingly
 *   → "What should we show this user?"
 *
 *   trackEvent(), trackConversion()
 *   → WRITE data TO server → analytics/attribution
 *   → "What did this user do?"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * MOBILE-SPECIFIC CONSIDERATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * On mobile, event tracking has special considerations:
 *
 *   1. BATCHING: Events are queued and sent in batches to save battery/data
 *   2. OFFLINE: Events are stored locally when offline, sent when connected
 *   3. FLUSH: Use flushStats() before important moments (purchase, app close)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

// Configuration - replace with your values
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = 'mobile'
const ENVIRONMENT = 'production'

export default function TrackEventScreen() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [clicks, setClicks] = useState(0)
  const [tracking, setTracking] = useState(false)
  const [lastTracked, setLastTracked] = useState<string | null>(null)

  // Create client on mount
  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  // ═══════════════════════════════════════════════════════════════════════════
  // trackEvent() - Custom Analytics Events
  // ═══════════════════════════════════════════════════════════════════════════
  // Use for general analytics: button taps, screen views, feature usage.
  // Events are batched and sent efficiently to minimize network calls.
  //
  // Parameters:
  //   - eventName: String identifier for the event
  //   - context: User context (userId required for attribution)
  //   - options.properties: Additional event metadata

  const handleButtonClick = async () => {
    if (!clientRef.current) return

    clientRef.current.trackEvent('button_click', { userId: 'user-123' }, {
      properties: {
        buttonId: 'cta-main',
        screen: 'pricing',
        // Add any custom properties relevant to your analytics
      },
    })
    setClicks((c) => c + 1)
    setLastTracked('Event: button_click')
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // trackConversion() - Experiment Conversion Tracking
  // ═══════════════════════════════════════════════════════════════════════════
  // Use to measure A/B test outcomes. Links a user action to an experiment
  // so you can compare conversion rates between variants.
  //
  // Parameters:
  //   - experimentKey: The experiment this conversion is attributed to
  //   - context: User context (must match getVariant() context)
  //   - options.metricName: What was converted (e.g., 'purchase', 'signup')
  //   - options.value: Numeric value (e.g., purchase amount)

  const handlePurchase = async () => {
    if (!clientRef.current) return
    setTracking(true)

    try {
      await clientRef.current.trackConversion('pricing-page', { userId: 'user-123' }, {
        metricName: 'purchase',
        value: 99.99,
      })

      // ═══════════════════════════════════════════════════════════════════════
      // flushStats() - Send Events Immediately
      // ═══════════════════════════════════════════════════════════════════════
      // By default, events are batched for efficiency. Use flushStats() when:
      //   • Before a purchase confirmation (ensure attribution)
      //   • Before app goes to background
      //   • After critical user actions
      await clientRef.current.flushStats()

      setLastTracked('Conversion: purchase ($99.99)')
    } catch {
      setLastTracked('Error tracking conversion')
    }

    setTracking(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Track Event</Text>

      {/* Track Custom Event */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Custom Event</Text>
        <Text style={styles.cardDescription}>
          General analytics: taps, views, feature usage
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleButtonClick}>
          <Text style={styles.buttonText}>Click Me ({clicks} clicks)</Text>
        </TouchableOpacity>
      </View>

      {/* Track Conversion */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Track Conversion</Text>
        <Text style={styles.cardDescription}>
          A/B test outcomes: link actions to experiments
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handlePurchase}
          disabled={tracking}
        >
          {tracking ? (
            <ActivityIndicator color="#22c55e" />
          ) : (
            <Text style={styles.secondaryButtonText}>Complete Purchase</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Result */}
      {lastTracked && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>{lastTracked}</Text>
        </View>
      )}

      {/* Explanation */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Event Tracking vs Config/Flags</Text>
        <Text style={styles.infoText}>
          {'\u2022'} Config/Flags/Experiments: READ from server → what to show{'\n'}
          {'\u2022'} Event Tracking: WRITE to server → what user did{'\n\n'}
          Events are batched for efficiency. Use flushStats() for critical moments.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#22c55e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  resultText: {
    color: '#22c55e',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1e40af',
  },
  infoText: {
    fontSize: 13,
    color: '#1e40af',
    lineHeight: 20,
  },
})
