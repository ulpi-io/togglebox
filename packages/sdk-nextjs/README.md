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

## Quick Start

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
```

### Cloud Multi-Tenant

```tsx
'use client'

import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

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

## Configs vs Feature Flags

ToggleBox provides two complementary systems:

### Configs: Static Application Settings

Configs are **versioned, immutable snapshots** of application settings:

```tsx
function AppSettings() {
  const { config, isLoading } = useToggleBoxContext()

  if (isLoading) return <Spinner />

  return (
    <div style={{ backgroundColor: config?.theme?.primaryColor }}>
      <h1>{config?.appName}</h1>
      <p>API: {config?.apiBaseUrl}</p>
      <p>Max upload: {config?.limits?.maxUploadSize} bytes</p>
    </div>
  )
}
```

### Feature Flags: Dynamic On/Off Switches

Feature flags are **mutable state** with targeting rules:

```tsx
function Dashboard() {
  const { isEnabled, setContext } = useToggleBoxContext()
  const { user } = useAuth()
  const [showNewUI, setShowNewUI] = useState(false)

  useEffect(() => {
    // Set user context for targeted rollouts
    setContext({
      userId: user.id,
      userEmail: user.email,
      plan: user.subscription.plan,
    })
  }, [user])

  useEffect(() => {
    // Check feature flag with context
    isEnabled('new-dashboard').then(setShowNewUI)
  }, [])

  return showNewUI ? <NewDashboard /> : <LegacyDashboard />
}
```

## Version-Specific Configs

Pin to a specific config version for controlled rollouts:

```tsx
// Pin to a specific config version
<ToggleBoxProvider
  platform="web"
  environment="production"
  tenantSubdomain="acme"
  configVersion="2.0.0"  // Always fetches this version
>
  {children}
</ToggleBoxProvider>
```

For SSR with version-specific configs:

```tsx
import { ToggleBoxClient } from '@togglebox/sdk'
import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export default async function Page() {
  const client = new ToggleBoxClient({
    platform: 'web',
    environment: 'production',
    tenantSubdomain: 'acme',
  })

  // Fetch a specific version on the server
  const config = await client.getConfigVersion('2.0.0')
  const flags = await client.getFeatureFlags()

  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      tenantSubdomain="acme"
      configVersion="2.0.0"
      initialConfig={config}
      initialFlags={flags}
    >
      <ClientComponent />
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

  /**
   * Config version to fetch (default: 'stable')
   * - 'stable': Latest stable version
   * - 'latest': Latest version (may be unstable)
   * - '1.2.3': Specific version label
   */
  configVersion?: string

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

### Using Config Values

```tsx
function ThemeWrapper({ children }) {
  const { config, isLoading } = useToggleBoxContext()

  if (isLoading) return <LoadingScreen />

  const theme = config?.theme || defaultTheme

  return (
    <div
      style={{
        '--primary-color': theme.primaryColor,
        '--secondary-color': theme.secondaryColor,
        '--font-family': theme.fontFamily,
      }}
    >
      {children}
    </div>
  )
}
```

### Feature Flag with User Context

```tsx
function UserProfile({ userId, userEmail }) {
  const { isEnabled, setContext } = useToggleBoxContext()
  const [hasPremium, setHasPremium] = useState(false)

  useEffect(() => {
    setContext({ userId, userEmail })
  }, [userId, userEmail])

  useEffect(() => {
    isEnabled('premium-features').then(setHasPremium)
  }, [userId])

  return (
    <div>
      {hasPremium && <PremiumBadge />}
      <ProfileContent />
    </div>
  )
}
```

### Percentage-Based Rollout

```tsx
function CheckoutPage() {
  const { isEnabled } = useToggleBoxContext()
  const { user } = useAuth()
  const [useNewCheckout, setUseNewCheckout] = useState(false)

  useEffect(() => {
    // Flag configured with 25% rollout in dashboard
    isEnabled('new-checkout', { userId: user.id }).then(setUseNewCheckout)
  }, [user.id])

  return useNewCheckout ? <NewCheckout /> : <LegacyCheckout />
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
function ConfigLoader({ children }) {
  const { config, isLoading, error } = useToggleBoxContext()

  if (isLoading && !config) {
    return <LoadingScreen />
  }

  if (error && !config) {
    return (
      <ErrorScreen
        message="Failed to load configuration"
        onRetry={() => window.location.reload()}
      />
    )
  }

  return children
}
```

### Combining Configs and Flags

```tsx
function FeatureCard({ featureName }) {
  const { config, isEnabled } = useToggleBoxContext()
  const [isFeatureEnabled, setIsFeatureEnabled] = useState(false)

  useEffect(() => {
    isEnabled(featureName).then(setIsFeatureEnabled)
  }, [featureName])

  // Use config for static settings, flags for dynamic on/off
  const featureConfig = config?.features?.[featureName] || {}

  if (!isFeatureEnabled) return null

  return (
    <Card
      title={featureConfig.title}
      description={featureConfig.description}
      icon={featureConfig.icon}
    />
  )
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
