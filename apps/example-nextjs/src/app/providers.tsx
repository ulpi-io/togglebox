'use client'

import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
const PLATFORM = process.env.NEXT_PUBLIC_PLATFORM || 'web'
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || 'staging'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToggleBoxProvider
      platform={PLATFORM}
      environment={ENVIRONMENT}
      apiUrl={API_URL}
      pollingInterval={30000}
      configVersion="stable"
    >
      {children}
    </ToggleBoxProvider>
  )
}
