# @togglebox/sdk-nextjs

Next.js SDK for [ToggleBox](https://github.com/ulpi-io/togglebox) - Remote configuration, feature flags, and A/B experiments.

## Installation

```bash
npm install @togglebox/sdk-nextjs
# or
pnpm add @togglebox/sdk-nextjs
```

## Quick Start

### Client Components (Hooks)

```tsx
// app/providers.tsx
"use client";

import { ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="staging"
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_API_URL!}
      apiKey={process.env.NEXT_PUBLIC_TOGGLEBOX_API_KEY} // Optional
    >
      {children}
    </ToggleBoxProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Server Components

```tsx
// app/page.tsx
import { getConfig, getFlag, getExperiment } from "@togglebox/sdk-nextjs/server";

const serverOptions = {
  platform: "web",
  environment: "staging",
  apiUrl: process.env.TOGGLEBOX_API_URL!,
  apiKey: process.env.TOGGLEBOX_API_KEY, // Optional
};

export default async function Page() {
  const [
    { config, getConfigValue },
    { enabled: darkModeEnabled },
    { variant },
  ] = await Promise.all([
    getConfig(serverOptions),
    getFlag("dark-mode", { userId: "user-123" }, serverOptions),
    getExperiment("checkout-test", { userId: "user-123" }, serverOptions),
  ]);

  const theme = getConfigValue("theme", "light");

  return (
    <div className={darkModeEnabled ? "dark" : "light"}>
      <h1>Theme: {theme}</h1>
      <p>Variant: {variant?.variationKey}</p>
    </div>
  );
}
```

## Three-Tier Architecture

| Tier | Feature        | Client Hook       | Server Function   |
| ---- | -------------- | ----------------- | ----------------- |
| 1    | Remote Configs | `useConfig()`     | `getConfig()`     |
| 2    | Feature Flags  | `useFlags()`      | `getFlags()`      |
| 2    | Single Flag    | `useFlag()`       | `getFlag()`       |
| 3    | Experiments    | `useExperiments()`| `getExperiments()`|
| 3    | Single Experiment | `useExperiment()` | `getExperiment()` |
| -    | Analytics      | `useAnalytics()`  | `getAnalytics()`  |

## Client Hooks API

Import from `@togglebox/sdk-nextjs`:

### useConfig

```tsx
const { config, getConfigValue, isLoading, error, refresh } = useConfig();

// Get typed config value with default
const theme = await getConfigValue("theme", "light");
const maxRetries = await getConfigValue<number>("max_retries", 3);
```

### useFlags

```tsx
const { flags, isFlagEnabled, isLoading, error, refresh } = useFlags();

// Check if a flag is enabled for a user
const enabled = await isFlagEnabled("new-checkout", { userId: "user-123" });
```

### useFlag

```tsx
const { flag, exists, isLoading, checkEnabled } = useFlag("dark-mode", { userId });

// Check if enabled
const enabled = await checkEnabled();
```

### useExperiments

```tsx
const { experiments, getVariant, isLoading, error, refresh } = useExperiments();

// Get variant assignment
const variant = await getVariant("checkout-test", { userId: "user-123" });
console.log(variant?.variationKey); // "control", "variant_1", etc.
```

### useExperiment

```tsx
const { experiment, exists, isLoading, getVariant } = useExperiment("checkout-test", { userId });

// Get assigned variant
const variant = await getVariant();
```

### useAnalytics

```tsx
const { trackEvent, trackConversion, flushStats } = useAnalytics();

// Track custom event
trackEvent("button_click", { userId }, { properties: { button: "checkout" } });

// Track conversion for experiment
await trackConversion("checkout-test", { userId }, {
  metricName: "purchase",
  value: 99.99,
});

// Flush pending stats
await flushStats();
```

## Server Functions API

Import from `@togglebox/sdk-nextjs/server`:

### getConfig

```tsx
const { config, getConfigValue } = await getConfig(serverOptions);

const theme = getConfigValue("theme", "light");
```

### getFlags

```tsx
const { flags, isFlagEnabled } = await getFlags(serverOptions);

const enabled = isFlagEnabled("new-checkout", { userId: "user-123" });
```

### getFlag

```tsx
const { flag, exists, enabled } = await getFlag("dark-mode", { userId: "user-123" }, serverOptions);

if (enabled) {
  // Show dark mode
}
```

### getExperiments

```tsx
const { experiments, getVariant } = await getExperiments(serverOptions);

const variant = getVariant("checkout-test", { userId: "user-123" });
```

### getExperiment

```tsx
const { experiment, exists, variant } = await getExperiment(
  "checkout-test",
  { userId: "user-123" },
  serverOptions
);

if (variant?.variationKey === "new-checkout") {
  // Show new checkout
}
```

### getAnalytics

```tsx
const { trackEvent, trackConversion, flushStats } = await getAnalytics(serverOptions);

await trackConversion("checkout-test", { userId }, { metricName: "purchase", value: 99.99 });
await flushStats(); // Always call to send events and cleanup
```

## Provider Configuration

```tsx
<ToggleBoxProvider
  // Required
  platform="web"
  environment="staging"

  // API Configuration (choose one)
  apiUrl="https://your-api.com/api/v1"    // Self-hosted
  // OR
  tenantSubdomain="acme"                   // Cloud: https://acme.togglebox.dev

  // Optional
  apiKey="tb_live_xxxxx"                   // API key for authentication
  configVersion="stable"                   // "stable", "latest", or specific version

  // Caching
  cache={{
    enabled: true,
    ttl: 300000,                           // 5 minutes
  }}

  // Auto-refresh
  pollingInterval={60000}                  // Poll every minute (0 to disable)

  // SSR Hydration (from server fetch)
  initialConfig={serverConfig}
  initialFlags={serverFlags}
  initialExperiments={serverExperiments}
>
  {children}
</ToggleBoxProvider>
```

## SSR with Hydration

Fetch data on the server and hydrate the client:

```tsx
// app/layout.tsx
import { getConfig, getFlags, getExperiments } from "@togglebox/sdk-nextjs/server";
import { Providers } from "./providers";

const serverOptions = {
  platform: "web",
  environment: "staging",
  apiUrl: process.env.TOGGLEBOX_API_URL!,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ config }, { flags }, { experiments }] = await Promise.all([
    getConfig(serverOptions),
    getFlags(serverOptions),
    getExperiments(serverOptions),
  ]);

  return (
    <html>
      <body>
        <Providers
          initialConfig={config}
          initialFlags={flags}
          initialExperiments={experiments}
        >
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

## Examples

### Feature Flag with Loading State

```tsx
"use client";

import { useFlag } from "@togglebox/sdk-nextjs";
import { useEffect, useState } from "react";

function Dashboard() {
  const { isLoading, checkEnabled } = useFlag("new-dashboard");
  const [showNewUI, setShowNewUI] = useState(false);

  useEffect(() => {
    checkEnabled().then(setShowNewUI);
  }, [checkEnabled]);

  if (isLoading) return <Spinner />;

  return showNewUI ? <NewDashboard /> : <LegacyDashboard />;
}
```

### Experiment with Conversion Tracking

```tsx
"use client";

import { useExperiment, useAnalytics } from "@togglebox/sdk-nextjs";
import { useEffect, useState } from "react";

function CheckoutPage({ userId }: { userId: string }) {
  const { getVariant } = useExperiment("checkout-test", { userId });
  const { trackConversion, flushStats } = useAnalytics();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    getVariant().then((v) => setVariant(v?.variationKey || null));
  }, [getVariant]);

  const handlePurchase = async (amount: number) => {
    // Process payment...

    await trackConversion("checkout-test", { userId }, {
      metricName: "purchase",
      value: amount,
    });
    await flushStats();
  };

  if (variant === "one-page") return <OnePageCheckout onPurchase={handlePurchase} />;
  if (variant === "express") return <ExpressCheckout onPurchase={handlePurchase} />;
  return <DefaultCheckout onPurchase={handlePurchase} />;
}
```

### Manual Refresh

```tsx
"use client";

import { useConfig } from "@togglebox/sdk-nextjs";

function RefreshButton() {
  const { refresh, isLoading } = useConfig();

  return (
    <button onClick={refresh} disabled={isLoading}>
      {isLoading ? "Refreshing..." : "Refresh Config"}
    </button>
  );
}
```

## TypeScript

Full TypeScript support:

```typescript
// Client imports
import {
  ToggleBoxProvider,
  useConfig,
  useFlags,
  useFlag,
  useExperiments,
  useExperiment,
  useAnalytics,
} from "@togglebox/sdk-nextjs";

// Server imports
import {
  getConfig,
  getFlags,
  getFlag,
  getExperiments,
  getExperiment,
  getAnalytics,
} from "@togglebox/sdk-nextjs/server";

// Types
import type {
  ToggleBoxProviderProps,
  UseConfigResult,
  UseFlagsResult,
  UseExperimentsResult,
  UseAnalyticsResult,
  Config,
  Flag,
  FlagContext,
  Experiment,
  ExperimentContext,
  VariantAssignment,
  ConversionData,
  EventData,
} from "@togglebox/sdk-nextjs";

import type {
  ServerOptions,
  ServerConfigResult,
  ServerFlagsResult,
  ServerFlagResult,
  ServerExperimentsResult,
  ServerExperimentResult,
  ServerAnalyticsResult,
} from "@togglebox/sdk-nextjs/server";
```

## Requirements

- Next.js 14+ (App Router)
- React 18+ or 19+

## License

MIT
