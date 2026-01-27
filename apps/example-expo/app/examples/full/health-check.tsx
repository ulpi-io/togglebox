/**
 * Health Check Example
 *
 * Shows how to check API connectivity and latency.
 * Copy this file and adapt to your app.
 */
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

// Configuration - replace with your values
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = 'mobile'
const ENVIRONMENT = 'production'

export default function HealthCheckScreen() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [checking, setChecking] = useState(false)
  const [health, setHealth] = useState<{
    ok: boolean
    message: string
    latency: number
  } | null>(null)
  const [history, setHistory] = useState<Array<{ ok: boolean; latency: number; time: Date }>>([])

  // Create client on mount
  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

  // Check API health
  const checkHealth = async () => {
    if (!clientRef.current) return
    setChecking(true)

    const start = Date.now()
    try {
      const response = await clientRef.current.checkConnection()
      const latency = Date.now() - start
      const result = {
        ok: true,
        message: response.message || 'API is healthy',
        latency,
      }
      setHealth(result)
      setHistory((prev) => [{ ok: true, latency, time: new Date() }, ...prev.slice(0, 4)])
    } catch (error) {
      const latency = Date.now() - start
      const result = {
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latency,
      }
      setHealth(result)
      setHistory((prev) => [{ ok: false, latency, time: new Date() }, ...prev.slice(0, 4)])
    }

    setChecking(false)
  }

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return '#22c55e' // green
    if (latency < 300) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Health Check</Text>

      {/* Status Display */}
      <View style={styles.statusCard}>
        {health ? (
          <>
            <Text style={styles.statusIcon}>{health.ok ? '✓' : '✗'}</Text>
            <Text style={[styles.statusTitle, { color: health.ok ? '#22c55e' : '#ef4444' }]}>
              {health.ok ? 'API Healthy' : 'API Unreachable'}
            </Text>
            <Text style={styles.statusMessage}>{health.message}</Text>
            <View style={styles.latencyRow}>
              <Text style={styles.latencyLabel}>Latency:</Text>
              <Text style={[styles.latencyValue, { color: getLatencyColor(health.latency) }]}>
                {health.latency}ms
              </Text>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.statusIcon}>?</Text>
            <Text style={styles.statusTitle}>Not Checked</Text>
            <Text style={styles.statusMessage}>Tap the button to check API health</Text>
          </>
        )}
      </View>

      {/* Check Button */}
      <TouchableOpacity
        style={[styles.button, checking && styles.buttonDisabled]}
        onPress={checkHealth}
        disabled={checking}
      >
        {checking ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Check Health</Text>
        )}
      </TouchableOpacity>

      {/* History */}
      {history.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Checks</Text>
          {history.map((check, index) => (
            <View key={index} style={styles.historyRow}>
              <Text>{check.ok ? '✓' : '✗'}</Text>
              <Text style={styles.historyTime}>{check.time.toLocaleTimeString()}</Text>
              <Text style={[styles.historyLatency, { color: getLatencyColor(check.latency) }]}>
                {check.latency}ms
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* API Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>API Endpoint</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{API_URL}</Text>
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
  statusCard: {
    backgroundColor: '#f5f5f5',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  latencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  latencyLabel: {
    fontSize: 14,
    color: '#666',
  },
  latencyValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  historyTime: {
    flex: 1,
    fontSize: 13,
    color: '#666',
  },
  historyLatency: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  infoCard: {
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: '#f3f4f6',
    fontFamily: 'monospace',
  },
})
