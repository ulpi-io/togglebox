# @togglebox/cache

Multi-provider cache abstraction for ToggleBox with support for CloudFront, Cloudflare, and more.

## Features

- **Multiple CDN Providers**: CloudFront (AWS), Cloudflare, or disabled (NoOp)
- **Flexible Configuration**: Environment-based provider selection
- **Granular Invalidation**: Invalidate by platform, environment, version, or feature flag
- **Express Middleware**: Built-in Cache-Control header management
- **TypeScript First**: Full type safety with interfaces
- **Zero Dependencies**: Only peer dependencies for providers you use

## Installation

```bash
# pnpm (recommended for monorepos)
pnpm add @togglebox/cache

# npm
npm install @togglebox/cache

# yarn
yarn add @togglebox/cache
```

### Peer Dependencies

Install the peer dependencies for the provider you plan to use:

**CloudFront:**
```bash
pnpm add aws-sdk
```

**Cloudflare:**
```bash
# No additional dependencies required (uses native fetch)
```

**Express Middleware:**
```bash
pnpm add express
pnpm add -D @types/express
```

## Provider Comparison

| Feature | CloudFront | Cloudflare | NoOp |
|---------|-----------|------------|------|
| Global invalidation | ✅ | ✅ | ❌ (logs only) |
| Path-based invalidation | ✅ | ✅ | ❌ (logs only) |
| Batch invalidation | ✅ | ✅ | ❌ (logs only) |
| Cost | Pay per invalidation | Included in plan | Free |
| Speed | ~5-30 seconds | ~1-5 seconds | Instant (no-op) |
| Use case | AWS infrastructure | Cloudflare Workers | Development/testing |

## Quick Start

### 1. Create Cache Provider

```typescript
import { createCacheProvider } from '@togglebox/cache';

// CloudFront provider
const cache = createCacheProvider({
  enabled: true,
  provider: 'cloudfront',
  cloudfront: {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    region: process.env.AWS_REGION || 'us-east-1'
  }
});

// Cloudflare provider
const cache = createCacheProvider({
  enabled: true,
  provider: 'cloudflare',
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  }
});

// Disabled (development)
const cache = createCacheProvider({
  enabled: false
});
```

### 2. Invalidate Cache

```typescript
// Invalidate specific paths
const invalidationId = await cache.invalidateCache([
  '/api/v1/platforms/web/environments/production/*',
  '/api/v1/platforms/mobile/*'
]);

// Invalidate entire platform
await cache.invalidatePlatformCache('web');

// Invalidate specific environment
await cache.invalidateEnvironmentCache('web', 'production');

// Invalidate specific version
await cache.invalidateVersionCache('web', 'production', '1.2.3');

// Invalidate feature flag
await cache.invalidateFeatureFlagCache('web', 'production', 'dark-mode');

// Invalidate everything
await cache.invalidateGlobalCache();
```

### 3. Use Middleware (Express)

```typescript
import express from 'express';
import { cacheHeaders, noCacheHeaders } from '@togglebox/cache';

const app = express();

// Apply cache headers to public endpoints (1 hour browser, 24 hours CDN)
app.use('/api/v1/platforms', cacheHeaders());

// Custom cache TTL
app.use('/api/v1/platforms', cacheHeaders({
  ttl: 1800,      // 30 minutes browser cache
  maxAge: 43200   // 12 hours CDN cache
}));

// Only cache specific paths
app.use(cacheHeaders({
  pathPattern: /^\/api\/v1\/platforms/
}));

// Disable caching on internal endpoints
app.use('/api/v1/internal', noCacheHeaders());
```

## Configuration

### CloudFront Provider

```typescript
import { createCacheProvider } from '@togglebox/cache';

const cache = createCacheProvider({
  enabled: true,
  provider: 'cloudfront',
  cloudfront: {
    distributionId: 'E1234ABCDEFGHI',  // Required
    region: 'us-east-1'                // Optional, defaults to 'us-east-1'
  }
});
```

**Environment Variables:**
```bash
CACHE_ENABLED=true
CACHE_PROVIDER=cloudfront
CLOUDFRONT_DISTRIBUTION_ID=E1234ABCDEFGHI
AWS_REGION=us-east-1
```

**AWS Credentials:**
- Uses AWS SDK default credential chain
- Set via environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
- Or use IAM roles (recommended for Lambda/ECS)

### Cloudflare Provider

```typescript
import { createCacheProvider } from '@togglebox/cache';

const cache = createCacheProvider({
  enabled: true,
  provider: 'cloudflare',
  cloudflare: {
    zoneId: '1234567890abcdef1234567890abcdef',  // Required
    apiToken: 'your-cloudflare-api-token'        // Required
  }
});
```

**Environment Variables:**
```bash
CACHE_ENABLED=true
CACHE_PROVIDER=cloudflare
CLOUDFLARE_ZONE_ID=1234567890abcdef1234567890abcdef
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
```

**Cloudflare API Token:**
- Create API token with "Cache Purge" permission
- Zone-specific or account-level token
- [Create token in Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)

### NoOp Provider (Disabled)

```typescript
import { createCacheProvider } from '@togglebox/cache';

// Explicitly disabled
const cache = createCacheProvider({
  enabled: false
});

// Or specify 'none' provider
const cache = createCacheProvider({
  enabled: true,
  provider: 'none'
});
```

**Environment Variables:**
```bash
CACHE_ENABLED=false
```

## Middleware API

### `cacheHeaders(options?)`

Sets `Cache-Control` headers on GET requests.

**Options:**
- `ttl` (number): Browser cache TTL in seconds (default: 3600 = 1 hour)
- `maxAge` (number): CDN/shared cache TTL in seconds (default: 86400 = 24 hours)
- `cacheControl` (string): Cache control directive (default: 'public')
- `pathPattern` (RegExp): Optional pattern to match paths

**Example:**
```typescript
// Basic usage
app.use('/api/v1/platforms', cacheHeaders());
// Sets: Cache-Control: public, max-age=3600, s-maxage=86400

// Custom TTL
app.use('/api/v1/platforms', cacheHeaders({
  ttl: 1800,      // 30 minutes
  maxAge: 43200   // 12 hours
}));
// Sets: Cache-Control: public, max-age=1800, s-maxage=43200

// Private cache (not cacheable by CDN)
app.use('/api/v1/user', cacheHeaders({
  cacheControl: 'private',
  ttl: 300
}));
// Sets: Cache-Control: private, max-age=300, s-maxage=86400

// Pattern-based
app.use(cacheHeaders({
  pathPattern: /^\/api\/v1\/platforms/
}));
```

### `noCacheHeaders()`

Disables caching completely (forces revalidation).

**Example:**
```typescript
app.use('/api/v1/internal', noCacheHeaders());
// Sets:
// - Cache-Control: no-cache, no-store, must-revalidate
// - Pragma: no-cache
// - Expires: 0
```

## Cache Provider API

### `invalidateCache(paths: string[]): Promise<string | null>`

Invalidates specific cache paths.

```typescript
const invalidationId = await cache.invalidateCache([
  '/api/v1/platforms/web/*',
  '/api/v1/platforms/mobile/environments/production/*'
]);
```

**Returns:** Invalidation ID (CloudFront) or batch ID (Cloudflare), or null if disabled

### `invalidateGlobalCache(): Promise<string | null>`

Invalidates all cached content.

```typescript
await cache.invalidateGlobalCache();
```

**Invalidates:** `/*` (all paths)

### `invalidatePlatformCache(platform: string): Promise<string | null>`

Invalidates all cache for a specific platform.

```typescript
await cache.invalidatePlatformCache('web');
```

**Invalidates:** `/api/v1/platforms/web/*`

### `invalidateEnvironmentCache(platform: string, environment: string): Promise<string | null>`

Invalidates cache for a specific platform environment.

```typescript
await cache.invalidateEnvironmentCache('web', 'production');
```

**Invalidates:** `/api/v1/platforms/web/environments/production/*`

### `invalidateVersionCache(platform: string, environment: string, version: string): Promise<string | null>`

Invalidates cache for a specific configuration version.

```typescript
await cache.invalidateVersionCache('web', 'production', '1.2.3');
```

**Invalidates:** `/api/v1/platforms/web/environments/production/versions/1.2.3*`

### `invalidateFeatureFlagCache(platform: string, environment: string, flagName: string): Promise<string | null>`

Invalidates cache for a specific feature flag.

```typescript
await cache.invalidateFeatureFlagCache('web', 'production', 'dark-mode');
```

**Invalidates:** `/api/v1/platforms/web/environments/production/flags*`

### `generateCachePaths(platform?, environment?, version?): string[]`

Generates cache paths based on provided parameters.

```typescript
// Global paths
cache.generateCachePaths();
// Returns: ['/*']

// Platform paths
cache.generateCachePaths('web');
// Returns: ['/api/v1/platforms/web/*']

// Environment paths
cache.generateCachePaths('web', 'production');
// Returns: ['/api/v1/platforms/web/environments/production/*']

// Version paths
cache.generateCachePaths('web', 'production', '1.2.3');
// Returns: ['/api/v1/platforms/web/environments/production/versions/1.2.3*']
```

### `isEnabled(): boolean`

Checks if caching is enabled.

```typescript
if (cache.isEnabled()) {
  console.log('Cache invalidation will be performed');
}
```

## Migration from CloudFrontService

If you're migrating from the old `CloudFrontService` in `@togglebox/shared`:

### Before
```typescript
import { CloudFrontService } from '@togglebox/shared';

const cloudfront = new CloudFrontService(
  process.env.CLOUDFRONT_DISTRIBUTION_ID
);

await cloudfront.invalidateCache({
  platform: 'web',
  environment: 'production',
  version: '1.2.3'
});
```

### After
```typescript
import { createCacheProvider } from '@togglebox/cache';

const cache = createCacheProvider({
  enabled: process.env.CACHE_ENABLED === 'true',
  provider: 'cloudfront',
  cloudfront: {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    region: process.env.AWS_REGION
  }
});

await cache.invalidateVersionCache('web', 'production', '1.2.3');
```

**Key Changes:**
- Factory function instead of direct class instantiation
- Provider selection via configuration
- Granular invalidation methods instead of single method with object parameter
- Support for multiple CDN providers
- Built-in middleware for cache headers

## TypeScript Types

```typescript
import type {
  CacheProvider,
  CacheConfig,
  CacheHeadersOptions
} from '@togglebox/cache';

// Custom provider implementation
class MyCacheProvider implements CacheProvider {
  async invalidateCache(paths: string[]): Promise<string | null> {
    // Your implementation
  }
  // ... other methods
}

// Type-safe configuration
const config: CacheConfig = {
  enabled: true,
  provider: 'cloudfront',
  cloudfront: {
    distributionId: 'E1234ABCDEFGHI'
  }
};

// Middleware options
const options: CacheHeadersOptions = {
  ttl: 3600,
  maxAge: 86400,
  pathPattern: /^\/api/
};
```

## Best Practices

### 1. Environment-Based Configuration

Use environment variables to configure cache providers:

```typescript
const cache = createCacheProvider({
  enabled: process.env.CACHE_ENABLED === 'true',
  provider: (process.env.CACHE_PROVIDER as 'cloudfront' | 'cloudflare') || 'cloudfront',
  cloudfront: {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    region: process.env.AWS_REGION
  },
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  }
});
```

### 2. Disable Cache in Development

```typescript
const cache = createCacheProvider({
  enabled: process.env.NODE_ENV === 'production',
  provider: 'cloudfront',
  cloudfront: {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID
  }
});
```

### 3. Invalidate After Updates

```typescript
// After deploying new configuration
const version = await deployConfiguration(platform, env, config);
await cache.invalidateVersionCache(platform, env, version.version);

// After toggling feature flag
await toggleFeatureFlag(platform, env, flagName, enabled);
await cache.invalidateFeatureFlagCache(platform, env, flagName);
```

### 4. Use Middleware for Public Endpoints

```typescript
// Cache public read endpoints
app.use('/api/v1/platforms', cacheHeaders({
  ttl: 3600,      // 1 hour browser cache
  maxAge: 86400   // 24 hours CDN cache
}));

// Never cache internal/write endpoints
app.use('/api/v1/internal', noCacheHeaders());
```

### 5. Handle Invalidation Errors Gracefully

```typescript
try {
  const invalidationId = await cache.invalidateCache(paths);
  if (invalidationId) {
    logger.info({ invalidationId, paths }, 'Cache invalidated');
  }
} catch (error) {
  logger.error({ error, paths }, 'Cache invalidation failed');
  // Don't fail the request - cache will eventually expire
}
```

## Troubleshooting

### CloudFront: "Access Denied" Error

**Problem:** AWS credentials don't have CloudFront permissions

**Solution:** Add `cloudfront:CreateInvalidation` permission to IAM role/user:
```json
{
  "Effect": "Allow",
  "Action": "cloudfront:CreateInvalidation",
  "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
}
```

### Cloudflare: "Authentication error" (10000)

**Problem:** Invalid or expired API token

**Solution:**
- Create new API token with "Cache Purge" permission
- Ensure token is zone-scoped or account-scoped
- Verify `CLOUDFLARE_API_TOKEN` is set correctly

### Cache Not Invalidating

**Problem:** Cache headers not being set or invalidation not working

**Solution:**
1. Verify provider is enabled: `cache.isEnabled()`
2. Check environment variables are set correctly
3. Verify CDN configuration (distribution/zone exists)
4. Check CDN logs for invalidation requests
5. Ensure cache headers middleware is applied before routes

### "Cache invalidation skipped" Warnings

**Problem:** Provider configuration missing (distributionId, zoneId, etc.)

**Solution:**
- Check environment variables are set
- Verify configuration in `createCacheProvider()` call
- Falls back to NoOp provider when config is invalid

## License

**Elastic License 2.0** - You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

See the main [LICENSE](../../LICENSE) file for full details.

## Contributing

⚠️ **Note:** This project is not yet initialized as a git repository.

Contributions guidelines will be added once the project is set up with version control.

---

**Made with ❤️ for ToggleBox**
