# @togglebox/sdk

JavaScript/TypeScript SDK for ToggleBox - Remote configuration and feature flag management.

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
})

// Get configuration
const config = await client.getConfig()

// Check feature flag
const isEnabled = await client.isEnabled('new-dashboard')
```

### Cloud Multi-Tenant

```typescript
import { ToggleBoxClient } from '@togglebox/sdk'

const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme', // Connects to https://acme.togglebox.io
})
```

## Configs vs Feature Flags

ToggleBox provides two complementary systems for controlling your application:

### Configs: Static Application Settings

Configs are **versioned, immutable snapshots** of application settings. Use them for:
- API endpoints and service URLs
- UI themes and branding
- Default values and limits
- Environment-specific settings

```typescript
// Fetch the latest stable configuration
const config = await client.getConfig()

// Access your settings
const apiBaseUrl = config.apiBaseUrl              // 'https://api.example.com'
const theme = config.theme                         // { primaryColor: '#007AFF', ... }
const maxUploadSize = config.limits.maxUploadSize // 10485760
const features = config.enabledFeatures           // ['search', 'export', 'notifications']
```

### Feature Flags: Dynamic On/Off Switches

Feature flags are **mutable state** with targeting rules. Use them for:
- Gradual rollouts (1% → 10% → 50% → 100%)
- A/B testing
- User-specific features (beta users, premium plans)
- Kill switches for quick rollbacks

```typescript
// Simple boolean check
const showNewDashboard = await client.isEnabled('new-dashboard')

// With user context for targeted rollouts
const hasPremiumFeatures = await client.isEnabled('premium-features', {
  userId: user.id,
  userEmail: user.email,
  country: user.country,
  plan: user.subscription.plan,
})

// Get detailed evaluation result
const result = await client.evaluateFlag('premium-features', { userId: user.id })
console.log(result)
// { enabled: true, reason: 'user in target list' }
// { enabled: false, reason: 'percentage rollout: 25%' }
```

## Version-Specific Configs

Fetch specific config versions for rollback scenarios or pinned deployments:

```typescript
// Fetch the latest stable version (default)
const stableConfig = await client.getConfig()

// Fetch a specific version
const v1Config = await client.getConfigVersion('1.2.3')

// Fetch the absolute latest (may be unstable)
const latestConfig = await client.getConfigVersion('latest')

// Pin client to always fetch a specific version
const client = new ToggleBoxClient({
  platform: 'mobile',
  environment: 'production',
  tenantSubdomain: 'acme',
  configVersion: '2.0.0', // All getConfig() calls fetch this version
})
```

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
    ttl: number // milliseconds
  }

  /** Auto-refresh polling interval in milliseconds (0 to disable) */
  pollingInterval?: number

  /** Custom fetch implementation (defaults to global fetch) */
  fetchImpl?: typeof fetch
}
```

**Note:** You must provide either `apiUrl` OR `tenantSubdomain`, not both.

## Features

### Caching

Enable in-memory caching to reduce API calls:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme',
  cache: {
    enabled: true,
    ttl: 300000, // 5 minutes
  },
})
```

### Auto-Refresh Polling

Automatically poll for configuration updates:

```typescript
const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme',
  pollingInterval: 60000, // Poll every minute
})

// Listen for updates
client.on('update', ({ config, flags }) => {
  console.log('Configuration updated:', config)
  console.log('Flags updated:', flags)
})

client.on('error', (error) => {
  console.error('Polling error:', error)
})
```

### Feature Flag Evaluation

```typescript
// Simple boolean check
const isEnabled = await client.isEnabled('new-dashboard')

// With evaluation context for targeting
const isEnabled = await client.isEnabled('premium-features', {
  userId: '123',
  userEmail: 'user@example.com',
  country: 'US',
  plan: 'enterprise',
})

// Set global context (applied to all evaluations)
client.setContext({
  userId: '123',
  userEmail: 'user@example.com',
})

// Evaluate with merged context (global + local)
const isEnabled = await client.isEnabled('feature', {
  customAttribute: 'value', // Merged with global context
})

// Get all flags as a simple map
const allFlags = await client.getAllFlags({ userId: '123' })
// { 'new-dashboard': true, 'dark-mode': false, 'beta-features': true }
```

### Manual Refresh

```typescript
// Force refresh config and flags
await client.refresh()
```

### Cleanup

```typescript
// Stop polling and cleanup
client.destroy()
```

## API Methods

| Method | Description |
|--------|-------------|
| `getConfig()` | Get configuration using configured version (default: stable) |
| `getConfigVersion(version)` | Get a specific config version |
| `getFeatureFlags()` | Get all feature flags |
| `isEnabled(flagName, context?)` | Check if a flag is enabled |
| `evaluateFlag(flagName, context?)` | Get detailed evaluation result |
| `getAllFlags(context?)` | Get all flags as key-value map |
| `setContext(context)` | Set global evaluation context |
| `getContext()` | Get current global context |
| `refresh()` | Force refresh config and flags |
| `on(event, callback)` | Listen for events ('update', 'error') |
| `off(event, callback)` | Remove event listener |
| `destroy()` | Stop polling and cleanup |

## Real-World Examples

### Feature Rollout with Percentage

```typescript
// In ToggleBox dashboard, create flag 'new-checkout' with:
// - rolloutType: 'percentage'
// - rolloutPercentage: 25

// In your code:
const showNewCheckout = await client.isEnabled('new-checkout', {
  userId: user.id, // Used for consistent hashing
})

if (showNewCheckout) {
  renderNewCheckout()
} else {
  renderLegacyCheckout()
}
```

### Targeted Feature for Beta Users

```typescript
// Flag 'beta-features' with targetUserIds: ['user-123', 'user-456']
const hasBetaAccess = await client.isEnabled('beta-features', {
  userId: user.id,
})
```

### Environment-Specific Configuration

```typescript
// Different clients for different environments
const prodClient = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme',
})

const stagingClient = new ToggleBoxClient({
  platform: 'web',
  environment: 'staging',
  tenantSubdomain: 'acme',
})

// Each fetches environment-specific config and flags
const prodConfig = await prodClient.getConfig()
const stagingConfig = await stagingClient.getConfig()
```

## TypeScript

This SDK is written in TypeScript and includes full type definitions.

```typescript
import type { Config, FeatureFlag, EvaluationContext, EvaluationResult } from '@togglebox/core'
import type { ClientOptions } from '@togglebox/sdk'
```

## License

MIT
