import { Suspense } from 'react'
import { getStaticConfig } from '@togglebox/sdk-nextjs'
import { ConfigViewer } from '@/components/config-viewer'
import { Loading } from '@/components/loading'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

// ISR: Revalidate every 60 seconds
// After this period, the next request triggers background regeneration
export const revalidate = 60

async function ISRConfigExample() {
  const { config } = await getStaticConfig(PLATFORM, ENVIRONMENT, API_URL)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Remote Config (ISR)</h3>
          <p className="text-sm text-gray-500">Fetched at build time, revalidates in background</p>
        </div>
        <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
          revalidate: 60
        </code>
      </div>
      {config ? (
        <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
      ) : (
        <div className="bg-gray-100 rounded-lg p-4 text-gray-500">
          No configuration available
        </div>
      )}
    </div>
  )
}

async function ISRFlagsExample() {
  const { flags } = await getStaticConfig(PLATFORM, ENVIRONMENT, API_URL)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Feature Flags (ISR)</h3>
          <p className="text-sm text-gray-500">Static at build, background refresh</p>
        </div>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
          {flags.length} flags
        </span>
      </div>
      {flags.length > 0 ? (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div key={flag.flagKey} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="font-medium text-gray-900">{flag.flagKey}</span>
                {flag.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{flag.description}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                flag.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {flag.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-4 text-gray-500">
          No feature flags configured
        </div>
      )}
    </div>
  )
}

async function ISRExperimentsExample() {
  const { experiments } = await getStaticConfig(PLATFORM, ENVIRONMENT, API_URL)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Experiments (ISR)</h3>
          <p className="text-sm text-gray-500">A/B tests fetched at build time</p>
        </div>
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
          {experiments.length} experiments
        </span>
      </div>
      {experiments.length > 0 ? (
        <div className="space-y-2">
          {experiments.map((exp) => (
            <div key={exp.experimentKey} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <span className="font-medium text-gray-900">{exp.experimentKey}</span>
                {exp.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{exp.description}</p>
                )}
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                exp.status === 'running' ? 'bg-green-100 text-green-700' :
                exp.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {exp.status || 'draft'}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-100 rounded-lg p-4 text-gray-500">
          No experiments configured
        </div>
      )}
    </div>
  )
}

export default function ISRPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">ISR Examples</h1>
        <p className="text-gray-500 mt-1">
          Incremental Static Regeneration with background revalidation
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">About ISR</h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>How it works:</strong> Page is statically generated at build time.
            After the revalidation period (60s), the next request triggers background regeneration.
          </p>
          <p>
            <strong>Benefits:</strong> Fast initial load (static HTML), eventually consistent data,
            reduced API calls, excellent for feature flags that change infrequently.
          </p>
          <p>
            <strong>Trade-off:</strong> Data may be up to <code className="px-1 bg-blue-100 rounded">revalidate</code> seconds stale.
            For real-time flags, use client-side polling instead.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Suspense fallback={<Loading />}>
          <ISRConfigExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <ISRFlagsExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <ISRExperimentsExample />
        </Suspense>
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Example</h2>
        <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// app/isr-page/page.tsx
import { getStaticConfig } from '@togglebox/sdk-nextjs'

// Revalidate every 60 seconds in background
export const revalidate = 60

export default async function Page() {
  const { config, flags, experiments } = await getStaticConfig(
    'web',
    'production',
    process.env.TOGGLEBOX_API_URL!
  )

  return (
    <div>
      <h1>Config Version: {config?.version}</h1>
      <p>Total Flags: {flags.length}</p>
      <p>Active Experiments: {experiments.filter(e => e.status === 'running').length}</p>

      {/* Feature flag check (static, no user context) */}
      {flags.find(f => f.flagKey === 'show-banner')?.enabled && (
        <Banner />
      )}
    </div>
  )
}

// Note: For user-specific flag evaluation, use client-side hooks
// ISR is best for flags that apply to all users equally`}
        </pre>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-yellow-800 mb-1">When to use ISR vs Client-Side</h3>
        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
          <li><strong>ISR:</strong> Global feature flags, marketing banners, site-wide settings</li>
          <li><strong>Client-Side:</strong> User-targeted flags, experiments with user context, real-time updates</li>
          <li><strong>SSR (no cache):</strong> When data must be fresh on every request</li>
        </ul>
      </div>
    </div>
  )
}
