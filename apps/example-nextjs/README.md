# ToggleBox Next.js Example App

A comprehensive "kitchen sink" demo showing how to integrate the ToggleBox SDK into Next.js applications. Every example is **copy-paste ready** with working code you can use directly in your projects.

---

## Overview

This example app demonstrates all three tiers of ToggleBox:

| Tier | Feature | Use Case |
|------|---------|----------|
| **Tier 1** | Remote Configs | Dynamic settings, themes, API URLs |
| **Tier 2** | Feature Flags | Ship code when ready, release when you want |
| **Tier 3** | Experiments | A/B tests with variant assignment |

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

# Configure environment (optional - has defaults)
cp apps/example-nextjs/.env.example apps/example-nextjs/.env.local

# Start the example app
pnpm dev:example-nextjs
```

The app runs at `http://localhost:3002`.

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
├── page.tsx                    # Homepage with example index
├── layout.tsx                  # Root layout
├── providers.tsx               # ToggleBoxProvider configuration
├── quick/                      # Quick Start examples (6)
│   ├── provider-setup/         # How to set up the provider
│   ├── use-config/             # Fetch remote configuration
│   ├── use-flag/               # Check feature flags
│   ├── use-experiment/         # Get experiment variants
│   ├── track-event/            # Track analytics events
│   └── ssr-config/             # Server-side config fetching
└── examples/                   # Complete Examples (5)
    ├── feature-toggle/         # Full feature flag implementation
    ├── ab-test-cta/            # A/B test with CTA buttons
    ├── config-theme/           # Theme switching with config
    ├── ssr-hydration/          # SSR with client hydration
    └── polling-updates/        # Auto-refresh with polling
```

---

## Quick Start Examples

### 1. Provider Setup

**File:** `src/app/quick/provider-setup/page.tsx`

Wrap your app with `ToggleBoxProvider`:

```tsx
import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export default function RootLayout({ children }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_API_URL!}
      apiKey={process.env.NEXT_PUBLIC_TOGGLEBOX_API_KEY}  // Required if API has auth enabled
      pollingInterval={30000}  // Auto-refresh every 30s
    >
      {children}
    </ToggleBoxProvider>
  )
}
```

### 2. Remote Config (useConfig)

**File:** `src/app/quick/use-config/page.tsx`

Fetch and display remote configuration:

```tsx
'use client'

import { useConfig } from '@togglebox/sdk-nextjs'

export default function ConfigExample() {
  const { config, isLoading } = useConfig()

  if (isLoading) return <div>Loading config...</div>

  return (
    <div>
      <h2>Remote Config</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  )
}
```

### 3. Feature Flags (useFlag)

**File:** `src/app/quick/use-flag/page.tsx`

Check if a feature flag is enabled:

```tsx
'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

export default function FlagExample() {
  const { isFlagEnabled, isLoading } = useToggleBox()
  const [darkModeEnabled, setDarkModeEnabled] = useState(false)

  useEffect(() => {
    async function checkFlag() {
      const enabled = await isFlagEnabled('dark-mode', {
        userId: 'user-123',
        country: 'US',
      })
      setDarkModeEnabled(enabled)
    }
    if (!isLoading) checkFlag()
  }, [isLoading, isFlagEnabled])

  return (
    <div className={darkModeEnabled ? 'bg-gray-900 text-white' : 'bg-white'}>
      {darkModeEnabled ? '🌙 Dark Mode' : '☀️ Light Mode'}
    </div>
  )
}
```

### 4. Experiments (useExperiment)

**File:** `src/app/quick/use-experiment/page.tsx`

Get assigned variant for an experiment:

```tsx
'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'
import { useState, useEffect } from 'react'

export default function ExperimentExample() {
  const { getVariant, isLoading } = useToggleBox()
  const [variant, setVariant] = useState<string | null>(null)

  useEffect(() => {
    async function assignVariant() {
      const result = await getVariant('checkout-test', { userId: 'user-123' })
      setVariant(result)
    }
    if (!isLoading) assignVariant()
  }, [isLoading, getVariant])

  return (
    <div>
      {variant === 'one-click' ? (
        <button>One-Click Checkout</button>
      ) : (
        <button>Standard Checkout</button>
      )}
    </div>
  )
}
```

### 5. Event Tracking

**File:** `src/app/quick/track-event/page.tsx`

Track analytics events:

```tsx
'use client'

import { useToggleBox } from '@togglebox/sdk-nextjs'

export default function TrackingExample() {
  const { trackEvent } = useToggleBox()

  const handlePurchase = () => {
    trackEvent('purchase_completed', {
      userId: 'user-123',
      value: 99.99,
      currency: 'USD',
    })
  }

  return <button onClick={handlePurchase}>Complete Purchase</button>
}
```

### 6. Server-Side Config

**File:** `src/app/quick/ssr-config/page.tsx`

Fetch config on the server for SSR:

```tsx
import { getServerSideConfig } from '@togglebox/sdk-nextjs/server'

export default async function SSRPage() {
  const config = await getServerSideConfig({
    platform: 'web',
    environment: 'production',
    apiUrl: process.env.TOGGLEBOX_API_URL!,
  })

  return (
    <div>
      <h2>Server-Rendered Config</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>
    </div>
  )
}
```

---

## Complete Examples

### Feature Toggle

**File:** `src/app/examples/feature-toggle/page.tsx`

Full implementation showing:
- Flag evaluation with user context
- Loading states
- Conditional UI rendering

### A/B Test CTA

**File:** `src/app/examples/ab-test-cta/page.tsx`

Complete A/B test implementation:
- Variant assignment
- Different CTA buttons per variant
- Conversion tracking

### Config Theme

**File:** `src/app/examples/config-theme/page.tsx`

Theme switching with remote config:
- Dynamic theme loading
- CSS variable application
- Config-driven styling

### SSR Hydration

**File:** `src/app/examples/ssr-hydration/page.tsx`

Server-side rendering with client hydration:
- Fetch config/flags on server
- Pass to client via `initialConfig` prop
- No loading flash on client

```tsx
// Server Component
import { getServerSideConfig, getServerSideFlags } from '@togglebox/sdk-nextjs/server'
import { ClientComponent } from './client'

export default async function SSRPage() {
  const [config, flags] = await Promise.all([
    getServerSideConfig({ platform: 'web', environment: 'production', apiUrl: '...' }),
    getServerSideFlags({ platform: 'web', environment: 'production', apiUrl: '...' }),
  ])

  return <ClientComponent initialConfig={config} initialFlags={flags} />
}

// Client Component
'use client'
import { ToggleBoxProvider } from '@togglebox/sdk-nextjs'

export function ClientComponent({ initialConfig, initialFlags }) {
  return (
    <ToggleBoxProvider
      platform="web"
      environment="production"
      apiUrl="..."
      initialConfig={initialConfig}
      initialFlags={initialFlags}
    >
      <App />
    </ToggleBoxProvider>
  )
}
```

### Polling Updates

**File:** `src/app/examples/polling-updates/page.tsx`

Auto-refresh configuration:
- Polling interval configuration
- Manual refresh trigger
- Real-time updates display

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

### useConfig()

```tsx
const { config, isLoading, error, refresh } = useConfig()
```

### useFlags()

```tsx
const { flags, isLoading, error, refresh } = useFlags()
```

### useExperiments()

```tsx
const { experiments, isLoading, error, refresh } = useExperiments()
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
- [SDK-NextJS README](../../packages/sdk-nextjs/README.md)
- [SDK-JS README](../../packages/sdk-js/README.md)

---

## License

This example app is part of ToggleBox and is licensed under the Elastic License 2.0 (ELv2).
