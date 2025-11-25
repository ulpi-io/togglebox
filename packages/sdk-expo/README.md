# @togglebox/sdk-expo

Expo/React Native SDK for ToggleBox - Remote configuration and feature flag management with AsyncStorage persistence.

## Installation

```bash
npm install @togglebox/sdk-expo @react-native-async-storage/async-storage
# or
yarn add @togglebox/sdk-expo @react-native-async-storage/async-storage
# or
pnpm add @togglebox/sdk-expo @react-native-async-storage/async-storage
```

## Usage

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

function MainApp() {
  const { config, featureFlags, isEnabled } = useToggleBoxContext()

  const hasNewFeature = await isEnabled('new-ui')

  return (
    <View>
      <Text>Config: {JSON.stringify(config)}</Text>
      <Text>New UI: {hasNewFeature ? 'Enabled' : 'Disabled'}</Text>
    </View>
  )
}
```

### Cloud Multi-Tenant

```tsx
import { ToggleBoxProvider, useToggleBoxContext } from '@togglebox/sdk-expo'

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

## AsyncStorage Persistence

Enable offline support with AsyncStorage:

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
- Configuration is cached in AsyncStorage
- App works offline using cached data
- Fresh data is fetched in background when online
- Stale data is automatically purged after TTL expires

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

  /** Cache configuration */
  cache?: {
    enabled: boolean
    ttl: number
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Enable persistent storage with AsyncStorage */
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

### Feature Flags with User Context

```tsx
import { useToggleBoxContext } from '@togglebox/sdk-expo'
import { useAuth } from './auth'

function HomeScreen() {
  const { user } = useAuth()
  const { isEnabled, setContext } = useToggleBoxContext()

  useEffect(() => {
    if (user) {
      setContext({
        userId: user.id,
        userEmail: user.email,
        userPlan: user.plan,
      })
    }
  }, [user])

  const hasPremiumFeatures = await isEnabled('premium-features')

  return (
    <View>
      {hasPremiumFeatures && <PremiumContent />}
    </View>
  )
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
    return <ActivityIndicator />
  }

  if (error) {
    return <ErrorMessage error={error} />
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

## TypeScript

Full TypeScript support included:

```typescript
import type { ToggleBoxProviderProps, ToggleBoxContextValue } from '@togglebox/sdk-expo'
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
```

## Requirements

- Expo SDK 48+ or React Native 0.71+
- @react-native-async-storage/async-storage

## License

MIT
