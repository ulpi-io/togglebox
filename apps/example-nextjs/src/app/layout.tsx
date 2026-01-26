import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import { Nav } from '@/components/nav'
import { Providers } from './providers'
import { getServerSideConfig } from '@togglebox/sdk-nextjs'
import './globals.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

export const metadata: Metadata = {
  title: 'ToggleBox Example - Next.js',
  description: 'Example application demonstrating ToggleBox SDK features',
}

/**
 * Root layout with SSR hydration.
 *
 * Server-side fetches config, flags, and experiments and passes them
 * to the ToggleBoxProvider for instant hydration. This eliminates the
 * loading spinner and provides immediate access to config data.
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side fetch for SSR hydration
  // This data is passed to the client provider to avoid a second fetch
  const { config, flags, experiments } = await getServerSideConfig(
    PLATFORM,
    ENVIRONMENT,
    API_URL
  )

  return (
    <html lang="en">
      <body className="antialiased">
        <Providers
          initialConfig={config?.config}
          initialFlags={flags}
          initialExperiments={experiments}
        >
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 bg-gray-50 p-8">
              {children}
            </main>
          </div>
          <Toaster position="bottom-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
