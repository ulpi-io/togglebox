/**
 * Health Check Example
 *
 * Shows how to check API connectivity, measure latency,
 * and monitor connection status over time.
 */
import { useState, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'
import { ExamplePage } from '@/components/ExamplePage'
import { Colors, API_URL, PLATFORM, ENVIRONMENT } from '@/lib/constants'

const publicCode = `import { useState, useEffect, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

function HealthCheckExample() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [health, setHealth] = useState<{
    ok: boolean
    message: string
    latency: number
  } | null>(null)

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: 'mobile',
      environment: 'production',
      apiUrl: 'https://your-api.example.com/api/v1',
    })
    return () => clientRef.current?.destroy()
  }, [])

  const checkHealth = async () => {
    if (!clientRef.current) return

    const start = Date.now()
    try {
      const response = await clientRef.current.checkConnection()
      setHealth({
        ok: true,
        message: response.message || 'API is healthy',
        latency: Date.now() - start,
      })
    } catch (error) {
      setHealth({
        ok: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        latency: Date.now() - start,
      })
    }
  }

  return (
    <View>
      <StatusIndicator ok={health?.ok} latency={health?.latency} />
      <Button title="Check Health" onPress={checkHealth} />
    </View>
  )
}`

const authCode = `import { useState, useEffect, useRef } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

function HealthCheckExample() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [health, setHealth] = useState(null)
  const [history, setHistory] = useState<Array<{
    ok: boolean
    latency: number
    time: Date
  }>>([])

  // ... client setup ...

  const checkHealth = async () => {
    const start = Date.now()
    try {
      const response = await clientRef.current?.checkConnection()
      const latency = Date.now() - start
      const result = { ok: true, message: response.message, latency }
      setHealth(result)

      // Keep history of last 5 checks
      setHistory(prev => [
        { ok: true, latency, time: new Date() },
        ...prev.slice(0, 4)
      ])
    } catch (error) {
      // ... error handling ...
    }
  }

  // Auto-check on interval
  useEffect(() => {
    checkHealth()  // Initial check
    const interval = setInterval(checkHealth, 30000)  // Every 30s
    return () => clearInterval(interval)
  }, [])

  return (
    <View>
      <StatusIndicator ok={health?.ok} latency={health?.latency} />
      <HealthHistory history={history} />
      <Button title="Check Now" onPress={checkHealth} />
    </View>
  )
}

// Latency thresholds
// < 100ms = Excellent (green)
// < 300ms = Good (yellow)
// > 300ms = Slow (red)`

const keyPoints = [
  'checkConnection() verifies API accessibility and returns health status',
  'Measure latency by timing the request (Date.now() before/after)',
  'Create ToggleBoxClient directly for health checks (not via Provider)',
  'Keep history of checks to monitor connection stability over time',
  'Use auto-check intervals for continuous monitoring in dev/debug mode',
  'Always call client.destroy() when component unmounts to clean up',
]

export default function HealthCheckScreen() {
  return (
    <ExamplePage
      title="Health Check"
      description="Monitor API connectivity and measure latency. Track connection history for debugging and reliability monitoring."
      publicCode={publicCode}
      authCode={authCode}
      keyPoints={keyPoints}
    >
      <HealthCheckDemo />
    </ExamplePage>
  )
}

function HealthCheckDemo() {
  const clientRef = useRef<ToggleBoxClient | null>(null)
  const [checking, setChecking] = useState(false)
  const [health, setHealth] = useState<{
    ok: boolean
    message: string
    latency: number
  } | null>(null)
  const [history, setHistory] = useState<Array<{ ok: boolean; latency: number; time: Date }>>([])

  useEffect(() => {
    clientRef.current = new ToggleBoxClient({
      platform: PLATFORM,
      environment: ENVIRONMENT,
      apiUrl: API_URL,
    })
    return () => clientRef.current?.destroy()
  }, [])

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
    if (latency < 100) return '#22c55e'
    if (latency < 300) return '#f59e0b'
    return '#ef4444'
  }

  const getLatencyLabel = (latency: number) => {
    if (latency < 100) return 'Excellent'
    if (latency < 300) return 'Good'
    return 'Slow'
  }

  return (
    <View style={styles.demo}>
      {/* Status Display */}
      <View style={[styles.statusCard, health?.ok === false && styles.statusCardError]}>
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
              <View style={[styles.latencyBadge, { backgroundColor: getLatencyColor(health.latency) + '20' }]}>
                <Text style={[styles.latencyBadgeText, { color: getLatencyColor(health.latency) }]}>
                  {getLatencyLabel(health.latency)}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.statusIcon}>?</Text>
            <Text style={styles.statusTitle}>Not Checked</Text>
            <Text style={styles.statusMessage}>Tap the button below to check API health</Text>
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
              <Text style={[styles.historyIcon, { color: check.ok ? '#22c55e' : '#ef4444' }]}>
                {check.ok ? '✓' : '✗'}
              </Text>
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
        <Text style={styles.infoValue} numberOfLines={1}>
          {API_URL}
        </Text>
      </View>

      {/* Latency Guide */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Latency Guide</Text>
        <LatencyGuideRow color="#22c55e" range="< 100ms" label="Excellent" />
        <LatencyGuideRow color="#f59e0b" range="100-300ms" label="Good" />
        <LatencyGuideRow color="#ef4444" range="> 300ms" label="Slow" />
      </View>
    </View>
  )
}

function LatencyGuideRow({ color, range, label }: { color: string; range: string; label: string }) {
  return (
    <View style={styles.guideRow}>
      <View style={[styles.guideDot, { backgroundColor: color }]} />
      <Text style={styles.guideRange}>{range}</Text>
      <Text style={styles.guideLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  demo: {
    gap: 12,
  },
  statusCard: {
    backgroundColor: Colors.gray[50],
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  statusCardError: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: Colors.gray[700],
  },
  statusMessage: {
    fontSize: 14,
    color: Colors.gray[500],
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
    color: Colors.gray[500],
  },
  latencyValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  latencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  latencyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.primary[500],
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
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
    backgroundColor: Colors.gray[50],
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.gray[700],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  historyIcon: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyTime: {
    flex: 1,
    fontSize: 13,
    color: Colors.gray[500],
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
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    color: '#f3f4f6',
    fontFamily: 'monospace',
  },
  guideRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  guideDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  guideRange: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: Colors.gray[600],
    width: 80,
  },
  guideLabel: {
    fontSize: 13,
    color: Colors.gray[500],
  },
})
