# @togglebox/sdk-nextjs

Next.js SDK for ToggleBox - Remote configuration and feature flag management with React hooks.

## Installation

```bash
npm install @togglebox/sdk-nextjs
# or
yarn add @togglebox/sdk-nextjs
# or
pnpm add @togglebox/sdk-nextjs
```

## Usage

### Open Source Self-Hosted

```tsx
'use client'

import { ToggleBoxProvider, useToggleBoxContext } from '@togglebox/sdk-nextjs'

export default function App({ children }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl="https://your-domain.com"
    >
      {children}
    </ToggleBoxProvider>
  )
}

function MyComponent() {
  const { config, featureFlags, isEnabled } = useToggleBoxContext()

  const hasNewFeature = await isEnabled('new-dashboard')

  return (
    <div>
      <h1>App Config: {JSON.stringify(config)}</h1>
      <p>New Dashboard: {hasNewFeature ? 'Enabled' : 'Disabled'}</p>
    </div>
  )
}
```

### Cloud Multi-Tenant

```tsx
'use client'

import { ToggleBoxProvider, useToggleBoxContext } from '@togglebox/sdk-nextjs'

export default function App({ children }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      tenantSubdomain="acme" // Connects to https://acme.togglebox.io
    >
      {children}
    </ToggleBoxProvider>
  )
}
```

## Server-Side Rendering (SSR)

Pre-fetch configuration on the server for instant hydration:

```tsx
import { ToggleBoxClient } from '@togglebox/sdk'
import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export default async function Page() {
  // Fetch on server
  const client = new ToggleBoxClient({
    platform: 'web',
    environment: 'production',
    tenantSubdomain: 'acme',
  })

  const [config, flags] = await Promise.all([
    client.getConfig(),
    client.getFeatureFlags(),
  ])

  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      tenantSubdomain="acme"
      initialConfig={config}
      initialFlags={flags}
    >
      <ClientComponent />
    </ToggleBoxProvider>
  )
}
```

## Configuration Options

```typescript
interface ToggleBoxProviderProps {
  /** Platform name (e.g., 'web', 'mobile') */
  platform: string

  /** Environment name (e.g., 'production', 'staging') */
  environment: string

  /**
   * API base URL (for open source self-hosted)
   * Use tenantSubdomain for cloud deployments
   */
  apiUrl?: string

  /**
   * Tenant subdomain for cloud deployments
   * Automatically constructs apiUrl as https://{tenantSubdomain}.togglebox.io
   * Example: 'acme' → https://acme.togglebox.io
   */
  tenantSubdomain?: string

  /** Cache configuration */
  cache?: {
    enabled: boolean
    ttl: number
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Initial config for SSR hydration */
  initialConfig?: Config

  /** Initial feature flags for SSR hydration */
  initialFlags?: FeatureFlag[]

  /** Children components */
  children: React.ReactNode
}
```

**Note:** You must provide either `apiUrl` OR `tenantSubdomain`, not both.

## React Hook API

```tsx
const {
  config,           // Current configuration object
  featureFlags,     // Array of feature flags
  isLoading,        // Loading state
  error,            // Error state
  refresh,          // Manually refresh data
  isEnabled,        // Check if flag is enabled
  setContext,       // Set evaluation context
} = useToggleBoxContext()
```

## Examples

### Auto-Refresh Polling

```tsx
<ToggleBoxProvider
  platform="web"
  environment="production"
  tenantSubdomain="acme"
  pollingInterval={60000} // Poll every minute
>
  {children}
</ToggleBoxProvider>
```

### Feature Flag with Context

```tsx
function UserProfile({ userId, userEmail }) {
  const { isEnabled, setContext } = useToggleBoxContext()

  useEffect(() => {
    setContext({ userId, userEmail })
  }, [userId, userEmail])

  const hasPremium = await isEnabled('premium-features')

  return <div>{hasPremium && <PremiumBadge />}</div>
}
```

### Manual Refresh

```tsx
function RefreshButton() {
  const { refresh, isLoading } = useToggleBoxContext()

  return (
    <button onClick={refresh} disabled={isLoading}>
      {isLoading ? 'Refreshing...' : 'Refresh Config'}
    </button>
  )
}
```

### Error Handling

```tsx
function ErrorDisplay() {
  const { error } = useToggleBoxContext()

  if (error) {
    return <div>Error loading config: {error.message}</div>
  }

  return null
}
```

## TypeScript

This SDK includes full TypeScript support:

```typescript
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from '@togglebox/sdk-nextjs'
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
```

## Requirements

- Next.js 13+ (App Router or Pages Router)
- React 18+

## License

MIT
