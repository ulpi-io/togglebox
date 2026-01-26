import { Suspense } from 'react'
import { ToggleBoxClient, getServerSideConfig, getStaticConfig } from '@togglebox/sdk-nextjs'
import { ConfigViewer } from '@/components/config-viewer'
import { Loading } from '@/components/loading'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

// Server-side data fetching using SDK utilities - no caching (fresh on every request)
async function getConfigNoCache() {
  const { config } = await getServerSideConfig(PLATFORM, ENVIRONMENT, API_URL)
  return config
}

// Server-side data fetching using SDK utilities - static (build-time + ISR)
async function getConfigCached() {
  const { config } = await getStaticConfig(PLATFORM, ENVIRONMENT, API_URL)
  return config
}

// Server-side flag evaluation example using ToggleBoxClient
// Context (userId, country, language) should come from user profile/preferences, NOT auto-detected
async function evaluateFlagServerSide(userContext: { userId: string; country: string; language: string }) {
  const client = new ToggleBoxClient({
    platform: PLATFORM,
    environment: ENVIRONMENT,
    apiUrl: API_URL,
    cache: { enabled: false, ttl: 0 },
  })

  try {
    const isEnabled = await client.isFlagEnabled('new-feature', userContext)
    return { isEnabled, context: userContext }
  } finally {
    client.destroy()
  }
}

// Server Component using getServerSideConfig (no cache)
async function ServerSideConfigExample() {
  const config = await getConfigNoCache()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">getServerSideConfig()</h3>
          <p className="text-sm text-gray-500">Fresh data on every request using SDK</p>
        </div>
        <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
          no cache
        </code>
      </div>
      {config && (
        <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
      )}
    </div>
  )
}

// Server Component using getStaticConfig (cached/ISR)
async function StaticConfigExample() {
  const config = await getConfigCached()

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">getStaticConfig()</h3>
          <p className="text-sm text-gray-500">Cached for static generation / ISR</p>
        </div>
        <code className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
          cached
        </code>
      </div>
      {config && (
        <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
      )}
    </div>
  )
}

// Server Component showing flag evaluation with user-provided context
// IMPORTANT: Context (country, language) should come from user preferences, NOT auto-detected
// Users may use VPNs, so auto-detection is unreliable
async function FlagEvaluationExample() {
  // Example: Context from user profile/preferences (not auto-detected)
  const userContext = {
    userId: 'demo-user-123',
    country: 'US',        // From user profile settings
    language: 'en',       // From user locale preference
  }

  const { isEnabled, context } = await evaluateFlagServerSide(userContext)

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">ToggleBoxClient Flag Evaluation</h3>
          <p className="text-sm text-gray-500">Server-side flag evaluation with user-provided context</p>
        </div>
        <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
          isFlagEnabled()
        </code>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">User ID:</span>
          <code className="px-2 py-0.5 bg-gray-100 rounded text-sm">{context.userId}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Country (from user profile):</span>
          <code className="px-2 py-0.5 bg-gray-100 rounded text-sm">{context.country}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Language (from user preference):</span>
          <code className="px-2 py-0.5 bg-gray-100 rounded text-sm">{context.language}</code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Flag &quot;new-feature&quot;:</span>
          <span className={`px-2 py-0.5 rounded text-sm font-medium ${
            isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>
      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-xs text-yellow-800">
          <strong>Note:</strong> Country and language should come from user profile/preferences,
          not auto-detected from headers. Users may use VPNs, making geo-detection unreliable.
        </p>
      </div>
    </div>
  )
}

export default function ServerSidePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Server-Side Examples</h1>
        <p className="text-gray-500 mt-1">
          Using SDK utilities for server-side data fetching and flag evaluation
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">SDK Server Utilities</h2>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <strong>getServerSideConfig()</strong>: Fetch fresh config, flags, and experiments on every request.
              Use for dynamic server components that need real-time data.
            </div>
            <div>
              <strong>getStaticConfig()</strong>: Fetch data at build time or with ISR revalidation.
              Use for static generation with periodic updates.
            </div>
            <div>
              <strong>ToggleBoxClient</strong>: Direct client for server-side flag/experiment evaluation
              with full context support (userId, country, language).
            </div>
          </div>
        </div>

        <Suspense fallback={<Loading />}>
          <ServerSideConfigExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <StaticConfigExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <FlagEvaluationExample />
        </Suspense>
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Using SDK Server Functions</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// In a Server Component
import { getServerSideConfig, getStaticConfig } from '@togglebox/sdk-nextjs'

// Server-side fetch - fresh on every request
const { config, flags, experiments } = await getServerSideConfig(
  'web',           // platform
  'production',    // environment
  'https://api.example.com'  // apiUrl
)

// Static generation with ISR
const { config, flags, experiments } = await getStaticConfig(
  'web',
  'production',
  'https://api.example.com'
)`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Server-Side Flag Evaluation with User Context</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// Evaluate flags server-side with user-provided context
// IMPORTANT: Context should come from user profile, NOT auto-detected
// Users may use VPNs, making geo-detection unreliable
import { ToggleBoxClient } from '@togglebox/sdk-nextjs'

export default async function Page() {
  // Get context from user profile/session (NOT from headers)
  const user = await getUser()  // Your auth system

  const client = new ToggleBoxClient({
    platform: 'web',
    environment: 'production',
    apiUrl: process.env.TOGGLEBOX_URL!,
    cache: { enabled: false, ttl: 0 },
  })

  try {
    // Context from user preferences, not auto-detected
    const userContext = {
      userId: user?.id || 'anonymous',
      country: user?.profile?.country || 'US',  // From user settings
      language: user?.profile?.language || 'en', // From user locale preference
      plan: user?.subscription?.plan || 'free',
    }

    // Evaluate flag with user context
    const showPromo = await client.isFlagEnabled('promo-banner', userContext)

    // Get experiment variant
    const variant = await client.getVariant('checkout-test', userContext)

    return (
      <main>
        {showPromo && <PromoBanner />}
        <Checkout variant={variant?.variationKey} />
      </main>
    )
  } finally {
    client.destroy()
  }
}`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">SSR Hydration Pattern</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// layout.tsx (Server Component)
import { getServerSideConfig, ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export default async function RootLayout({ children }) {
  // Fetch on server
  const { config, flags, experiments } = await getServerSideConfig(
    'web',
    process.env.NODE_ENV === 'production' ? 'production' : 'staging',
    process.env.TOGGLEBOX_URL!
  )

  return (
    <html>
      <body>
        <ToggleBoxProvider
          platform="web"
          environment={process.env.NODE_ENV === 'production' ? 'production' : 'staging'}
          apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
          initialConfig={config}       // Hydrate with SSR data
          initialFlags={flags}         // No client-side fetch needed
          initialExperiments={experiments}
        >
          {children}
        </ToggleBoxProvider>
      </body>
    </html>
  )
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
