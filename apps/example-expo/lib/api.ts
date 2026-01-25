/**
 * API client helpers for internal endpoints that require authentication.
 * The SDK handles public endpoints, but toggle/start/pause actions
 * require API key authentication.
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const API_KEY = process.env.EXPO_PUBLIC_API_KEY

/**
 * Check if API key is configured for internal actions
 */
export function hasApiKey(): boolean {
  return !!API_KEY
}

/**
 * Fetch wrapper for internal endpoints (requires API key)
 */
export async function internalFetch(
  path: string,
  options?: RequestInit
): Promise<Response> {
  if (!API_KEY) {
    throw new Error('API key required for internal actions. Set EXPO_PUBLIC_API_KEY.')
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `Request failed with status ${response.status}`)
  }

  return response
}

/**
 * Toggle a feature flag's enabled state
 */
export async function toggleFlag(
  platform: string,
  environment: string,
  flagKey: string,
  enabled: boolean
): Promise<void> {
  await internalFetch(
    `/internal/platforms/${platform}/environments/${environment}/flags/${flagKey}/toggle`,
    {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    }
  )
}

/**
 * Start an experiment
 */
export async function startExperiment(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<void> {
  await internalFetch(
    `/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/start`,
    { method: 'POST' }
  )
}

/**
 * Pause an experiment
 */
export async function pauseExperiment(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<void> {
  await internalFetch(
    `/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/pause`,
    { method: 'POST' }
  )
}

/**
 * Complete an experiment
 */
export async function completeExperiment(
  platform: string,
  environment: string,
  experimentKey: string
): Promise<void> {
  await internalFetch(
    `/internal/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/complete`,
    { method: 'POST' }
  )
}

/**
 * Get all config versions
 */
export async function getConfigVersions(
  platform: string,
  environment: string
): Promise<{ data: Array<{ version: string; isStable: boolean; createdAt: string }> }> {
  const response = await fetch(
    `${API_URL}/platforms/${platform}/environments/${environment}/versions`
  )
  if (!response.ok) {
    throw new Error('Failed to fetch config versions')
  }
  return response.json()
}

/**
 * Get a specific config version
 */
export async function getConfigVersion(
  platform: string,
  environment: string,
  version: string
): Promise<{ data: { version: string; config: Record<string, unknown>; isStable: boolean } }> {
  const response = await fetch(
    `${API_URL}/platforms/${platform}/environments/${environment}/versions/${version}`
  )
  if (!response.ok) {
    throw new Error('Failed to fetch config version')
  }
  return response.json()
}

/**
 * Send batch stats events
 */
export async function sendStatsEvents(
  platform: string,
  environment: string,
  events: Array<{
    eventType: string
    eventName: string
    userId: string
    properties?: Record<string, unknown>
    timestamp?: string
  }>
): Promise<void> {
  const response = await fetch(
    `${API_URL}/platforms/${platform}/environments/${environment}/stats/events`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    }
  )
  if (!response.ok) {
    throw new Error('Failed to send stats events')
  }
}

/**
 * Evaluate a flag with context
 */
export async function evaluateFlag(
  platform: string,
  environment: string,
  flagKey: string,
  context: { userId?: string; country?: string; language?: string }
): Promise<{ data: { enabled: boolean; value: string; reason: string } }> {
  const params = new URLSearchParams()
  if (context.userId) params.set('userId', context.userId)
  if (context.country) params.set('country', context.country)
  if (context.language) params.set('language', context.language)

  const response = await fetch(
    `${API_URL}/platforms/${platform}/environments/${environment}/flags/${flagKey}/evaluate?${params}`
  )
  if (!response.ok) {
    throw new Error('Failed to evaluate flag')
  }
  return response.json()
}

/**
 * Assign experiment variation
 */
export async function assignExperimentVariation(
  platform: string,
  environment: string,
  experimentKey: string,
  userId: string
): Promise<{ data: { variationKey: string; variationName: string } }> {
  const response = await fetch(
    `${API_URL}/platforms/${platform}/environments/${environment}/experiments/${experimentKey}/assign?userId=${encodeURIComponent(userId)}`
  )
  if (!response.ok) {
    throw new Error('Failed to assign experiment variation')
  }
  return response.json()
}
