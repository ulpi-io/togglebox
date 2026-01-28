# @togglebox/sdk-nextjs

Next.js SDK for ToggleBox - Remote configuration, feature flags, and A/B experiments with React hooks.

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
"use client";

import { ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment={process.env.NEXT_PUBLIC_ENV || "production"}
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
    >
      {children}
    </ToggleBoxProvider>
  );
}
```

### Cloud Multi-Tenant

```tsx
"use client";

import { ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      tenantSubdomain="acme" // Connects to https://acme.togglebox.io
    >
      {children}
    </ToggleBoxProvider>
  );
}
```

## Three-Tier Architecture

ToggleBox provides three complementary systems:

| Tier | System         | Hook              | Use Case                       |
| ---- | -------------- | ----------------- | ------------------------------ |
| 1    | Remote Configs | `useConfig()`     | Static settings, themes        |
| 2    | Feature Flags  | `useFlag()`       | On/off switches with targeting |
| 3    | Experiments    | `useExperiment()` | Multi-variant A/B testing      |

---

## Tier 1: Remote Configs

### Using Configuration

```tsx
import { useConfig } from "@togglebox/sdk-nextjs";

function ThemeWrapper({ children }: { children: React.ReactNode }) {
  const { config, isLoading } = useConfig();

  if (isLoading && !config) return <LoadingScreen />;

  const theme = config?.theme || defaultTheme;

  return (
    <div
      style={
        {
          "--primary-color": theme.primaryColor,
          "--secondary-color": theme.secondaryColor,
          "--font-family": theme.fontFamily,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}

function SettingsDisplay() {
  const { config } = useConfig();

  return (
    <div>
      <h1>{config?.appName}</h1>
      <p>API: {config?.apiBaseUrl}</p>
      <p>Max upload: {config?.limits?.maxUploadSize} bytes</p>
    </div>
  );
}
```

---

## Tier 2: Feature Flags

### Check Flag Enabled

```tsx
import { useFlag, useFlags } from "@togglebox/sdk-nextjs";

function Dashboard() {
  const { flag, isLoading, checkEnabled } = useFlag("new-dashboard");
  const [showNewUI, setShowNewUI] = useState(false);

  useEffect(() => {
    checkEnabled().then(setShowNewUI);
  }, [checkEnabled]);

  if (isLoading) return <Spinner />;

  return showNewUI ? <NewDashboard /> : <LegacyDashboard />;
}
```

### Get All Flags

```tsx
import { useFlags } from "@togglebox/sdk-nextjs";

function FeatureFlagDebugger() {
  const { flags } = useFlags();

  return (
    <ul>
      {flags.map((flag) => (
        <li key={flag.flagKey}>
          {flag.flagKey}: {flag.enabled ? "ON" : "OFF"}
        </li>
      ))}
    </ul>
  );
}
```

---

## Tier 3: Experiments

### Get Experiment Variant

```tsx
import { useExperiment, useExperiments } from "@togglebox/sdk-nextjs";

function CheckoutPage() {
  const { user } = useAuth();
  const { experiment, isLoading, getVariant } = useExperiment(
    "checkout-experiment",
    {
      userId: user?.id || "anonymous",
    },
  );
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant().then(setVariant);
  }, [getVariant]);

  if (isLoading) return <Spinner />;

  switch (variant) {
    case "one-page":
      return <OnePageCheckout />;
    case "multi-step":
      return <MultiStepCheckout />;
    default:
      return <DefaultCheckout />;
  }
}
```

### Track Conversions

```tsx
import { useAnalytics } from "@togglebox/sdk-nextjs";

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

  return <button onClick={handlePurchase}>Complete Purchase</button>;
}
```

---

## Provider Configuration

### Full Configuration Example

```tsx
<ToggleBoxProvider
  // Required
  platform="web"
  environment={process.env.NEXT_PUBLIC_ENV || "production"}
  // API Configuration (choose one)
  apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL}
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
  pollingInterval={60000} // Poll every minute
  // Optional: SSR Hydration (see Server-Side Rendering section)
  initialConfig={config}
  initialFlags={flags}
  initialExperiments={experiments}
>
  {children}
</ToggleBoxProvider>
```

### Configuration Options

```typescript
interface ToggleBoxProviderProps {
  /** Platform name (e.g., 'web', 'mobile') */
  platform: string;

  /** Environment name (e.g., 'production', 'staging') */
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

  /** Initial config for SSR hydration */
  initialConfig?: Config;

  /** Initial feature flags for SSR hydration */
  initialFlags?: Flag[];

  /** Initial experiments for SSR hydration */
  initialExperiments?: Experiment[];

  children: React.ReactNode;
}
```

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
const { flag, exists, isLoading, checkEnabled } = useFlag("my-flag");
// flag: Flag | undefined
// exists: boolean
// isLoading: boolean
// checkEnabled: () => Promise<boolean>
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
  trackEvent, // (eventName: string, context: ExperimentContext, data?: EventData) => void
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

## Server-Side Rendering (SSR)

### App Router (Server Components)

Pre-fetch configuration on the server for instant hydration:

```tsx
// app/layout.tsx
import { getServerSideConfig, ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch on server
  const { config, flags, experiments } = await getServerSideConfig(
    "web",
    process.env.NODE_ENV === "production" ? "production" : "staging",
    process.env.TOGGLEBOX_URL!,
  );

  return (
    <html>
      <body>
        <ToggleBoxProvider
          platform="web"
          environment={
            process.env.NODE_ENV === "production" ? "production" : "staging"
          }
          apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
          initialConfig={config}
          initialFlags={flags}
          initialExperiments={experiments}
        >
          {children}
        </ToggleBoxProvider>
      </body>
    </html>
  );
}
```

### Server-Side Flag Evaluation

For server components that need to evaluate flags:

```tsx
// app/page.tsx
import { ToggleBoxClient } from "@togglebox/sdk-nextjs";
import { headers } from "next/headers";

export default async function Page() {
  const client = new ToggleBoxClient({
    platform: "web",
    environment:
      process.env.NODE_ENV === "production" ? "production" : "staging",
    apiUrl: process.env.TOGGLEBOX_URL!,
    cache: { enabled: false, ttl: 0 }, // Disable cache for server
  });

  try {
    const headersList = await headers();
    const country = headersList.get("x-vercel-ip-country") || "US";

    const showPromoBanner = await client.isFlagEnabled("promo-banner", {
      userId: "anonymous", // Or get from session
      country,
    });

    return (
      <main>
        {showPromoBanner && <PromoBanner />}
        <Content />
      </main>
    );
  } finally {
    client.destroy();
  }
}
```

### Static Generation (ISR)

For pages using Incremental Static Regeneration:

```tsx
// app/products/page.tsx
import { getStaticConfig, ToggleBoxProvider } from "@togglebox/sdk-nextjs";

// Revalidate every 60 seconds
export const revalidate = 60;

export default async function ProductsPage() {
  const { config, flags, experiments } = await getStaticConfig(
    "web",
    "production",
    process.env.TOGGLEBOX_URL!,
  );

  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
      initialConfig={config}
      initialFlags={flags}
      initialExperiments={experiments}
    >
      <ProductList />
    </ToggleBoxProvider>
  );
}
```

### Version-Specific SSR

Pin to a specific config version for controlled rollouts:

```tsx
import { ToggleBoxClient, ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export default async function Page() {
  const client = new ToggleBoxClient({
    platform: "web",
    environment: "production",
    apiUrl: process.env.TOGGLEBOX_URL!,
  });

  // Fetch all active config parameters on the server
  const config = await client.getConfig();
  const flags = await client.getFlags();
  const experiments = await client.getExperiments();

  client.destroy();

  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
      initialConfig={config}
      initialFlags={flags}
      initialExperiments={experiments}
    >
      <ClientComponent />
    </ToggleBoxProvider>
  );
}
```

---

## Route Handlers

### Flag Evaluation in API Routes

```tsx
// app/api/feature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ToggleBoxClient } from "@togglebox/sdk-nextjs";

export async function GET(request: NextRequest) {
  const client = new ToggleBoxClient({
    platform: "web",
    environment:
      process.env.NODE_ENV === "production" ? "production" : "staging",
    apiUrl: process.env.TOGGLEBOX_URL!,
  });

  try {
    const userId = request.headers.get("x-user-id") || "anonymous";
    const country = request.headers.get("x-vercel-ip-country") || "US";

    const isEnabled = await client.isFlagEnabled("new-api-version", {
      userId,
      country,
    });

    return NextResponse.json({ enabled: isEnabled });
  } finally {
    client.destroy();
  }
}
```

### Experiment Assignment in API Routes

```tsx
// app/api/experiment/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ToggleBoxClient } from "@togglebox/sdk-nextjs";

export async function GET(request: NextRequest) {
  const client = new ToggleBoxClient({
    platform: "web",
    environment: "production",
    apiUrl: process.env.TOGGLEBOX_URL!,
  });

  try {
    const userId = request.headers.get("x-user-id") || "anonymous";

    const assignment = await client.getVariant("pricing-experiment", {
      userId,
    });

    return NextResponse.json({
      experimentKey: "pricing-experiment",
      variant: assignment?.variationKey || "control",
    });
  } finally {
    client.destroy();
  }
}
```

### Conversion Tracking in API Routes

```tsx
// app/api/track-purchase/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ToggleBoxClient } from "@togglebox/sdk-nextjs";

export async function POST(request: NextRequest) {
  const { userId, amount, experimentKey } = await request.json();

  const client = new ToggleBoxClient({
    platform: "web",
    environment: "production",
    apiUrl: process.env.TOGGLEBOX_URL!,
  });

  try {
    await client.trackConversion(
      experimentKey,
      { userId },
      {
        metricName: "purchase",
        value: amount,
      },
    );

    // Flush stats immediately
    await client.flushStats();

    return NextResponse.json({ success: true });
  } finally {
    client.destroy();
  }
}
```

---

## Client-Side Examples

### Auto-Refresh Polling

```tsx
<ToggleBoxProvider
  platform="web"
  environment="production"
  apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
  pollingInterval={60000} // Poll every minute
>
  {children}
</ToggleBoxProvider>
```

### Manual Refresh

```tsx
function RefreshButton() {
  const { refresh, isLoading } = useConfig();

  return (
    <button onClick={refresh} disabled={isLoading}>
      {isLoading ? "Refreshing..." : "Refresh Config"}
    </button>
  );
}
```

### Error Handling

```tsx
function ConfigLoader({ children }: { children: React.ReactNode }) {
  const { config, isLoading, error, refresh } = useConfig();

  if (isLoading && !config) {
    return <LoadingScreen />;
  }

  if (error && !config) {
    return (
      <ErrorScreen message="Failed to load configuration" onRetry={refresh} />
    );
  }

  return <>{children}</>;
}
```

### Percentage-Based Rollout

```tsx
function CheckoutPage() {
  const { isFlagEnabled } = useFlags();
  const { user } = useAuth();
  const [useNewCheckout, setUseNewCheckout] = useState(false);

  useEffect(() => {
    // Flag configured with 25% rollout in dashboard
    // userId is used for consistent hashing
    isFlagEnabled("new-checkout", { userId: user.id }).then(setUseNewCheckout);
  }, [user.id, isFlagEnabled]);

  return useNewCheckout ? <NewCheckout /> : <LegacyCheckout />;
}
```

### Combining Configs and Flags

```tsx
function FeatureCard({ featureName }: { featureName: string }) {
  const config = useConfig();
  const { checkEnabled } = useFlag(featureName);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    checkEnabled().then(setIsEnabled);
  }, [checkEnabled]);

  // Use config for static settings, flags for dynamic on/off
  const featureConfig = config?.features?.[featureName] || {};

  if (!isEnabled) return null;

  return (
    <Card
      title={featureConfig.title}
      description={featureConfig.description}
      icon={featureConfig.icon}
    />
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
  useConfig,
  useFlags,
  useFlag,
  useExperiments,
  useExperiment,
  useAnalytics,
  useToggleBoxClient,
  getServerSideConfig,
  getStaticConfig,
} from "@togglebox/sdk-nextjs";

import type {
  ToggleBoxProviderProps,
  ToggleBoxContextValue,
  UseConfigResult,
  UseFlagsResult,
  UseExperimentsResult,
  UseAnalyticsResult,
  ClientOptions,
  Config,
  Flag,
  FlagContext,
  FlagResult,
  Experiment,
  ExperimentContext,
  VariantAssignment,
} from "@togglebox/sdk-nextjs";
```

---

## Requirements

- Next.js 13+ (App Router or Pages Router)
- React 18+

---

## License

MIT
