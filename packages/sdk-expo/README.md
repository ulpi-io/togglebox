# @togglebox/sdk-expo

Expo/React Native SDK for ToggleBox - Remote configuration, feature flags, and A/B experiments with MMKV persistence.

## Installation

```bash
npx expo install @togglebox/sdk-expo react-native-mmkv
# or
npm install @togglebox/sdk-expo react-native-mmkv
# or
yarn add @togglebox/sdk-expo react-native-mmkv
```

> **Note:** `react-native-mmkv` is required for the `persistToStorage` feature, which enables offline support. The SDK works without it for basic online-only usage.

### Expo Setup

For Expo projects, you'll need to use a development build:

```bash
npx expo install react-native-mmkv
npx expo prebuild
npx expo run:ios # or npx expo run:android
```

---

## Quick Start

### Open Source Self-Hosted

```tsx
import { ToggleBoxProvider } from "@togglebox/sdk-expo";

export default function App() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment={__DEV__ ? "development" : "production"}
      apiUrl="https://api.yourcompany.com"
    >
      <MainApp />
    </ToggleBoxProvider>
  );
}
```

### Cloud Multi-Tenant

```tsx
import { ToggleBoxProvider } from "@togglebox/sdk-expo";

export default function App() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment="production"
      tenantSubdomain="acme" // Connects to https://acme.togglebox.io
    >
      <MainApp />
    </ToggleBoxProvider>
  );
}
```

---

## Three-Tier Architecture

ToggleBox provides three complementary systems:

| Tier | System         | Hook              | Use Case                       |
| ---- | -------------- | ----------------- | ------------------------------ |
| 1    | Remote Configs | `useConfig()`     | Static settings, themes        |
| 2    | Feature Flags  | `useFlag()`       | On/off switches with targeting |
| 3    | Experiments    | `useExperiment()` | Multi-variant A/B testing      |

---

## Tier 1: Remote Configs

Remote configs are **versioned, immutable snapshots** of application settings. Use them for:

- API endpoints and service URLs
- UI themes and branding
- Default values and limits
- Environment-specific settings

### Using Configuration

```tsx
import { useConfig } from "@togglebox/sdk-expo";
import { View, Text, ActivityIndicator } from "react-native";

function SettingsScreen() {
  const { config, isLoading } = useConfig();

  if (isLoading && !config) return <ActivityIndicator size="large" />;

  return (
    <View>
      <Text style={{ color: config?.theme?.primaryColor }}>
        {config?.appName}
      </Text>
      <Text>API Endpoint: {config?.apiBaseUrl}</Text>
      <Text>Max Upload: {config?.limits?.maxUploadSize} bytes</Text>
    </View>
  );
}
```

### Theming with Config

```tsx
import { useConfig } from "@togglebox/sdk-expo";
import { ThemeProvider } from "@react-navigation/native";

function AppTheme({ children }: { children: React.ReactNode }) {
  const { config, isLoading } = useConfig();

  if (isLoading && !config) return <SplashScreen />;

  const theme = config?.theme || defaultTheme;

  return (
    <ThemeProvider
      value={{
        dark: false,
        colors: {
          primary: theme.primaryColor,
          background: theme.backgroundColor,
          card: theme.cardColor,
          text: theme.textColor,
          border: theme.borderColor,
          notification: theme.notificationColor,
        },
      }}
    >
      {children}
    </ThemeProvider>
  );
}
```

---

## Tier 2: Feature Flags

Feature flags are **2-value switches** (A or B) with targeting rules. Use them for:

- Gradual rollouts (1% → 10% → 50% → 100%)
- Country/language targeting
- User-specific features (beta users, premium plans)
- Kill switches for quick rollbacks

### Check Flag Enabled

```tsx
import { useFlag, useFlags } from "@togglebox/sdk-expo";
import { View } from "react-native";

function HomeScreen() {
  const { isEnabled, isLoading } = useFlag("new-home-ui");
  const [showNewUI, setShowNewUI] = useState(false);

  useEffect(() => {
    isEnabled().then(setShowNewUI);
  }, [isEnabled]);

  if (isLoading) return <LoadingSpinner />;

  return showNewUI ? <NewHomeUI /> : <LegacyHomeUI />;
}
```

### Get All Flags

```tsx
import { useFlags } from "@togglebox/sdk-expo";
import { View, Text, FlatList } from "react-native";

function FeatureFlagDebugger() {
  const { flags } = useFlags();

  return (
    <FlatList
      data={flags}
      keyExtractor={(item) => item.flagKey}
      renderItem={({ item }) => (
        <View>
          <Text>
            {item.flagKey}: {item.enabled ? "ON" : "OFF"}
          </Text>
        </View>
      )}
    />
  );
}
```

---

## Tier 3: Experiments

Experiments enable **multi-variant A/B testing** with statistical tracking. Use them for:

- Testing multiple UI variations
- Measuring conversion impact
- Data-driven product decisions

### Get Experiment Variant

```tsx
import { useExperiment } from "@togglebox/sdk-expo";
import { useAuth } from "./auth";

function OnboardingFlow() {
  const { user } = useAuth();
  const { isLoading, getVariant } = useExperiment("onboarding-experiment", {
    userId: user?.id || "anonymous",
  });
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant().then(setVariant);
  }, [getVariant]);

  if (isLoading) return <LoadingSpinner />;

  switch (variant) {
    case "simplified":
      return <SimplifiedOnboarding />;
    case "gamified":
      return <GamifiedOnboarding />;
    default:
      return <StandardOnboarding />;
  }
}
```

### Track Conversions

Track user conversions to measure experiment effectiveness:

```tsx
import { useAnalytics } from "@togglebox/sdk-expo";

function PurchaseButton({
  userId,
  cartTotal,
}: {
  userId: string;
  cartTotal: number;
}) {
  const { trackConversion, flushStats } = useAnalytics();

  const handlePurchase = async () => {
    // Process payment...

    // Track the conversion
    await trackConversion(
      "checkout-experiment",
      { userId },
      {
        metricName: "purchase",
        value: cartTotal,
      },
    );

    // Optionally flush stats immediately
    await flushStats();
  };

  return <Button title="Complete Purchase" onPress={handlePurchase} />;
}
```

### Complete A/B Test Example

```tsx
import { useExperiment, useAnalytics } from "@togglebox/sdk-expo";
import { View, Button, Text } from "react-native";

function SignupButton() {
  const { user } = useAuth();
  const context = { userId: user?.id || "anonymous" };
  const { getVariant } = useExperiment("signup-cta-experiment", context);
  const { trackConversion } = useAnalytics();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant().then(setVariant);
  }, [getVariant]);

  const handleSignup = async () => {
    // Track the conversion
    await trackConversion("signup-cta-experiment", context, {
      metricName: "signup_click",
    });

    // Navigate to signup...
  };

  // Render different button text based on variant
  const buttonText =
    variant === "friendly"
      ? "Join the family!"
      : variant === "urgent"
        ? "Sign up now - Limited time!"
        : "Create Account";

  return <Button title={buttonText} onPress={handleSignup} />;
}
```

---

## User Context & Targeting

Context is used for targeting rules in flags and experiments. Update it when user information changes.

### Dynamic Context Updates

```tsx
import { useFlags } from "@togglebox/sdk-expo";
import { useAuth } from "./auth";
import { useLocale } from "./locale";
import * as Application from "expo-application";
import { Platform } from "react-native";

function ContextManager({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const locale = useLocale();
  const { isFlagEnabled } = useFlags();

  // NOTE: The provider doesn't expose setContext directly
  // Context is passed per-evaluation instead

  // Example: Evaluate flag with full context
  useEffect(() => {
    const context = {
      userId: user?.id || "anonymous",
      userEmail: user?.email,
      country: locale.region || "US",
      language: locale.language || "en",
      plan: user?.subscription?.plan || "free",
      appVersion: Application.nativeApplicationVersion || "1.0.0",
      platform: Platform.OS, // 'ios' or 'android'
    };

    // Use context in evaluations
    isFlagEnabled("premium-features", context).then((enabled) => {
      // Handle result
    });
  }, [user, locale]);

  return <>{children}</>;
}
```

### Context Properties

| Property     | Type   | Description                                              |
| ------------ | ------ | -------------------------------------------------------- |
| `userId`     | string | Unique user identifier (required for consistent hashing) |
| `userEmail`  | string | User email for targeting                                 |
| `country`    | string | ISO country code (e.g., 'US', 'GB')                      |
| `language`   | string | Language code (e.g., 'en', 'fr')                         |
| `plan`       | string | Subscription plan for targeting                          |
| `appVersion` | string | App version for version-specific rollouts                |
| `platform`   | string | 'ios' or 'android' for platform-specific flags           |
| `*`          | any    | Custom attributes for targeting rules                    |

---

## Provider Configuration

### Full Configuration Example

```tsx
<ToggleBoxProvider
  // Required
  platform="mobile"
  environment={__DEV__ ? "development" : "production"}
  // API Configuration (choose one)
  apiUrl="https://api.yourcompany.com"
  // OR
  tenantSubdomain="acme"
  // Optional: Version pinning
  configVersion="2.0.0" // Pin to specific version
  // Optional: Caching
  cache={{
    enabled: true,
    ttl: 300000, // 5 minutes
  }}
  // Optional: Auto-refresh
  pollingInterval={300000} // Poll every 5 minutes
  // Optional: Offline persistence
  persistToStorage={true}
  storageTTL={86400000} // 24 hours
>
  {children}
</ToggleBoxProvider>
```

### Configuration Options

```typescript
interface ToggleBoxProviderProps {
  /** Platform name (e.g., 'mobile', 'ios', 'android') */
  platform: string;

  /** Environment name (e.g., 'production', 'staging', 'development') */
  environment: string;

  /** API base URL (for open source self-hosted) */
  apiUrl?: string;

  /** Tenant subdomain for cloud deployments */
  tenantSubdomain?: string;

  /** Config version to fetch (default: 'stable') */
  configVersion?: string;

  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttl: number;
  };

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number;

  /** Enable persistent storage with MMKV */
  persistToStorage?: boolean;

  /** Storage TTL in milliseconds (default: 24 hours) */
  storageTTL?: number;

  children: React.ReactNode;
}
```

---

## Offline Persistence

Enable offline support with high-performance MMKV storage.

### Basic Setup

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://api.yourcompany.com"
  persistToStorage={true}
  storageTTL={86400000} // 24 hours
>
  {children}
</ToggleBoxProvider>
```

### How It Works

With persistence enabled:

1. Configuration is cached in MMKV (high-performance native storage)
2. App works offline using cached data
3. Fresh data is fetched in background when online
4. Stale data is automatically purged after TTL expires

### Offline Indicator

```tsx
import NetInfo from "@react-native-community/netinfo";
import { useConfig } from "@togglebox/sdk-expo";
import { View, Text } from "react-native";

function OfflineBanner() {
  const { config } = useConfig();
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return unsubscribe;
  }, []);

  if (isOnline || !config) return null;

  return (
    <View style={{ backgroundColor: "#ffcc00", padding: 8 }}>
      <Text>Using cached configuration (offline)</Text>
    </View>
  );
}
```

### Why MMKV over AsyncStorage?

We use [react-native-mmkv](https://github.com/mrousavy/react-native-mmkv) instead of AsyncStorage for several reasons:

| Feature     | MMKV                   | AsyncStorage           |
| ----------- | ---------------------- | ---------------------- |
| Performance | ~30x faster            | Slow                   |
| API         | Synchronous            | Async only             |
| Reliability | Battle-tested (WeChat) | Known data loss issues |
| Size limit  | No practical limit     | 6MB on Android         |

---

## React Hooks API

### useConfig

Access configuration with methods:

```tsx
const {
  config, // Config | null
  getConfigValue, // <T>(key: string, defaultValue: T) => Promise<T>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useConfig();
```

### useFlags

Access all feature flags with evaluation:

```tsx
const {
  flags, // Flag[]
  isFlagEnabled, // (flagKey: string, context?: FlagContext) => Promise<boolean>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useFlags();
```

### useFlag

Access a specific feature flag:

```tsx
const { flag, exists, isLoading, isEnabled } = useFlag("my-flag");
// flag: Flag | undefined
// exists: boolean
// isLoading: boolean
// isEnabled: () => Promise<boolean>
```

### useExperiments

Access all experiments with variant assignment:

```tsx
const {
  experiments, // Experiment[]
  getVariant, // (experimentKey: string, context: ExperimentContext) => Promise<string | null>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useExperiments();
```

### useExperiment

Access a specific experiment:

```tsx
const { experiment, exists, isLoading, getVariant } = useExperiment(
  "my-experiment",
  {
    userId: "user-123",
  },
);
// experiment: Experiment | undefined
// exists: boolean
// isLoading: boolean
// getVariant: () => Promise<string | null>
```

### useAnalytics

Access analytics and event tracking:

```tsx
const {
  trackConversion, // (experimentKey: string, context: ExperimentContext, data: ConversionData) => Promise<void>
  flushStats, // () => Promise<void>
} = useAnalytics();
```

### useToggleBoxClient

Access the raw ToggleBox client for advanced use cases:

```tsx
const client = useToggleBoxClient();
// Returns ToggleBoxClient | null
```

---

## Examples

### Auto-Refresh with Persistence

```tsx
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://api.yourcompany.com"
  pollingInterval={300000} // Poll every 5 minutes
  persistToStorage={true} // Cache in MMKV
  storageTTL={86400000} // 24 hour cache
>
  {children}
</ToggleBoxProvider>
```

### Pull-to-Refresh

```tsx
import { RefreshControl, ScrollView } from "react-native";
import { useConfig } from "@togglebox/sdk-expo";

function MyScreen() {
  const { refresh, isLoading } = useConfig();

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refresh} />
      }
    >
      <Content />
    </ScrollView>
  );
}
```

### Loading & Error States

```tsx
import { View, Text, Button, ActivityIndicator } from "react-native";
import { useConfig } from "@togglebox/sdk-expo";

function ConfigLoader({ children }: { children: React.ReactNode }) {
  const { config, isLoading, error, refresh } = useConfig();

  if (isLoading && !config) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
        <Text>Loading configuration...</Text>
      </View>
    );
  }

  if (error && !config) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Error: {error.message}</Text>
        <Button title="Retry" onPress={refresh} />
      </View>
    );
  }

  return <>{children}</>;
}
```

### Platform Version Targeting

Target specific app versions with feature flags:

```tsx
import * as Application from "expo-application";
import { Platform } from "react-native";
import { useFlags } from "@togglebox/sdk-expo";

function VersionTargetedFeature() {
  const { isFlagEnabled } = useFlags();
  const [showFeature, setShowFeature] = useState(false);

  useEffect(() => {
    // Create a flag in the dashboard with:
    // - targetPlatformVersions: ['>=2.0.0', '<3.0.0']
    // This flag will only be enabled for app versions 2.x.x
    isFlagEnabled("new-feature-v2", {
      userId: "user-123",
      appVersion: Application.nativeApplicationVersion || "1.0.0",
      platform: Platform.OS,
    }).then(setShowFeature);
  }, []);

  if (!showFeature) return null;

  return <NewFeatureV2 />;
}
```

### Percentage-Based Rollout

```tsx
import { useFlags } from "@togglebox/sdk-expo";

function CheckoutScreen() {
  const { isFlagEnabled } = useFlags();
  const { user } = useAuth();
  const [useNewCheckout, setUseNewCheckout] = useState(false);

  useEffect(() => {
    // Flag configured with 25% rollout in dashboard
    // userId is used for consistent hashing (same user always gets same result)
    isFlagEnabled("new-checkout", { userId: user.id }).then(setUseNewCheckout);
  }, [user.id]);

  return useNewCheckout ? <NewCheckout /> : <LegacyCheckout />;
}
```

### Combining Configs and Flags

```tsx
import { useConfig, useFlag } from "@togglebox/sdk-expo";
import { View, Text } from "react-native";

function FeatureCard({ featureName }: { featureName: string }) {
  const config = useConfig();
  const { isEnabled, isLoading } = useFlag(featureName);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    isEnabled().then(setIsEnabled);
  }, [isEnabled]);

  // Use config for static settings, flags for dynamic on/off
  const featureConfig = config?.features?.[featureName] || {};

  if (!isEnabled) return null;

  return (
    <View style={{ padding: 16, backgroundColor: "#f5f5f5", borderRadius: 8 }}>
      <Text style={{ fontWeight: "bold" }}>
        {featureConfig.title || featureName}
      </Text>
      <Text>{featureConfig.description || "No description"}</Text>
    </View>
  );
}
```

### Multiple Flags Evaluation

```tsx
import { useFlags } from "@togglebox/sdk-expo";
import { View } from "react-native";

function FeatureSection() {
  const { isFlagEnabled } = useFlags();
  const { user } = useAuth();
  const [features, setFeatures] = useState({
    darkMode: false,
    betaFeatures: false,
    premiumContent: false,
  });

  useEffect(() => {
    const context = { userId: user?.id || "anonymous" };

    // Check multiple flags in parallel
    Promise.all([
      isFlagEnabled("dark-mode", context),
      isFlagEnabled("beta-features", context),
      isFlagEnabled("premium-content", context),
    ]).then(([darkMode, beta, premium]) => {
      setFeatures({ darkMode, betaFeatures: beta, premiumContent: premium });
    });
  }, [user?.id]);

  return (
    <View>
      {features.darkMode && <DarkModeToggle />}
      {features.betaFeatures && <BetaFeaturesSection />}
      {features.premiumContent && <PremiumContentBadge />}
    </View>
  );
}
```

---

## Complete Real-World Example

Here's a complete example showing all three tiers working together:

```tsx
// App.tsx
import { ToggleBoxProvider } from "@togglebox/sdk-expo";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider } from "./auth";

export default function App() {
  return (
    <ToggleBoxProvider
      platform="mobile"
      environment={__DEV__ ? "development" : "production"}
      apiUrl={process.env.EXPO_PUBLIC_TOGGLEBOX_URL!}
      pollingInterval={300000}
      persistToStorage={true}
      storageTTL={86400000}
    >
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </ToggleBoxProvider>
  );
}

// HomeScreen.tsx
import {
  useConfig,
  useFlag,
  useExperiment,
  useAnalytics,
} from "@togglebox/sdk-expo";
import * as Application from "expo-application";

function HomeScreen() {
  const { user } = useAuth();
  const { config } = useConfig();
  const { isEnabled: checkNewUI } = useFlag("new-home-ui");
  const { getVariant } = useExperiment("home-layout-experiment", {
    userId: user?.id || "anonymous",
  });
  const { trackConversion } = useAnalytics();

  const [showNewUI, setShowNewUI] = useState(false);
  const [layoutVariant, setLayoutVariant] = useState<string | null>(null);

  useEffect(() => {
    // Check feature flag
    checkNewUI().then(setShowNewUI);

    // Get experiment variant
    getVariant().then(setLayoutVariant);
  }, [user?.id]);

  const handleCTAClick = async () => {
    // Track conversion for the experiment
    await trackConversion(
      "home-layout-experiment",
      { userId: user?.id || "anonymous" },
      { metricName: "cta_click" },
    );
  };

  // Tier 1: Use config for static settings
  const theme = config?.theme || defaultTheme;

  // Tier 2: Use flag for on/off switch
  if (!showNewUI) {
    return <LegacyHomeScreen theme={theme} />;
  }

  // Tier 3: Use experiment for variant testing
  return (
    <View style={{ backgroundColor: theme.backgroundColor }}>
      {layoutVariant === "hero" ? (
        <HeroLayout onCTAClick={handleCTAClick} />
      ) : layoutVariant === "cards" ? (
        <CardsLayout onCTAClick={handleCTAClick} />
      ) : (
        <DefaultLayout onCTAClick={handleCTAClick} />
      )}
    </View>
  );
}
```

---

## TypeScript

Full TypeScript support included:

```typescript
import {
  ToggleBoxProvider,
  ToggleBoxClient,
  useToggleBoxContext,
  useConfig,
  useFlags,
  useFlag,
  useExperiments,
  useExperiment,
  useAnalytics,
  useToggleBoxClient,
  Storage,
} from "@togglebox/sdk-expo";

import type {
  ToggleBoxProviderProps,
  ToggleBoxContextValue,
  UseConfigResult,
  UseFlagsResult,
  UseExperimentsResult,
  UseAnalyticsResult,
  StoredData,
  StorageAdapter,
  ClientOptions,
  Config,
  Flag,
  FlagContext,
  FlagResult,
  Experiment,
  ExperimentContext,
  VariantAssignment,
} from "@togglebox/sdk-expo";
```

---

## Requirements

- Expo SDK 48+ or React Native 0.71+
- react-native-mmkv ^2.0.0 or ^3.0.0 (only if using `persistToStorage`)

---

## Migrating from AsyncStorage

If you were using an older version with AsyncStorage:

1. Update the SDK: `npm install @togglebox/sdk-expo@latest`
2. Install MMKV: `npx expo install react-native-mmkv`
3. For Expo: Run `npx expo prebuild` to generate native code
4. Remove AsyncStorage if not used elsewhere: `npm uninstall @react-native-async-storage/async-storage`

Your cached data will be empty after migration (MMKV uses a different storage location), but fresh data will be fetched automatically on the next app launch.

---

## License

MIT
