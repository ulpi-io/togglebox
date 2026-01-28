# ToggleBox Expo Example App

A comprehensive "kitchen sink" demo showing how to integrate the ToggleBox SDK into Expo/React Native applications. Every example is **copy-paste ready** with working code you can use directly in your projects.

---

## Overview

This example app demonstrates all three tiers of ToggleBox:

| Tier       | Feature        | Use Case                                    |
| ---------- | -------------- | ------------------------------------------- |
| **Tier 1** | Remote Configs | Dynamic settings, themes, API URLs          |
| **Tier 2** | Feature Flags  | Ship code when ready, release when you want |
| **Tier 3** | Experiments    | A/B tests with variant assignment           |

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

# Start the API (required for the examples)
pnpm dev:api

# Seed demo data (in another terminal) - creates demo user, flags, experiments
./scripts/seed-demo-data.sh

# Start the example app
pnpm dev:example-expo
```

Scan the QR code with Expo Go or press `i` for iOS simulator / `a` for Android emulator.

### Demo Data

The seed script creates demo data for this app:

| Type            | Key                   | Description                                       |
| --------------- | --------------------- | ------------------------------------------------- |
| **Platform**    | `mobile`              | Platform identifier                               |
| **Environment** | `staging`             | Environment for this app                          |
| **Flag**        | `dark-mode`           | Toggle dark mode UI                               |
| **Flag**        | `biometric-auth`      | Enable biometric authentication                   |
| **Experiment**  | `cta-test`            | A/B test with `control`, `variant_a`, `variant_b` |
| **Config**      | `theme`, `apiTimeout` | Remote configuration values                       |

**Demo Admin:** `admin@togglebox.com` / `Parola123!`

### Environment Variables

Create a `.env` file in `apps/example-expo/`:

```bash
EXPO_PUBLIC_TOGGLEBOX_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_TOGGLEBOX_PLATFORM=mobile
EXPO_PUBLIC_TOGGLEBOX_ENVIRONMENT=staging  # Matches seed demo data
EXPO_PUBLIC_TOGGLEBOX_API_KEY=your-api-key  # Required if API has auth enabled
```

---

## App Structure

```
app/
├── index.tsx                        # Homepage with example index
├── _layout.tsx                      # Root layout with ToggleBoxProvider
└── examples/
    ├── _layout.tsx                  # Examples layout
    ├── quick/                       # Quick Start examples (5)
    │   ├── _layout.tsx              # Quick examples navigation
    │   ├── provider-setup.tsx       # How to set up the provider
    │   ├── use-config.tsx           # Fetch remote configuration
    │   ├── use-flag.tsx             # Check feature flags
    │   ├── use-experiment.tsx       # Get experiment variants
    │   └── track-event.tsx          # Track events & conversions
    └── full/                        # Complete examples (7)
        ├── _layout.tsx              # Full examples navigation
        ├── feature-toggle.tsx       # Full feature flag pattern
        ├── ab-test-cta.tsx          # A/B test with conversion tracking
        ├── config-theme.tsx         # Dynamic theming from config
        ├── polling-updates.tsx      # Real-time updates with polling
        ├── error-handling.tsx       # Error states & offline fallback
        ├── health-check.tsx         # API health monitoring
        └── offline-storage.tsx      # MMKV persistence for offline
```

---

## Quick Start Examples

### 1. Provider Setup

**File:** `app/_layout.tsx`

Wrap your app with `ToggleBoxProvider`:

```tsx
import { ToggleBoxProvider } from "@togglebox/sdk-expo";

export default function RootLayout() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      apiUrl="https://your-api.example.com/api/v1"
      apiKey={process.env.EXPO_PUBLIC_API_KEY} // Required if API has auth enabled
      pollingInterval={30000} // Auto-refresh every 30s
      persistToStorage={true} // Enable MMKV offline storage
      storageTTL={24 * 60 * 60 * 1000} // 24 hours cache
    >
      <Stack />
    </ToggleBoxProvider>
  );
}
```

### 2. Remote Config (useConfig)

**File:** `app/examples/quick/use-config.tsx`

Fetch and display remote configuration:

```tsx
import { View, Text, ActivityIndicator } from "react-native";
import { useConfig } from "@togglebox/sdk-expo";

export default function UseConfigScreen() {
  const { config, isLoading } = useConfig();

  if (isLoading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Version: {config?.version}</Text>
      <Text>Theme: {config?.config?.theme}</Text>
    </View>
  );
}
```

### 3. Feature Flags (isFlagEnabled)

**File:** `app/examples/quick/use-flag.tsx`

List flags and evaluate with user context:

```tsx
import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useFlags } from "@togglebox/sdk-expo";

export default function UseFlagScreen() {
  const { flags, isFlagEnabled, isLoading } = useFlags();
  const [newDashboardEnabled, setNewDashboardEnabled] = useState(false);

  useEffect(() => {
    isFlagEnabled("new-dashboard", { userId: "user-123" }).then(
      setNewDashboardEnabled,
    );
  }, [isFlagEnabled]);

  if (isLoading) return <ActivityIndicator />;

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
          <Text>
            {item.flagKey}: {item.enabled ? "ON" : "OFF"}
          </Text>
        )}
      />
    </View>
  );
}
```

### 4. Experiments (getVariant)

**File:** `app/examples/quick/use-experiment.tsx`

List experiments and get variant assignment:

```tsx
import { useState, useEffect } from "react";
import { View, Text, FlatList, ActivityIndicator } from "react-native";
import { useExperiments } from "@togglebox/sdk-expo";

export default function UseExperimentScreen() {
  const { experiments, getVariant, isLoading } = useExperiments();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant("checkout-test", { userId: "user-123" }).then(setVariant);
  }, [getVariant]);

  if (isLoading) return <ActivityIndicator />;

  return (
    <View>
      <Text>Your variant: {variant || "Not assigned"}</Text>

      <FlatList
        data={experiments}
        keyExtractor={(item) => item.experimentKey}
        renderItem={({ item }) => (
          <Text>
            {item.experimentKey}: {item.status}
          </Text>
        )}
      />
    </View>
  );
}
```

### 5. Event Tracking

**File:** `app/examples/quick/track-event.tsx`

Track custom events and conversions:

```tsx
import { useState } from "react";
import { View, TouchableOpacity, Text } from "react-native";
import { ToggleBoxClient } from "@togglebox/sdk-expo";

const client = new ToggleBoxClient({
  platform: "mobile",
  environment: "production",
  apiUrl: "https://your-api.example.com/api/v1",
});

export default function TrackEventScreen() {
  const [clicks, setClicks] = useState(0);

  const handleClick = () => {
    client.trackEvent(
      "button_click",
      { userId: "user-123" },
      {
        properties: { buttonId: "cta-main" },
      },
    );
    setClicks((c) => c + 1);
  };

  const handlePurchase = async () => {
    await client.trackConversion(
      "pricing-page",
      { userId: "user-123" },
      {
        metricId: "purchase",
        value: 99.99,
      },
    );
    await client.flushStats(); // Send immediately
  };

  return (
    <View>
      <TouchableOpacity onPress={handleClick}>
        <Text>Click Me ({clicks})</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={handlePurchase}>
        <Text>Complete Purchase</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

## Complete Examples

### Feature Toggle

**File:** `app/examples/full/feature-toggle.tsx`

Full implementation showing:

- Flag evaluation with user context
- Loading states
- Conditional UI rendering

### A/B Test CTA

**File:** `app/examples/full/ab-test-cta.tsx`

Complete A/B test implementation:

- Variant assignment
- Different CTA buttons per variant
- Conversion tracking

### Config Theme

**File:** `app/examples/full/config-theme.tsx`

Theme switching with remote config:

- Dynamic theme loading
- Style application
- Config-driven styling

### Polling Updates

**File:** `app/examples/full/polling-updates.tsx`

Auto-refresh and pull-to-refresh:

- Polling interval configuration
- Manual refresh trigger
- Pull-to-refresh support

### Error Handling

**File:** `app/examples/full/error-handling.tsx`

Handle errors gracefully with cached data fallback:

```tsx
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFlags } from "@togglebox/sdk-expo";

function ErrorHandlingExample() {
  const { flags, error, isLoading, refresh } = useFlags();

  if (error) {
    return (
      <View>
        <Text>Error: {error.message}</Text>
        <TouchableOpacity onPress={refresh}>
          <Text>Retry</Text>
        </TouchableOpacity>

        {/* Show cached data if available */}
        {flags.length > 0 && <Text>Using {flags.length} cached flags</Text>}
      </View>
    );
  }

  if (isLoading && flags.length === 0) {
    return <ActivityIndicator />;
  }

  return <FlagsList flags={flags} />;
}
```

### Health Check

**File:** `app/examples/full/health-check.tsx`

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

### Offline Storage

**File:** `app/examples/full/offline-storage.tsx`

Enable MMKV persistence for offline support:

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://your-api.example.com/api/v1"
  persistToStorage={true} // Enable MMKV
  storageTTL={24 * 60 * 60 * 1000} // 24 hours
>
  <App />
</ToggleBoxProvider>

// Benefits:
// 1. Instant load from MMKV cache
// 2. Background refresh
// 3. Works offline
// 4. Auto-expires stale data
```

---

## Hooks Reference

### useConfig()

```tsx
const {
  config, // Config | null
  getConfigValue, // <T>(key: string, defaultValue: T) => Promise<T>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useConfig();
```

### useFlags()

```tsx
const {
  flags, // Flag[]
  isFlagEnabled, // (flagKey: string, context?: FlagContext) => Promise<boolean>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useFlags();
```

### useExperiments()

```tsx
const {
  experiments, // Experiment[]
  getVariant, // (experimentKey: string, context: ExperimentContext) => Promise<string | null>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useExperiments();
```

### useAnalytics()

```tsx
const {
  trackEvent, // (eventName: string, context: ExperimentContext, data?: EventData) => void
  trackConversion, // (experimentKey: string, context: ExperimentContext, data: ConversionData) => Promise<void>
  flushStats, // () => Promise<void>
} = useAnalytics();
```

### useToggleBoxClient()

```tsx
const client = useToggleBoxClient(); // ToggleBoxClient | null
```

---

## SDK Documentation

For complete SDK documentation, see:

- [SDK-Expo README](../../packages/sdk-expo/README.md)
- [SDK-JS README](../../packages/sdk-js/README.md)

---

## License

This example app is part of ToggleBox and is licensed under the Elastic License 2.0 (ELv2).
