'use client'

import { useState, useRef, useEffect } from 'react'
import { ToggleBoxClient } from '@togglebox/sdk-nextjs'

// Configuration - uses environment variables
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'production'

/**
 * Health Check Example
 *
 * Shows how to check API connectivity and latency.
 * Useful for debugging and monitoring.
 */
export default function HealthCheck() {
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
    if (latency < 100) return 'text-green-600'
    if (latency < 300) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getLatencyBg = (latency: number) => {
    if (latency < 100) return 'bg-green-100'
    if (latency < 300) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  return (
    <div className="space-y-6">
      {/* Status Display */}
      <div className="p-6 bg-gray-50 rounded-lg text-center">
        {health ? (
          <>
            <div className="text-4xl mb-2">{health.ok ? '✓' : '✗'}</div>
            <h2 className={`text-lg font-semibold ${health.ok ? 'text-green-600' : 'text-red-600'}`}>
              {health.ok ? 'API Healthy' : 'API Unreachable'}
            </h2>
            <p className="text-gray-500 mt-1">{health.message}</p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <span className="text-gray-500">Latency:</span>
              <span className={`font-mono font-bold ${getLatencyColor(health.latency)}`}>
                {health.latency}ms
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="text-4xl mb-2">?</div>
            <h2 className="text-lg font-semibold text-gray-600">Not Checked</h2>
            <p className="text-gray-500 mt-1">Click the button to check API health</p>
          </>
        )}
      </div>

      {/* Check Button */}
      <button
        onClick={checkHealth}
        disabled={checking}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {checking ? 'Checking...' : 'Check Health'}
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-3">Recent Checks</h3>
          <div className="space-y-2">
            {history.map((check, index) => (
              <div
                key={index}
                className="flex items-center gap-3 py-2 border-b border-gray-200 last:border-0"
              >
                <span>{check.ok ? '✓' : '✗'}</span>
                <span className="flex-1 text-sm text-gray-500">
                  {check.time.toLocaleTimeString()}
                </span>
                <span
                  className={`px-2 py-1 rounded font-mono text-sm ${getLatencyBg(check.latency)} ${getLatencyColor(check.latency)}`}
                >
                  {check.latency}ms
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Info */}
      <div className="p-3 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400">API Endpoint</div>
        <div className="text-sm text-gray-100 font-mono truncate">{API_URL}</div>
      </div>
    </div>
  )
}
