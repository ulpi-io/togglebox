'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useFlag, useToggleBox, ToggleBoxClient } from '@togglebox/sdk-nextjs'
import { EvaluateForm } from '@/components/evaluate-form'
import { Loading } from '@/components/loading'
import { toggleFlag, hasApiKey } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'
const DEFAULT_USER_ID = process.env.NEXT_PUBLIC_USER_ID || 'demo-user-123'

export default function FlagDetailPage() {
  const params = useParams()
  const router = useRouter()
  const flagKey = params.flagKey as string
  const { flag, isLoading } = useFlag(flagKey)
  const { refresh } = useToggleBox()
  const canManage = hasApiKey()

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

  const handleEvaluate = async (context: {
    userId: string
    country: string
    language: string
  }) => {
    if (!clientRef.current) return

    setIsEvaluating(true)
    try {
      const result = await clientRef.current.getFlag(flagKey, context)
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
      toast.error(err instanceof Error ? err.message : 'Failed to evaluate flag')
    } finally {
      setIsEvaluating(false)
    }
  }

  const handleToggle = async () => {
    if (!flag) return
    setIsToggling(true)
    try {
      await toggleFlag(PLATFORM, ENVIRONMENT, flagKey, !flag.enabled)
      toast.success(`Flag ${!flag.enabled ? 'enabled' : 'disabled'}`)
      await refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to toggle flag')
    } finally {
      setIsToggling(false)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (!flag) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Flag Not Found</h2>
        <p className="text-red-600 mb-4">The flag "{flagKey}" does not exist.</p>
        <button
          onClick={() => router.push('/flags')}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Back to Flags
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <button
          onClick={() => router.push('/flags')}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          &larr; Back to Flags
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{flag.flagKey}</h1>
            {flag.description && (
              <p className="text-gray-500 mt-1">{flag.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                flag.enabled
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {flag.enabled ? 'Enabled' : 'Disabled'}
            </span>
            {canManage && (
              <button
                onClick={handleToggle}
                disabled={isToggling}
                className={`px-4 py-2 rounded text-sm font-medium ${
                  flag.enabled
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                } disabled:opacity-50`}
              >
                {isToggling ? 'Updating...' : flag.enabled ? 'Disable' : 'Enable'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Flag Configuration</h2>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Value A (Default)</dt>
              <dd className="mt-1">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {String(flag.valueA)}
                </code>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">Value B (Alternate)</dt>
              <dd className="mt-1">
                <code className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {String(flag.valueB)}
                </code>
              </dd>
            </div>

            {flag.rolloutEnabled && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Rollout Percentage</dt>
                <dd className="mt-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-600"
                        style={{ width: `${flag.rolloutPercentageA ?? 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600">{flag.rolloutPercentageA ?? 100}%</span>
                  </div>
                </dd>
              </div>
            )}

            {flag.targeting?.countries && flag.targeting.countries.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Targeting Rules</dt>
                <dd className="mt-2 space-y-2">
                  {flag.targeting.countries.map((rule, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 bg-gray-50 rounded text-sm"
                    >
                      <span className="font-medium">{rule.country}</span>
                      <span className="text-gray-500"> → </span>
                      <span>Serve Value {rule.serveValue}</span>
                    </div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        <EvaluateForm
          defaultUserId={DEFAULT_USER_ID}
          onEvaluate={handleEvaluate}
          isLoading={isEvaluating}
          result={evaluationResult}
        />
      </div>
    </div>
  )
}
