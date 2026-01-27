# @togglebox/sdk

JavaScript/TypeScript SDK for ToggleBox - Remote configuration, feature flags, and A/B experiments.

## Installation

```bash
npm install @togglebox/sdk
# or
yarn add @togglebox/sdk
# or
pnpm add @togglebox/sdk
```

## Quick Start

### Open Source Self-Hosted

```typescript
import { ToggleBoxClient } from '@togglebox/sdk'

const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: 'https://your-domain.com',
  // apiKey: process.env.TOGGLEBOX_API_KEY, // Optional: only if auth is enabled
})

// Get configuration
const config = await client.getConfig()

// Check feature flag
const showNewUI = await client.isFlagEnabled('new-dashboard', { userId: 'user-123' })
```

### Cloud Multi-Tenant

```typescript
import { ToggleBoxClient } from '@togglebox/sdk'

const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme', // Connects to https://acme.togglebox.io
  apiKey: process.env.TOGGLEBOX_API_KEY, // Required for cloud
})
```

## Connection Health Check

Verify API connectivity before using the SDK:

```typescript
const health = await client.checkConnection()
if (health.success) {
  console.log(`API is healthy, uptime: ${health.uptime}s`)
}
```

---

## Three-Tier Architecture

ToggleBox provides three complementary systems for controlling your application:

| Tier | System | Use Case | Values |
|------|--------|----------|--------|
| 1 | Remote Configs | Static settings, same for everyone | Any JSON |
| 2 | Feature Flags | On/off switches with targeting | A or B |
| 3 | Experiments | Multi-variant A/B testing | Multiple variants |

---

## Tier 1: Remote Configs

Configs are **versioned, immutable snapshots** of application settings. Use them for:
- API endpoints and service URLs
- UI themes and branding
- Default values and limits
- Environment-specific settings

### Get All Configuration

```typescript
const config = await client.getConfig()

// Access your settings
const apiBaseUrl = config.apiBaseUrl              // 'https://api.example.com'
const theme = config.theme                         // { primaryColor: '#007AFF', ... }
const maxUploadSize = config.limits.maxUploadSize // 10485760
```

### Get Specific Config Value

```typescript
// Type-safe config access with defaults
const apiUrl = await client.getConfigValue<string>('api_url', 'https://default.api.com')
const maxRetries = await client.getConfigValue<number>('max_retries', 3)
const features = await client.getConfigValue<string[]>('enabled_features', ['basic'])

// Complex objects
const theme = await client.getConfigValue<{ primary: string; secondary: string }>(
  'theme',
  { primary: '#000', secondary: '#fff' }
)
```

### Version-Specific Configs

```typescript
// Fetch the latest stable version (default)
const stableConfig = await client.getConfig()

// Fetch a specific version for rollback
const v1Config = await client.getConfigVersion('1.2.3')

// Fetch the absolute latest (may be unstable)
const latestConfig = await client.getConfigVersion('latest')

// Pin client to always fetch a specific version
const client = new ToggleBoxClient({
  platform: 'mobile',
  environment: 'production',
  apiUrl: 'https://api.example.com',
  configVersion: '2.0.0', // All getConfig() calls fetch this version
})
```

### List Config Versions

```typescript
// Get all available config versions
const versions = await client.getConfigVersions()

versions.forEach((v) => {
  console.log(`${v.versionLabel} - stable: ${v.isStable}, created: ${v.createdAt}`)
})

// Find the latest stable version
const stableVersion = versions.find((v) => v.isStable)
```

---

## Tier 2: Feature Flags

Feature flags are **2-value switches** (A or B) with targeting rules. Use them for:
- Gradual rollouts (1% → 10% → 50% → 100%)
- Country/language targeting
- User-specific features (beta users, premium plans)
- Kill switches for quick rollbacks

### Check Flag Enabled

```typescript
// Simple check (returns true if value A is served)
const showNewDashboard = await client.isFlagEnabled('new-dashboard', {
  userId: 'user-123',
})

// With full targeting context
const hasPremiumFeatures = await client.isFlagEnabled('premium-features', {
  userId: 'user-123',
  country: 'US',
  language: 'en',
})
```

### Get Flag Evaluation Result

```typescript
// Get detailed evaluation result
const result = await client.getFlag('ui-version', {
  userId: 'user-123',
  country: 'US',
})

console.log(result)
// {
//   servedValue: 'A',         // 'A' or 'B'
//   valueA: 'new-ui',         // Value when A is served
//   valueB: 'legacy-ui',      // Value when B is served
//   reason: 'percentage_rollout' // Why this value was chosen
// }
```

### Get All Flags

```typescript
const allFlags = await client.getFlags()
// Returns array of Flag objects
```

### Get Flag Info

Get a specific flag's metadata without evaluation:

```typescript
const flagInfo = await client.getFlagInfo('new-dashboard')

if (flagInfo) {
  console.log(`Flag: ${flagInfo.flagKey}`)
  console.log(`Enabled: ${flagInfo.enabled}`)
  console.log(`Rollout: ${flagInfo.rolloutPercentage}%`)
  console.log(`Target Countries: ${flagInfo.targetCountries?.join(', ')}`)
}
```

---

## Tier 3: Experiments

Experiments enable **multi-variant A/B testing** with statistical tracking. Use them for:
- Testing multiple UI variations
- Measuring conversion impact
- Data-driven product decisions

### Get Experiment Variant

```typescript
const assignment = await client.getVariant('checkout-experiment', {
  userId: 'user-123',
})

if (assignment) {
  console.log(`Assigned to: ${assignment.variationKey}`)
  // 'control', 'variant-a', 'variant-b', etc.

  // Apply the variant
  switch (assignment.variationKey) {
    case 'control':
      renderOriginalCheckout()
      break
    case 'variant-a':
      renderSimplifiedCheckout()
      break
    case 'variant-b':
      renderOneClickCheckout()
      break
  }
}
```

### Track Conversions

Track user conversions to measure experiment effectiveness:

```typescript
// Track a simple conversion
await client.trackConversion(
  'checkout-experiment',
  { userId: 'user-123' },
  { metricName: 'purchase' }
)

// Track with a value (e.g., revenue)
await client.trackConversion(
  'checkout-experiment',
  { userId: 'user-123' },
  {
    metricName: 'purchase',
    value: 99.99, // Revenue amount
  }
)
```

### Get All Experiments

```typescript
const experiments = await client.getExperiments()
// Returns array of Experiment objects
```

### Get Experiment Info

Get a specific experiment's metadata without assignment:

```typescript
const expInfo = await client.getExperimentInfo('checkout-test')

if (expInfo) {
  console.log(`Experiment: ${expInfo.experimentKey}`)
  console.log(`Status: ${expInfo.status}`)
  console.log(`Variations: ${expInfo.variations.length}`)
  expInfo.variations.forEach((v) => {
    console.log(`  - ${v.variationKey}: ${v.weight}%`)
  })
}
```

---

## User Context

Context is used for targeting rules in flags and experiments. Set it globally or per-evaluation.

### Global Context

```typescript
// Set global context (applied to all evaluations)
client.setContext({
  userId: 'user-123',
  userEmail: 'user@example.com',
  country: 'US',
  language: 'en',
  plan: 'premium',
  betaTester: true,
  companyId: 'company-456',
})

// All subsequent calls use global context
const showNewUI = await client.isFlagEnabled('new-ui', {})
```

### Per-Evaluation Context

```typescript
// Override global context for specific evaluation
const showNewUI = await client.isFlagEnabled('new-ui', {
  userId: 'user-456', // Overrides global userId
  country: 'GB',      // Overrides global country
})

// Get current global context
const currentContext = client.getContext()
```

### Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `userId` | string | Unique user identifier (required for consistent hashing) |
| `userEmail` | string | User email for targeting |
| `country` | string | ISO country code (e.g., 'US', 'GB') |
| `language` | string | Language code (e.g., 'en', 'fr') |
| `plan` | string | Subscription plan for targeting |
| `*` | any | Custom attributes for targeting rules |

---

## API Key Authentication

Use API keys when your ToggleBox API has authentication enabled.

### Self-Hosted with Authentication Enabled

When you enable authentication on your self-hosted instance (`ENABLE_AUTHENTICATION=true`):

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: 'https://your-api.example.com',
  apiKey: process.env.TOGGLEBOX_API_KEY, // Your API key from admin dashboard
})
```

### Cloud Multi-Tenant (Always Required)

Cloud deployments always require authentication:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme', // Your tenant subdomain
  apiKey: process.env.TOGGLEBOX_API_KEY, // Required for cloud
})
```

The API key is sent with every request as the `X-API-Key` header.

**Note:** If you're using an open-source self-hosted instance without authentication enabled, you don't need to provide an API key.

---

## Stats & Analytics

The SDK automatically tracks flag evaluations, experiment exposures, and conversions. Configure the stats reporter:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: 'https://api.example.com',
  stats: {
    enabled: true,           // Enable stats collection (default: true)
    batchSize: 20,           // Events to batch before sending (default: 20)
    flushIntervalMs: 10000,  // Flush interval in ms (default: 10000)
    maxRetries: 3,           // Retry attempts for failed sends (default: 3)
  },
})

// Listen for stats flush events
client.on('statsFlush', ({ eventCount }) => {
  console.log(`Flushed ${eventCount} stats events`)
})

// Manually flush pending events
await client.flushStats()
```

### What Gets Tracked

- **Config fetches**: When `getConfigValue()` is called
- **Flag evaluations**: When `getFlag()` or `isFlagEnabled()` is called
- **Experiment exposures**: When `getVariant()` is called
- **Conversions**: When `trackConversion()` is called

---

## Caching

Enable in-memory caching to reduce API calls:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: 'https://api.example.com',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes in milliseconds
  },
})
```

---

## Auto-Refresh Polling

Automatically poll for configuration updates:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: 'https://api.example.com',
  pollingInterval: 60000, // Poll every minute
})

// Listen for updates
client.on('update', ({ config, flags, experiments }) => {
  console.log('Configuration updated:', config)
  console.log('Flags updated:', flags)
  console.log('Experiments updated:', experiments)
})

client.on('error', (error) => {
  console.error('Polling error:', error)
})

// Stop polling
client.stopPolling()
```

---

## Configuration Options

```typescript
interface ClientOptions {
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
   */
  tenantSubdomain?: string

  /** API key for authentication (sent as X-API-Key header) */
  apiKey?: string

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
    ttl: number // milliseconds
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Stats configuration */
  stats?: {
    enabled?: boolean       // default: true
    batchSize?: number      // default: 20
    flushIntervalMs?: number // default: 10000
    maxRetries?: number     // default: 3
  }

  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch
}
```

**Note:** You must provide either `apiUrl` OR `tenantSubdomain`, not both.

---

## API Methods

### Connection & Health

| Method | Description |
|--------|-------------|
| `checkConnection()` | Verify API connectivity and get health status |

### Remote Configs (Tier 1)

| Method | Description |
|--------|-------------|
| `getConfig()` | Get configuration using configured version (default: stable) |
| `getConfigVersion(version)` | Get a specific config version |
| `getConfigValue<T>(key, defaultValue)` | Get a specific config value with type safety |
| `getAllConfigs()` | Alias for getConfig() |
| `getConfigVersions()` | List all config versions with metadata |

### Feature Flags (Tier 2)

| Method | Description |
|--------|-------------|
| `getFlags()` | Get all feature flags |
| `getFlag(flagKey, context)` | Get detailed flag evaluation result |
| `isFlagEnabled(flagKey, context, defaultValue?)` | Check if flag is enabled (A = true) |
| `getFlagInfo(flagKey)` | Get flag metadata without evaluation |

### Experiments (Tier 3)

| Method | Description |
|--------|-------------|
| `getExperiments()` | Get all experiments |
| `getVariant(experimentKey, context)` | Get assigned variant for a user |
| `trackConversion(experimentKey, context, data)` | Track a conversion event |
| `trackEvent(eventName, context, data?)` | Track a custom event |
| `getExperimentInfo(experimentKey)` | Get experiment metadata without assignment |

### Context & Lifecycle

| Method | Description |
|--------|-------------|
| `setContext(context)` | Set global evaluation context |
| `getContext()` | Get current global context |
| `refresh()` | Force refresh all cached data |
| `flushStats()` | Flush pending stats events |
| `on(event, callback)` | Listen for events ('update', 'error', 'statsFlush') |
| `off(event, callback)` | Remove event listener |
| `stopPolling()` | Stop auto-refresh polling |
| `destroy()` | Stop polling and cleanup resources |

---

## Real-World Examples

### Feature Rollout with Percentage

```typescript
// In ToggleBox dashboard, create flag 'new-checkout' with:
// - rolloutType: 'percentage'
// - rolloutPercentage: 25

const showNewCheckout = await client.isFlagEnabled('new-checkout', {
  userId: user.id, // Used for consistent hashing
})

if (showNewCheckout) {
  renderNewCheckout()
} else {
  renderLegacyCheckout()
}
```

### Country-Targeted Feature

```typescript
// Flag 'eu-privacy-banner' with targetCountries: ['DE', 'FR', 'IT', ...]
const showPrivacyBanner = await client.isFlagEnabled('eu-privacy-banner', {
  userId: user.id,
  country: user.country, // 'DE', 'US', etc.
})
```

### A/B Test with Revenue Tracking

```typescript
// Get variant assignment
const assignment = await client.getVariant('pricing-experiment', {
  userId: user.id,
})

// Render based on variant
if (assignment?.variationKey === 'annual-first') {
  showAnnualPricingFirst()
} else {
  showMonthlyPricingFirst()
}

// Track purchase conversion with revenue
async function onPurchase(amount: number) {
  await client.trackConversion(
    'pricing-experiment',
    { userId: user.id },
    { metricName: 'purchase', value: amount }
  )
}
```

### Environment-Specific Configuration

```typescript
// Different clients for different environments
const prodClient = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  apiUrl: process.env.TOGGLEBOX_API_URL,
})

const stagingClient = new ToggleBoxClient({
  platform: 'web',
  environment: 'staging',
  apiUrl: process.env.TOGGLEBOX_API_URL,
})

// Each fetches environment-specific config and flags
const prodConfig = await prodClient.getConfig()
const stagingConfig = await stagingClient.getConfig()
```

---

## TypeScript

This SDK is written in TypeScript and includes full type definitions.

```typescript
import { ToggleBoxClient } from '@togglebox/sdk'
import type {
  ClientOptions,
  Config,
  Flag,
  FlagContext,
  FlagResult,
  Experiment,
  ExperimentContext,
  VariantAssignment,
  ConversionData,
  StatsOptions,
  HealthCheckResponse,
  ConfigVersionMeta,
} from '@togglebox/sdk'
```

---

## License

MIT
