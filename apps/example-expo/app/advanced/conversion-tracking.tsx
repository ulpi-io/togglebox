/**
 * Conversion Tracking Example
 *
 * Shows how to track experiment conversions and custom events.
 * Copy this file and adapt to your app.
 */
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

// Configuration - replace with your values
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = 'mobile'
const ENVIRONMENT = 'production'

export default function ConversionTrackingScreen() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [tracking, setTracking] = useState(false)
  const [lastTracked, setLastTracked] = useState<string | null>(null)

  // Create client on mount, destroy on unmount
  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  // Track a conversion (e.g., purchase)
  const handleTrackConversion = async () => {
    if (!clientRef.current) return
    setTracking(true)

    try {
      await clientRef.current.trackConversion(
        'checkout-test', // experiment key
        { userId: 'user-123' }, // context
        {
          metricName: 'purchase',
          value: 99.99, // optional value
        }
      )
      await clientRef.current.flushStats() // send immediately
      setLastTracked('Conversion: purchase ($99.99)')
    } catch (error) {
      setLastTracked('Error tracking conversion')
    }

    setTracking(false)
  }

  // Track a custom event
  const handleTrackEvent = async () => {
    if (!clientRef.current) return
    setTracking(true)

    try {
      clientRef.current.trackEvent(
        'add_to_cart', // event name
        { userId: 'user-123' }, // context
        {
          experimentKey: 'checkout-test',
          properties: {
            productId: 'SKU-123',
            quantity: 2,
          },
        }
      )
      await clientRef.current.flushStats()
      setLastTracked('Event: add_to_cart')
    } catch (error) {
      setLastTracked('Error tracking event')
    }

    setTracking(false)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Conversion Tracking</Text>

      <Text style={styles.description}>
        Track experiment conversions to measure which variations perform better.
      </Text>

      {/* Track Conversion Button */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleTrackConversion}
        disabled={tracking}
      >
        {tracking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Track Conversion ($99.99)</Text>
        )}
      </TouchableOpacity>

      {/* Track Event Button */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={handleTrackEvent}
        disabled={tracking}
      >
        <Text style={styles.secondaryButtonText}>Track Add to Cart Event</Text>
      </TouchableOpacity>

      {/* Result */}
      {lastTracked && (
        <View style={styles.resultCard}>
          <Text style={styles.resultText}>✓ {lastTracked}</Text>
        </View>
      )}

      {/* Usage Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Usage</Text>
        <Text style={styles.infoText}>
          • trackConversion() - Records conversion with optional value{'\n'}
          • trackEvent() - Records custom events{'\n'}
          • flushStats() - Sends all pending events immediately
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  secondaryButtonText: {
    color: '#0ea5e9',
    fontWeight: '600',
    fontSize: 16,
  },
  resultCard: {
    backgroundColor: '#f0fdf4',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  resultText: {
    color: '#22c55e',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
})
