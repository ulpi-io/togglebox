# @togglebox/sdk-expo

Expo/React Native SDK for ToggleBox - Remote configuration and feature flag management with MMKV persistence.

## Installation

```bash
npm install @togglebox/sdk-expo react-native-mmkv
# or
yarn add @togglebox/sdk-expo react-native-mmkv
# or
pnpm add @togglebox/sdk-expo react-native-mmkv
```

> **Note:** `react-native-mmkv` is only required if you use the `persistToStorage` feature. The SDK works without it for basic usage.

### Expo Setup

For Expo projects, you'll need to use a development build:

```bash
npx expo install react-native-mmkv
npx expo prebuild
```

## Quick Start

### Open Source Self-Hosted

```tsx
import { ToggleBoxProvider, useToggleBoxContext } from '@togglebox/sdk-expo'

export default function App() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-domain.com"
    >
      <MainApp />
    </ToggleBoxProvider>
  )
}
```

### Cloud Multi-Tenant

```tsx
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function App() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      tenantSubdomain="acme" // Connects to https://acme.togglebox.io
    >
      <MainApp />
    </ToggleBoxProvider>
  )
}
```

## Configs vs Feature Flags

ToggleBox provides two complementary systems:

### Configs: Static Application Settings

Configs are **versioned, immutable snapshots** of application settings:

```tsx
function SettingsScreen() {
  const { config, isLoading } = useToggleBoxContext()

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      <Text style={{ color: config?.theme?.primaryColor }}>
        {config?.appName}
      </Text>
      <Text>API Endpoint: {config?.apiBaseUrl}</Text>
      <Text>Max Upload: {config?.limits?.maxUploadSize} bytes</Text>
    </View>
  )
}
```

### Feature Flags: Dynamic On/Off Switches

Feature flags are **mutable state** with targeting rules:

```tsx
function HomeScreen() {
  const { isEnabled, setContext } = useToggleBoxContext()
  const { user } = useAuth()
  const [showNewUI, setShowNewUI] = useState(false)

  useEffect(() => {
    // Set user context for targeted rollouts
    setContext({
      userId: user.id,
      country: user.country,
      plan: user.subscription.plan,
      platformVersion: '2.1.0', // Your app version
    })
  }, [user])

  useEffect(() => {
    // Check feature flag
    isEnabled('new-home-screen').then(setShowNewUI)
  }, [])

  return showNewUI ? <NewHomeScreen /> : <LegacyHomeScreen />
}
```

## Version-Specific Configs

Pin to a specific config version for controlled rollouts:

```tsx
// Pin to a specific config version
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  tenantSubdomain="acme"
  configVersion="2.0.0"  // Always fetches this version
>
  {children}
</ToggleBoxProvider>
```

This is useful for:
- Controlled rollouts of new configuration
- Rollback to a known-good version
- A/B testing different configurations

## Offline Persistence with MMKV

Enable offline support with high-performance MMKV storage:

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  tenantSubdomain="acme"
  persistToStorage={true}
  storageTTL={86400000} // 24 hours
>
  {children}
</ToggleBoxProvider>
```

With persistence enabled:
- Configuration is cached in MMKV (high-performance native storage)
- App works offline using cached data
- Fresh data is fetched in background when online
- Stale data is automatically purged after TTL expires

### Why MMKV over AsyncStorage?

We use [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) instead of AsyncStorage for several reasons:

| Feature | MMKV | AsyncStorage |
|---------|------|--------------|
| Performance | ~30x faster | Slow |
| API | Synchronous | Async only |
| Reliability | Battle-tested (WeChat) | Known data loss issues |
| Size limit | No practical limit | 6MB on Android |

## Configuration Options

```typescript
interface ToggleBoxProviderProps {
  /** Platform name (e.g., 'mobile', 'ios', 'android') */
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

  /** Enable persistent storage with MMKV */
  persistToStorage?: boolean

  /** Storage TTL in milliseconds (default: 24 hours) */
  storageTTL?: number

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

### Auto-Refresh with Persistence

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  tenantSubdomain="acme"
  pollingInterval={300000} // Poll every 5 minutes
  persistToStorage={true}
  storageTTL={86400000} // 24 hours
>
  {children}
</ToggleBoxProvider>
```

### Using Config Values

```tsx
function AppTheme({ children }) {
  const { config, isLoading } = useToggleBoxContext()

  if (isLoading && !config) return <SplashScreen />

  const theme = config?.theme || defaultTheme

  return (
    <ThemeProvider
      value={{
        colors: {
          primary: theme.primaryColor,
          secondary: theme.secondaryColor,
        },
        fonts: {
          regular: theme.fontFamily,
        },
      }}
    >
      {children}
    </ThemeProvider>
  )
}
```

### Feature Flags with User Context

```tsx
import { useToggleBoxContext } from '@togglebox/sdk-expo'
import { useAuth } from './auth'

function HomeScreen() {
  const { user } = useAuth()
  const { isEnabled, setContext } = useToggleBoxContext()
  const [hasPremiumFeatures, setHasPremiumFeatures] = useState(false)

  useEffect(() => {
    if (user) {
      setContext({
        userId: user.id,
        country: user.country,
        language: user.language,
        platformVersion: '2.1.0', // Your app version
      })
    }
  }, [user])

  useEffect(() => {
    isEnabled('premium-features').then(setHasPremiumFeatures)
  }, [user?.id])

  return (
    <View>
      {hasPremiumFeatures && <PremiumContent />}
      <StandardContent />
    </View>
  )
}
```

### Platform Version Targeting

Target specific app versions with feature flags:

```tsx
// Set your app version in the context
setContext({
  userId: user.id,
  platformVersion: '2.1.0', // Your app version from package.json or app.json
})

// Create a flag in the dashboard with:
// - rolloutType: 'targeted'
// - targetPlatformVersions: ['>=2.0.0', '<3.0.0']
//
// This flag will only be enabled for app versions 2.x.x
```

### Percentage-Based Rollout

```tsx
function CheckoutScreen() {
  const { isEnabled } = useToggleBoxContext()
  const { user } = useAuth()
  const [useNewCheckout, setUseNewCheckout] = useState(false)

  useEffect(() => {
    // Flag configured with 25% rollout in dashboard
    // userId is used for consistent hashing (same user always gets same result)
    isEnabled('new-checkout', { userId: user.id }).then(setUseNewCheckout)
  }, [user.id])

  return useNewCheckout ? <NewCheckout /> : <LegacyCheckout />
}
```

### Pull-to-Refresh

```tsx
import { RefreshControl, ScrollView } from 'react-native'
import { useToggleBoxContext } from '@togglebox/sdk-expo'

function MyScreen() {
  const { refresh, isLoading } = useToggleBoxContext()

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={isLoading}
          onRefresh={refresh}
        />
      }
    >
      <Content />
    </ScrollView>
  )
}
```

### Loading State

```tsx
function LoadingExample() {
  const { config, isLoading, error } = useToggleBoxContext()

  if (isLoading && !config) {
    return <ActivityIndicator size="large" />
  }

  if (error && !config) {
    return (
      <View>
        <Text>Error: {error.message}</Text>
        <Button title="Retry" onPress={() => refresh()} />
      </View>
    )
  }

  return <ConfigDisplay config={config} />
}
```

### Offline Support

```tsx
import NetInfo from '@react-native-community/netinfo'
import { useToggleBoxContext } from '@togglebox/sdk-expo'

function OfflineIndicator() {
  const { config } = useToggleBoxContext()
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false)
    })
    return unsubscribe
  }, [])

  return (
    <View>
      {!isOnline && config && (
        <Banner>Using cached configuration (offline)</Banner>
      )}
    </View>
  )
}
```

### Combining Configs and Flags

```tsx
function FeatureSection() {
  const { config, isEnabled } = useToggleBoxContext()
  const [features, setFeatures] = useState({})

  useEffect(() => {
    // Check multiple flags
    Promise.all([
      isEnabled('dark-mode'),
      isEnabled('beta-features'),
      isEnabled('premium-content'),
    ]).then(([darkMode, beta, premium]) => {
      setFeatures({ darkMode, beta, premium })
    })
  }, [])

  // Use config for static settings
  const featureConfig = config?.features || {}

  return (
    <View>
      {features.darkMode && (
        <FeatureCard
          title={featureConfig.darkMode?.title || 'Dark Mode'}
          icon="moon"
        />
      )}
      {features.beta && (
        <FeatureCard
          title={featureConfig.beta?.title || 'Beta Features'}
          icon="flask"
        />
      )}
    </View>
  )
}
```

## TypeScript

Full TypeScript support included:

```typescript
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from '@togglebox/sdk-expo'
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
```

## Requirements

- Expo SDK 48+ or React Native 0.71+
- react-native-mmkv ^2.0.0 or ^3.0.0 (only if using `persistToStorage`)

## Migrating from AsyncStorage

If you were using an older version with AsyncStorage:

1. Update the SDK: `npm install @togglebox/sdk-expo@latest`
2. Install MMKV: `npm install react-native-mmkv`
3. For Expo: Run `npx expo prebuild` to generate native code
4. Remove AsyncStorage if not used elsewhere: `npm uninstall @react-native-async-storage/async-storage`

Your cached data will be empty after migration (MMKV uses a different storage location), but fresh data will be fetched automatically on the next app launch.

## License

MIT
