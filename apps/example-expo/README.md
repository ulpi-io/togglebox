# ToggleBox Expo Example App

A comprehensive "kitchen sink" demo showing how to integrate the ToggleBox SDK into Expo/React Native applications. Every example is **copy-paste ready** with working code you can use directly in your projects.

---

## Overview

This example app demonstrates all three tiers of ToggleBox:

| Tier | Feature | Use Case |
|------|---------|----------|
| **Tier 1** | Remote Configs | Dynamic settings, themes, API URLs |
| **Tier 2** | Feature Flags | Ship code when ready, release when you want |
| **Tier 3** | Experiments | A/B tests with variant assignment |

Plus advanced features like **offline persistence**, **polling**, and **error handling**.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.x
- Expo CLI or Expo Go app
- A running ToggleBox API (local or hosted)

### Running Locally

```bash
# From the monorepo root
cd togglebox

# Install dependencies
pnpm install

# Build SDK packages
pnpm build:packages

# Start the example app
pnpm dev:example-expo
```

Scan the QR code with Expo Go or press `i` for iOS simulator / `a` for Android emulator.

### Environment Variables

Create a `.env` file in `apps/example-expo/`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_PLATFORM=mobile
EXPO_PUBLIC_ENVIRONMENT=development
EXPO_PUBLIC_API_KEY=your-api-key  # Required if API has auth enabled
```

---

## App Structure

```
app/
├── index.tsx                   # Homepage with example index
├── _layout.tsx                 # Root layout with ToggleBoxProvider
├── quick/                      # Quick Start examples (4)
│   ├── provider-setup.tsx      # How to set up the provider
│   ├── remote-config.tsx       # Fetch remote configuration
│   ├── feature-flags.tsx       # Check feature flags
│   └── experiments.tsx         # Get experiment variants
├── advanced/                   # Advanced examples (6)
│   ├── conversion-tracking.tsx # Track experiment conversions
│   ├── offline-storage.tsx     # MMKV persistence for offline
│   ├── polling-refresh.tsx     # Auto-refresh & pull-to-refresh
│   ├── health-check.tsx        # API health monitoring
│   ├── error-handling.tsx      # Error states & offline fallback
│   └── full-integration.tsx    # Complete real-world example
├── playground/                 # Interactive testing
│   ├── flags.tsx               # Interactive flag testing
│   ├── experiments.tsx         # Interactive experiment testing
│   └── config.tsx              # Interactive config viewer
├── flags/
│   └── [flagKey].tsx           # Flag detail & evaluation
└── experiments/
    └── [experimentKey].tsx     # Experiment detail & assignment
```

---

## Quick Start Examples

### 1. Provider Setup

**File:** `app/_layout.tsx`

Wrap your app with `ToggleBoxProvider`:

```tsx
import { ToggleBoxProvider } from '@togglebox/sdk-expo'

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
      apiKey={process.env.EXPO_PUBLIC_API_KEY}  // Required if API has auth enabled
      pollingInterval={30000}           // Auto-refresh every 30s
      persistToStorage={true}           // Enable MMKV offline storage
      storageTTL={24 * 60 * 60 * 1000}  // 24 hours cache
    >
      <Stack />
    </ToggleBoxProvider>
  )
}
```

### 2. Remote Config (useConfig)

**File:** `app/quick/remote-config.tsx`

Fetch and display remote configuration:

```tsx
import { View, Text, ActivityIndicator } from 'react-native'
import { useConfig, useToggleBox } from '@togglebox/sdk-expo'

export default function RemoteConfigScreen() {
  const config = useConfig()
  const { isLoading } = useToggleBox()

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      <Text>Version: {config?.version}</Text>
      <Text>Theme: {config?.config?.theme}</Text>
    </View>
  )
}
```

### 3. Feature Flags (useFlags / isFlagEnabled)

**File:** `app/quick/feature-flags.tsx`

List flags and evaluate with user context:

```tsx
import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import { useFlags, useToggleBox } from '@togglebox/sdk-expo'

export default function FeatureFlagsScreen() {
  const flags = useFlags()
  const { isFlagEnabled, isLoading } = useToggleBox()
  const [newDashboardEnabled, setNewDashboardEnabled] = useState(false)

  useEffect(() => {
    isFlagEnabled('new-dashboard', { userId: 'user-123' })
      .then(setNewDashboardEnabled)
  }, [isFlagEnabled])

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      {/* Conditional rendering based on flag */}
      {newDashboardEnabled ? (
        <Text>New Dashboard Enabled!</Text>
      ) : (
        <Text>Classic Dashboard</Text>
      )}

      {/* List all flags */}
      <FlatList
        data={flags}
        keyExtractor={(item) => item.flagKey}
        renderItem={({ item }) => (
          <Text>{item.flagKey}: {item.enabled ? 'ON' : 'OFF'}</Text>
        )}
      />
    </View>
  )
}
```

### 4. Experiments (useExperiments / getVariant)

**File:** `app/quick/experiments.tsx`

List experiments and get variant assignment:

```tsx
import { useState, useEffect } from 'react'
import { View, Text, FlatList, ActivityIndicator } from 'react-native'
import { useExperiments, useToggleBox } from '@togglebox/sdk-expo'

export default function ExperimentsScreen() {
  const experiments = useExperiments()
  const { getVariant, isLoading } = useToggleBox()
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    getVariant('checkout-test', { userId: 'user-123' })
      .then(setVariant)
  }, [getVariant])

  if (isLoading) return <ActivityIndicator />

  return (
    <View>
      <Text>Your variant: {variant || 'Not assigned'}</Text>

      <FlatList
        data={experiments}
        keyExtractor={(item) => item.experimentKey}
        renderItem={({ item }) => (
          <Text>{item.experimentKey}: {item.status}</Text>
        )}
      />
    </View>
  )
}
```

---

## Advanced Examples

### Conversion Tracking

**File:** `app/advanced/conversion-tracking.tsx`

Track experiment conversions:

```tsx
import { TouchableOpacity, Text } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

const client = new ToggleBoxClient({
  platform: 'mobile',
  environment: 'production',
  apiUrl: 'https://your-api.example.com/api/v1',
})

function ConversionExample() {
  const handlePurchase = async (amount: number) => {
    await client.trackConversion('checkout-test', { userId: 'user-123' }, {
      metricName: 'purchase',
      value: amount,
    })
    await client.flushStats()  // Send immediately
  }

  return (
    <TouchableOpacity onPress={() => handlePurchase(99.99)}>
      <Text>Complete Purchase</Text>
    </TouchableOpacity>
  )
}
```

### Offline Storage

**File:** `app/advanced/offline-storage.tsx`

Enable MMKV persistence for offline support:

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://your-api.example.com/api/v1"
  persistToStorage={true}           // Enable MMKV
  storageTTL={24 * 60 * 60 * 1000}  // 24 hours
>
  <App />
</ToggleBoxProvider>

// Benefits:
// 1. Instant load from MMKV cache
// 2. Background refresh
// 3. Works offline
// 4. Auto-expires stale data
```

### Polling & Refresh

**File:** `app/advanced/polling-refresh.tsx`

Auto-refresh and pull-to-refresh:

```tsx
import { FlatList, RefreshControl } from 'react-native'
import { useToggleBox, useFlags } from '@togglebox/sdk-expo'

function PullToRefreshList() {
  const flags = useFlags()
  const { refresh, isLoading } = useToggleBox()

  return (
    <FlatList
      data={flags}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} />
      }
      renderItem={({ item }) => <FlagItem flag={item} />}
    />
  )
}
```

### Health Check

**File:** `app/advanced/health-check.tsx`

Monitor API health:

```tsx
import { useState, useEffect } from 'react'
import { View, Text } from 'react-native'
import { ToggleBoxClient } from '@togglebox/sdk-expo'

function HealthCheck() {
  const [healthy, setHealthy] = useState<boolean | null>(null)

  useEffect(() => {
    const client = new ToggleBoxClient({ ... })
    client.checkConnection()
      .then(() => setHealthy(true))
      .catch(() => setHealthy(false))
      .finally(() => client.destroy())
  }, [])

  return (
    <View>
      <View style={{
        width: 12, height: 12, borderRadius: 6,
        backgroundColor: healthy ? '#22c55e' : '#ef4444'
      }} />
      <Text>{healthy ? 'API Healthy' : 'API Down'}</Text>
    </View>
  )
}
```

### Error Handling

**File:** `app/advanced/error-handling.tsx`

Handle errors gracefully with cached data fallback:

```tsx
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useToggleBox, useFlags } from '@togglebox/sdk-expo'

function ErrorHandlingExample() {
  const flags = useFlags()
  const { error, isLoading, refresh } = useToggleBox()

  if (error) {
    return (
      <View>
        <Text>Error: {error.message}</Text>
        <TouchableOpacity onPress={refresh}>
          <Text>Retry</Text>
        </TouchableOpacity>

        {/* Show cached data if available */}
        {flags.length > 0 && (
          <Text>Using {flags.length} cached flags</Text>
        )}
      </View>
    )
  }

  if (isLoading && flags.length === 0) {
    return <ActivityIndicator />
  }

  return <FlagsList flags={flags} />
}
```

### Full Integration

**File:** `app/advanced/full-integration.tsx`

Complete production-ready example combining all features.

---

## Hooks Reference

### useConfig()

```tsx
const config = useConfig()  // Returns Config | null
```

### useFlags()

```tsx
const flags = useFlags()  // Returns Flag[]
```

### useExperiments()

```tsx
const experiments = useExperiments()  // Returns Experiment[]
```

### useToggleBox()

```tsx
const {
  // State
  isLoading,
  error,

  // Methods
  isFlagEnabled,    // (flagKey, context) => Promise<boolean>
  getVariant,       // (experimentKey, context) => Promise<string | null>
  trackEvent,       // (event, properties) => void
  refresh,          // () => Promise<void>
} = useToggleBox()
```

---

## SDK Documentation

For complete SDK documentation, see:
- [SDK-Expo README](../../packages/sdk-expo/README.md)
- [SDK-JS README](../../packages/sdk-js/README.md)

---

## License

This example app is part of ToggleBox and is licensed under the Elastic License 2.0 (ELv2).
