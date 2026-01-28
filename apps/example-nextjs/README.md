# ToggleBox Next.js Example App

A comprehensive "kitchen sink" demo showing how to integrate the ToggleBox SDK into Next.js applications. Every example is **copy-paste ready** with working code you can use directly in your projects.

---

## Overview

This example app demonstrates all three tiers of ToggleBox:

| Tier       | Feature        | Client Hook                     | Server Function               |
| ---------- | -------------- | ------------------------------- | ----------------------------- |
| **Tier 1** | Remote Configs | `useConfig()`                   | `getConfig()`                 |
| **Tier 2** | Feature Flags  | `useFlags()`, `useFlag()`       | `getFlags()`, `getFlag()`     |
| **Tier 3** | Experiments    | `useExperiments()`, `useExperiment()` | `getExperiments()`, `getExperiment()` |
| **-**      | Analytics      | `useAnalytics()`                | `getAnalytics()`              |

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.x
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

# Configure environment (optional - has defaults)
cp apps/example-nextjs/.env.example apps/example-nextjs/.env.local

# Start the example app
pnpm dev:example-nextjs
```

The app runs at `http://localhost:3002`.

### Demo Data

The seed script creates demo data for this app:

| Type            | Key                   | Description                             |
| --------------- | --------------------- | --------------------------------------- |
| **Platform**    | `web`                 | Platform identifier                     |
| **Environment** | `staging`             | Environment for this app                |
| **Flag**        | `dark-mode`           | Toggle dark mode UI                     |
| **Flag**        | `beta-features`       | Enable beta features                    |
| **Experiment**  | `checkout-test`       | A/B test with `control` and `variant_a` |
| **Config**      | `theme`, `apiTimeout` | Remote configuration values             |

**Demo Admin:** `admin@togglebox.com` / `Parola123!`

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_TOGGLEBOX_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_TOGGLEBOX_PLATFORM=web
NEXT_PUBLIC_TOGGLEBOX_ENVIRONMENT=development
NEXT_PUBLIC_TOGGLEBOX_API_KEY=your-api-key  # Required if API has auth enabled
```

---

## App Structure

```
src/app/
├── page.tsx                        # Homepage
├── layout.tsx                      # Root layout with SSR data fetching
├── providers.tsx                   # ToggleBoxProvider configuration
└── examples/
    ├── page.tsx                    # Examples index
    ├── quick/                      # Quick Start examples (5)
    │   ├── use-config/             # Fetch remote configuration
    │   ├── use-flag/               # Check feature flags
    │   ├── use-experiment/         # Get experiment variants
    │   ├── track-event/            # Track analytics events
    │   └── ssr-config/             # Server-side data fetching
    └── full/                       # Full Examples (6)
        ├── feature-toggle/         # Full feature flag implementation
        ├── ab-test-cta/            # A/B test with CTA buttons
        ├── config-theme/           # Theme switching with config
        ├── ssr-hydration/          # SSR with client hydration
        ├── polling-updates/        # Auto-refresh with polling
        └── error-handling/         # Error states & retry
```

---

## Quick Start Examples

### 1. Remote Config (useConfig)

**File:** `src/app/examples/quick/use-config/page.tsx`

Fetch and display remote configuration:

```tsx
"use client";

import { useConfig } from "@togglebox/sdk-nextjs";

export default function ConfigExample() {
  const { config, isLoading } = useConfig();

  if (isLoading) return <div>Loading config...</div>;

  return (
    <div>
      <h2>Remote Config</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  );
}
```

### 2. Feature Flags (useFlags)

**File:** `src/app/examples/quick/use-flag/page.tsx`

Check if a feature flag is enabled:

```tsx
"use client";

import { useFlags } from "@togglebox/sdk-nextjs";
import { useState, useEffect } from "react";

export default function FlagExample() {
  const { isFlagEnabled, isLoading } = useFlags();
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  useEffect(() => {
    async function checkFlag() {
      const enabled = await isFlagEnabled("dark-mode", {
        userId: "user-123",
        country: "US",
      });
      setDarkModeEnabled(enabled);
    }
    if (!isLoading) checkFlag();
  }, [isLoading, isFlagEnabled]);

  return (
    <div className={darkModeEnabled ? "bg-gray-900 text-white" : "bg-white"}>
      {darkModeEnabled ? "🌙 Dark Mode" : "☀️ Light Mode"}
    </div>
  );
}
```

### 3. Experiments (useExperiment)

**File:** `src/app/examples/quick/use-experiment/page.tsx`

Get assigned variant for an experiment:

```tsx
"use client";

import { useExperiments } from "@togglebox/sdk-nextjs";
import { useState, useEffect } from "react";

export default function ExperimentExample() {
  const { getVariant, isLoading } = useExperiments();
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    async function assignVariant() {
      const result = await getVariant("checkout-test", { userId: "user-123" });
      setVariant(result);
    }
    if (!isLoading) assignVariant();
  }, [isLoading, getVariant]);

  return (
    <div>
      {variant === "one-click" ? (
        <button>One-Click Checkout</button>
      ) : (
        <button>Standard Checkout</button>
      )}
    </div>
  );
}
```

### 4. Event Tracking (useAnalytics)

**File:** `src/app/examples/quick/track-event/page.tsx`

Track analytics events:

```tsx
"use client";

import { useAnalytics } from "@togglebox/sdk-nextjs";

export default function TrackingExample() {
  const { trackEvent } = useAnalytics();

  const handlePurchase = () => {
    trackEvent(
      "purchase_completed",
      {
        userId: "user-123",
      },
      {
        properties: { value: 99.99, currency: "USD" },
      },
    );
  };

  return <button onClick={handlePurchase}>Complete Purchase</button>;
}
```

### 5. Server-Side Data Fetching

**File:** `src/app/examples/quick/ssr-config/page.tsx`

Fetch config, flags, and experiments on the server for SSR:

```tsx
import { getConfig, getFlag, getExperiment } from "@togglebox/sdk-nextjs/server";

const serverOptions = {
  platform: "web",
  environment: "staging",
  apiUrl: process.env.TOGGLEBOX_API_URL!,
  apiKey: process.env.TOGGLEBOX_API_KEY, // Optional
};

export default async function SSRPage() {
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

---

## Complete Examples

### Feature Toggle

**File:** `src/app/examples/full/feature-toggle/page.tsx`

Full implementation showing:

- Flag evaluation with user context
- Loading states
- Conditional UI rendering

### A/B Test CTA

**File:** `src/app/examples/full/ab-test-cta/page.tsx`

Complete A/B test implementation:

- Variant assignment
- Different CTA buttons per variant
- Conversion tracking

### Config Theme

**File:** `src/app/examples/full/config-theme/page.tsx`

Theme switching with remote config:

- Dynamic theme loading
- CSS variable application
- Config-driven styling

### SSR Hydration

**File:** `src/app/examples/full/ssr-hydration/page.tsx`

Server-side rendering with client hydration:

- Fetch config/flags/experiments on server
- Pass to client via `initialConfig`, `initialFlags`, `initialExperiments` props
- No loading flash on client

```tsx
// Server Component (app/layout.tsx)
import { getConfig, getFlags, getExperiments } from "@togglebox/sdk-nextjs/server";
import { Providers } from "./providers";

const serverOptions = {
  platform: "web",
  environment: "staging",
  apiUrl: process.env.TOGGLEBOX_API_URL!,
};

export default async function RootLayout({ children }) {
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

// Client Provider (app/providers.tsx)
"use client";
import { ToggleBoxProvider } from "@togglebox/sdk-nextjs";

export function Providers({ children, initialConfig, initialFlags, initialExperiments }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="staging"
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_API_URL!}
      initialConfig={initialConfig}
      initialFlags={initialFlags}
      initialExperiments={initialExperiments}
    >
      {children}
    </ToggleBoxProvider>
  );
}
```

### Polling Updates

**File:** `src/app/examples/full/polling-updates/page.tsx`

Auto-refresh configuration:

- Polling interval configuration
- Manual refresh trigger
- Real-time updates display

### Error Handling

**File:** `src/app/examples/full/error-handling/page.tsx`

Graceful error handling with:

- Error state detection
- Retry button
- Cached data fallback
- Loading skeletons

---

## Provider Configuration

The `ToggleBoxProvider` accepts these props:

```tsx
<ToggleBoxProvider
  // Required
  platform="web"                    // Your platform name
  environment="production"          // Environment (production, staging, etc.)
  apiUrl="https://api.example.com"  // ToggleBox API URL

  // Authentication (required if API has ENABLE_AUTHENTICATION=true)
  apiKey="your-api-key"             // Sent as X-API-Key header on all requests
  pollingInterval={30000}           // Auto-refresh interval (ms)
  configVersion="stable"            // Config version (stable, latest, or semver)

  // SSR Hydration
  initialConfig={serverConfig}      // Pre-fetched config from server
  initialFlags={serverFlags}        // Pre-fetched flags from server
  initialExperiments={serverExps}   // Pre-fetched experiments from server
>
```

---

## Hooks Reference

### Tier 1: Config

#### useConfig()

```tsx
const {
  config, // Config | null
  getConfigValue, // <T>(key: string, defaultValue: T) => Promise<T>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useConfig();
```

### Tier 2: Feature Flags

#### useFlags()

```tsx
const {
  flags, // Flag[]
  isFlagEnabled, // (flagKey: string, context?: FlagContext) => Promise<boolean>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useFlags();
```

#### useFlag()

```tsx
const {
  flag, // Flag | undefined
  exists, // boolean
  isLoading, // boolean
  checkEnabled, // () => Promise<boolean>
} = useFlag("dark-mode", { userId: "user-123" });
```

### Tier 3: Experiments

#### useExperiments()

```tsx
const {
  experiments, // Experiment[]
  getVariant, // (experimentKey: string, context: ExperimentContext) => Promise<string | null>
  isLoading, // boolean
  error, // Error | null
  refresh, // () => Promise<void>
} = useExperiments();
```

#### useExperiment()

```tsx
const {
  experiment, // Experiment | undefined
  exists, // boolean
  isLoading, // boolean
  getVariant, // () => Promise<string | null>
} = useExperiment("checkout-test", { userId: "user-123" });
```

### Analytics

#### useAnalytics()

```tsx
const {
  trackEvent, // (eventName: string, context: ExperimentContext, data?: EventData) => void
  trackConversion, // (experimentKey: string, context: ExperimentContext, data: ConversionData) => Promise<void>
  flushStats, // () => Promise<void>
} = useAnalytics();
```

## Server Functions Reference

Import from `@togglebox/sdk-nextjs/server`:

```tsx
import {
  getConfig,
  getFlags,
  getFlag,
  getExperiments,
  getExperiment,
  getAnalytics,
} from "@togglebox/sdk-nextjs/server";
```

### getConfig()

```tsx
const { config, getConfigValue } = await getConfig(serverOptions);
const theme = getConfigValue("theme", "light");
```

### getFlags() / getFlag()

```tsx
// Bulk
const { flags, isFlagEnabled } = await getFlags(serverOptions);
const enabled = isFlagEnabled("new-checkout", { userId: "user-123" });

// Single
const { flag, exists, enabled } = await getFlag("dark-mode", { userId: "user-123" }, serverOptions);
```

### getExperiments() / getExperiment()

```tsx
// Bulk
const { experiments, getVariant } = await getExperiments(serverOptions);
const variant = getVariant("checkout-test", { userId: "user-123" });

// Single
const { experiment, exists, variant } = await getExperiment("checkout-test", { userId: "user-123" }, serverOptions);
if (variant?.variationKey === "new-checkout") { /* ... */ }
```

### getAnalytics()

```tsx
const { trackEvent, trackConversion, flushStats } = await getAnalytics(serverOptions);
await trackConversion("checkout-test", { userId: "user-123" }, { metricName: "purchase", value: 99.99 });
await flushStats(); // Always call to send events and cleanup
```

---

## SDK Documentation

For complete SDK documentation, see:

- [SDK-NextJS README](../../packages/sdk-nextjs/README.md)
- [SDK-JS README](../../packages/sdk-js/README.md)

---

## License

This example app is part of ToggleBox and is licensed under the Elastic License 2.0 (ELv2).
