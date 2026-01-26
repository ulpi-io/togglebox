'use client'

import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'
import type { Config } from '@togglebox/sdk-nextjs'
import type { Flag, Experiment } from '@togglebox/sdk-nextjs'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

interface ProvidersProps {
  children: React.ReactNode
  /** Initial config for SSR hydration (avoids client-side fetch on mount) */
  initialConfig?: Config | null
  /** Initial flags for SSR hydration */
  initialFlags?: Flag[]
  /** Initial experiments for SSR hydration */
  initialExperiments?: Experiment[]
}

/**
 * ToggleBox Provider wrapper with SSR hydration support.
 *
 * When initialConfig/initialFlags/initialExperiments are provided,
 * the provider hydrates immediately without a client-side fetch,
 * providing instant access to config data.
 */
export function Providers({
  children,
  initialConfig,
  initialFlags,
  initialExperiments,
}: ProvidersProps) {
  return (
    <ToggleBoxProvider
      platform={PLATFORM}
      environment={ENVIRONMENT}
      apiUrl={API_URL}
      pollingInterval={30000}
      configVersion="stable"
      initialConfig={initialConfig ?? undefined}
      initialFlags={initialFlags}
      initialExperiments={initialExperiments}
    >
      {children}
    </ToggleBoxProvider>
  )
}
