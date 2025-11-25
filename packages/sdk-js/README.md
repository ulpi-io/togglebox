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

## Usage

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
console.log(config)

// Get feature flags
const flags = await client.getFeatureFlags()
console.log(flags)

// Check if flag is enabled
const isEnabled = await client.isEnabled('new-dashboard')
console.log(isEnabled)
```

### Cloud Multi-Tenant

```typescript
import { ToggleBoxClient } from '@togglebox/sdk'

const client = new ToggleBoxClient({
  platform: 'web',
  environment: 'production',
  tenantSubdomain: 'acme', // Connects to https://acme.togglebox.io
})

// Same API as above
const config = await client.getConfig()
const flags = await client.getFeatureFlags()
const isEnabled = await client.isEnabled('new-dashboard')
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

// With evaluation context
const isEnabled = await client.isEnabled('premium-features', {
  userId: '123',
  userEmail: 'user@example.com',
  customAttribute: 'value',
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

- `getConfig()` - Get latest stable configuration
- `getFeatureFlags()` - Get all feature flags
- `isEnabled(flagName, context?)` - Check if a flag is enabled
- `setContext(context)` - Set global evaluation context
- `refresh()` - Force refresh config and flags
- `on(event, callback)` - Listen for events ('update', 'error')
- `off(event, callback)` - Remove event listener
- `destroy()` - Stop polling and cleanup

## TypeScript

This SDK is written in TypeScript and includes full type definitions.

```typescript
import type { Config, FeatureFlag, EvaluationContext } from '@togglebox/core'
import type { ClientOptions } from '@togglebox/sdk'
```

## License

MIT
