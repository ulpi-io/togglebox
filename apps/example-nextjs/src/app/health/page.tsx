import { ToggleBoxClient } from '@togglebox/sdk-nextjs'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

interface HealthResult {
  success: boolean
  data?: {
    message: string
    uptime: number
    timestamp?: string
  }
  error?: string
  responseTime?: number
}

/**
 * Check API health using the SDK client.
 * This demonstrates server-side connectivity testing.
 */
async function checkAPIHealth(): Promise<HealthResult> {
  const startTime = Date.now()

  const client = new ToggleBoxClient({
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    cache: { enabled: false, ttl: 0 },
  })

  try {
    const health = await client.checkConnection()
    const responseTime = Date.now() - startTime

    return {
      success: true,
      data: {
        message: health.message || 'API is healthy',
        uptime: health.uptime || 0,
        timestamp: new Date().toISOString(),
      },
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      responseTime,
    }
  } finally {
    client.destroy()
  }
}

// No caching - always check fresh health
export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const result = await checkAPIHealth()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">API Health Check</h1>
        <p className="text-gray-500 mt-1">
          Server-side health check using ToggleBoxClient.checkConnection()
        </p>
      </div>

      {/* Health Status Card */}
      <div className={`rounded-lg p-6 mb-6 ${
        result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-4 h-4 rounded-full ${
            result.success ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <h2 className={`text-lg font-semibold ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? 'API is Healthy' : 'API is Unavailable'}
          </h2>
        </div>

        {result.success && result.data && (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">Message</dt>
              <dd className="text-gray-900 font-medium">{result.data.message}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Uptime</dt>
              <dd className="text-gray-900 font-medium">{formatUptime(result.data.uptime)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Response Time</dt>
              <dd className="text-gray-900 font-medium">{result.responseTime}ms</dd>
            </div>
            <div>
              <dt className="text-gray-500">Checked At</dt>
              <dd className="text-gray-900 font-medium">{result.data.timestamp}</dd>
            </div>
          </dl>
        )}

        {!result.success && (
          <div className="space-y-2">
            <p className="text-red-600 text-sm">{result.error}</p>
            {result.responseTime && (
              <p className="text-red-500 text-xs">Response time: {result.responseTime}ms</p>
            )}
          </div>
        )}
      </div>

      {/* Connection Details */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Connection Details</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">API URL</dt>
            <dd className="text-gray-900 font-mono text-xs break-all">{API_URL}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Platform</dt>
            <dd className="text-gray-900">{PLATFORM}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Environment</dt>
            <dd className="text-gray-900">{ENVIRONMENT}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Health Endpoint</dt>
            <dd className="text-gray-900 font-mono text-xs">/health</dd>
          </div>
        </dl>
      </div>

      {/* Use Cases */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Use Cases</h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>
            <strong>Kubernetes Probes:</strong> Use as a readiness/liveness probe endpoint
          </li>
          <li>
            <strong>Monitoring:</strong> Integrate with Datadog, New Relic, or Prometheus
          </li>
          <li>
            <strong>Graceful Degradation:</strong> Check before showing feature flags UI
          </li>
          <li>
            <strong>Debug Connectivity:</strong> Verify API is reachable from your deployment
          </li>
        </ul>
      </div>

      {/* Code Example */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Code Example</h3>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// Server Component health check
import { ToggleBoxClient } from '@togglebox/sdk-nextjs'

// Disable caching for real-time health
export const dynamic = 'force-dynamic'

export default async function HealthPage() {
  const client = new ToggleBoxClient({
    platform: 'web',
    environment: 'production',
    apiUrl: process.env.TOGGLEBOX_API_URL!,
    cache: { enabled: false, ttl: 0 },
  })

  try {
    const health = await client.checkConnection()
    return (
      <div className="text-green-600">
        API is healthy - Uptime: {health.uptime}s
      </div>
    )
  } catch (error) {
    return (
      <div className="text-red-600">
        API is down: {error.message}
      </div>
    )
  } finally {
    // Always cleanup the client
    client.destroy()
  }
}

// API Route version (for monitoring services)
// app/api/health/route.ts
export async function GET() {
  const client = new ToggleBoxClient({ ... })

  try {
    const health = await client.checkConnection()
    return Response.json({ status: 'healthy', ...health })
  } catch (error) {
    return Response.json(
      { status: 'unhealthy', error: error.message },
      { status: 503 }
    )
  } finally {
    client.destroy()
  }
}`}
        </pre>
      </div>
    </div>
  )
}

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`
  }

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}m ${Math.round(seconds % 60)}s`
  }

  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return `${hours}h ${minutes % 60}m`
  }

  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}
