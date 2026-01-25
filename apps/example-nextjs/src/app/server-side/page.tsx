import { Suspense } from 'react'
import { getServerSideConfig, getStaticConfig } from '@togglebox/sdk-nextjs'
import { ConfigViewer } from '@/components/config-viewer'
import { Loading } from '@/components/loading'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

// Server-side data fetching - no caching (fresh on every request)
async function getConfigNoCache() {
  const response = await fetch(
    `${API_URL}/platforms/${PLATFORM}/environments/${ENVIRONMENT}/versions/latest/stable`,
    { cache: 'no-store' }
  )
  if (!response.ok) throw new Error('Failed to fetch config')
  const data = await response.json()
  return data.data
}

// Server-side data fetching - with caching (revalidate every 60 seconds)
async function getConfigCached() {
  const response = await fetch(
    `${API_URL}/platforms/${PLATFORM}/environments/${ENVIRONMENT}/versions/latest/stable`,
    { next: { revalidate: 60 } }
  )
  if (!response.ok) throw new Error('Failed to fetch config')
  const data = await response.json()
  return data.data
}

// Server-side data fetching - static (build-time only)
async function getConfigStatic() {
  const response = await fetch(
    `${API_URL}/platforms/${PLATFORM}/environments/${ENVIRONMENT}/versions/latest/stable`,
    { cache: 'force-cache' }
  )
  if (!response.ok) throw new Error('Failed to fetch config')
  const data = await response.json()
  return data.data
}

// Server Component for no-cache example
async function NoCacheExample() {
  const startTime = performance.now()
  const config = await getConfigNoCache()
  const duration = performance.now() - startTime

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">No Cache</h3>
          <p className="text-sm text-gray-500">Fresh data on every request</p>
        </div>
        <code className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm">
          cache: &apos;no-store&apos;
        </code>
      </div>
      <div className="text-sm text-gray-500 mb-4">
        Fetch time: <span className="font-mono">{duration.toFixed(2)}ms</span>
      </div>
      <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
    </div>
  )
}

// Server Component for cached example
async function CachedExample() {
  const startTime = performance.now()
  const config = await getConfigCached()
  const duration = performance.now() - startTime

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Time-Based Revalidation</h3>
          <p className="text-sm text-gray-500">Cached for 60 seconds, then revalidated</p>
        </div>
        <code className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-sm">
          revalidate: 60
        </code>
      </div>
      <div className="text-sm text-gray-500 mb-4">
        Fetch time: <span className="font-mono">{duration.toFixed(2)}ms</span>
        {duration < 10 && <span className="ml-2 text-green-600">(cached)</span>}
      </div>
      <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
    </div>
  )
}

// Server Component for static example
async function StaticExample() {
  const startTime = performance.now()
  const config = await getConfigStatic()
  const duration = performance.now() - startTime

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Force Cache (Static)</h3>
          <p className="text-sm text-gray-500">Cached indefinitely until rebuild</p>
        </div>
        <code className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
          cache: &apos;force-cache&apos;
        </code>
      </div>
      <div className="text-sm text-gray-500 mb-4">
        Fetch time: <span className="font-mono">{duration.toFixed(2)}ms</span>
        {duration < 5 && <span className="ml-2 text-green-600">(cached)</span>}
      </div>
      <ConfigViewer config={config.config} version={config.version} isStable={config.isStable} />
    </div>
  )
}

export default function ServerSidePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Server-Side Examples</h1>
        <p className="text-gray-500 mt-1">
          Different caching strategies for server-side data fetching in Next.js
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">Caching Strategies</h2>
          <div className="space-y-4 text-sm text-blue-800">
            <div>
              <strong>No Cache</strong> (<code>cache: &apos;no-store&apos;</code>): Always fetch fresh data.
              Use for real-time data that changes frequently.
            </div>
            <div>
              <strong>Time-Based Revalidation</strong> (<code>next: &#123; revalidate: 60 &#125;</code>):
              Cache for a specified time, then revalidate. Balances freshness and performance.
            </div>
            <div>
              <strong>Force Cache</strong> (<code>cache: &apos;force-cache&apos;</code>):
              Cache indefinitely. Use for static data that rarely changes. Requires rebuild to update.
            </div>
          </div>
        </div>

        <Suspense fallback={<Loading />}>
          <NoCacheExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <CachedExample />
        </Suspense>

        <Suspense fallback={<Loading />}>
          <StaticExample />
        </Suspense>
      </div>

      <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Code Examples</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Using SDK Server Functions</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// In a Server Component
import { getServerSideConfig } from '@togglebox/sdk-nextjs'

// Server-side fetch with no caching
const config = await getServerSideConfig({
  platform: 'web',
  environment: 'production',
  apiUrl: 'http://localhost:3000/api/v1',
})

// For static generation (build-time)
import { getStaticConfig } from '@togglebox/sdk-nextjs'

const staticConfig = await getStaticConfig({
  platform: 'web',
  environment: 'production',
  apiUrl: 'http://localhost:3000/api/v1',
})`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Native fetch with Caching</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// No caching - fresh on every request
const response = await fetch(url, { cache: 'no-store' })

// Time-based revalidation (ISR pattern)
const response = await fetch(url, {
  next: { revalidate: 60 } // Revalidate every 60 seconds
})

// Static caching - cache until rebuild
const response = await fetch(url, { cache: 'force-cache' })`}
            </pre>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Passing to Client Components</h3>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-auto text-sm">
{`// page.tsx (Server Component)
import { getServerSideConfig } from '@togglebox/sdk-nextjs'
import { ClientComponent } from './client-component'

export default async function Page() {
  const config = await getServerSideConfig({...})

  // Pass server-fetched data to client component
  return <ClientComponent initialConfig={config} />
}

// client-component.tsx
'use client'
import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export function ClientComponent({ initialConfig }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl="..."
      initialConfig={initialConfig} // Hydrate with SSR data
    >
      {children}
    </ToggleBoxProvider>
  )
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
