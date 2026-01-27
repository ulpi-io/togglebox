# Project Architecture

Architecture decisions and patterns for ToggleBox dual monorepo structure.

**Directory Structure:**
```
/Users/ciprian/work/_______OGG_______/togglebox/  ← Parent directory
├── togglebox/          ← Open source monorepo
└── togglebox-cloud/    ← Private cloud monorepo
```

## Application Architecture

**Pattern:** Dual monorepo structure - open source core + commercial cloud version

### togglebox/ (Open Source Core)

**Location:** `/Users/ciprian/work/_______OGG_______/togglebox/togglebox`

**Apps:**
- **apps/api**: Express.js API with multi-platform handlers (Lambda, Workers, Netlify, Docker)
- **apps/admin**: Admin dashboard (Next.js 15)
- **apps/example-nextjs**: Example Next.js app demonstrating SDK usage
- **apps/example-expo**: Example Expo/React Native app demonstrating SDK usage

**Packages:**
- **packages/core**: Core business logic, types, and hashing utilities
- **packages/database**: Multi-database abstraction layer (Prisma, Mongoose, DynamoDB, D1)
- **packages/cache**: Multi-provider cache abstraction (CloudFront, Cloudflare, NoOp)
- **packages/auth**: Optional authentication module (JWT + bcrypt + nodemailer)
- **packages/flags**: Feature flag business logic and evaluation
- **packages/experiments**: A/B experiments business logic
- **packages/configs**: Remote configuration business logic
- **packages/stats**: Analytics and statistics tracking
- **packages/ui**: Shared UI components (shadcn/ui)
- **packages/sdk-js**: JavaScript SDK for browsers and Node.js (`@togglebox/sdk`)
- **packages/sdk-nextjs**: Next.js SDK with React hooks (`@togglebox/sdk-nextjs`)
- **packages/sdk-expo**: Expo/React Native SDK (`@togglebox/sdk-expo`)
- **packages/sdk-php**: PHP SDK (Composer package `togglebox/sdk-php`)
- **packages/sdk-laravel**: Laravel SDK (Composer package `togglebox/sdk-laravel`)
- **packages/shared**: Shared utilities, types, and middleware

**API Architecture (Open Source):**
- **Controllers**: `configController`, `flagController`, `experimentController`, `statsController`, `webhookController`
- **Routes**:
  - `publicRoutes.ts` - Read-only GET endpoints with conditional auth (`conditionalAuth()`)
  - `internalRoutes.ts` - Write operations (POST/PUT/PATCH/DELETE) with mandatory auth (`requireAuth()`, `requirePermission()`)
  - `authRoutes.ts` - Authentication endpoints (login, register, password reset)
- **Middleware**: Optional auth via `conditionalAuth()`, mandatory auth via `requireAuth()`, permission checks via `requirePermission()`, rate limiting, validation, error handling, cache headers
- **Container**: Dependency injection via `Container` class for controller instantiation
- **Multi-platform**: Single Express app deploys to Lambda, Workers, Netlify, Docker

### togglebox-cloud/ (Private Cloud Version)

**Location:** `/Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

**Apps:**
- **apps/cloud-api**: Cloud API with billing and multitenancy
- **apps/cloud-app**: Cloud dashboard (Next.js 15)
- **apps/web**: Marketing/landing pages (Next.js 15)

**Packages:**
- **packages/billing**: Stripe billing integration
- **packages/multitenancy**: Multi-tenant features (subdomain routing, tenant isolation)

**Dependencies:** Uses all open source packages from `../togglebox/packages/` plus cloud-specific packages

**API Architecture (Cloud):**
- **Multi-tenancy**: Subdomain-based tenant routing (`subdomainTenantContext()` middleware)
- **Billing**: Stripe integration with usage-based pricing
- **Usage Tracking**: API request tracking and limits per tenant
- **Mandatory Auth**: Authentication required (JWT + API keys)
- **Tenant Isolation**: Database-level isolation with tenant-specific records

**Why Dual Monorepo:** Separates open source core from commercial features while enabling code sharing. Open source packages are published to npm and consumed by cloud version.

## Authentication & Authorization

### togglebox/ (Open Source) - Optional Auth

**Status:** ⚠️ Authentication is **DISABLED by default** - endpoints are publicly accessible unless you enable auth

**Auth Package:** `@togglebox/auth` provides optional authentication:
- **Dependencies:** bcrypt, jsonwebtoken, nodemailer, zod
- **Features:** User registration, login, password reset, API key management
- **Multi-database:** Works with Prisma (SQL), Mongoose (MongoDB), and DynamoDB
- **Usage:** Import and apply to routes when authentication is needed

```typescript
// Authentication middleware from @togglebox/auth package
import { authenticateJWT, authenticateAPIKey } from '@togglebox/auth';

// Apply to routes when you want authentication:
router.use('/api/v1/internal', authenticateJWT);
router.use('/api/v1/internal', authenticateAPIKey);
```

**Deployment-Specific Security:**
- **AWS Lambda**: Can use API Gateway Resource Policy for network-level protection (no app auth needed)
- **Cloudflare Workers**: Must use application-level auth (no VPC concept)
- **Self-hosted**: Choose application auth or network isolation (firewall, VPN)

### togglebox-cloud/ (Private Cloud) - Mandatory Auth

**Status:** ✅ Authentication is **REQUIRED** - all endpoints require authentication

**Security Model:**
- JWT tokens for client authentication
- API keys for service-to-service communication
- RBAC (Role-Based Access Control) with roles: `admin`, `editor`, `viewer`
- Password hashing with bcrypt
- Email verification and password reset flows via Resend
- Stripe webhook signature verification for billing events

**Multi-Tenancy Architecture:**

**CRITICAL: Frontend vs API Subdomain Pattern**
- **Frontend**: ALWAYS on single domain (`app.togglebox.local` / `app.togglebox.dev`)
  - NO tenant subdomains for frontend
  - Tenant context stored in `tenant-subdomain` cookie
  - All users access dashboard via `app.togglebox.local`
- **API**: Uses tenant subdomains (`{tenant}.togglebox.local` / `{tenant}.togglebox.dev`)
  - Auth endpoints use global API (`api.togglebox.local`)
  - Tenant endpoints use tenant subdomain (`acme.togglebox.local`)
  - Tenant context extracted from subdomain via `subdomainTenantContext()` middleware

**Security Model:**
- Database-level isolation (tenant-specific records)
- Usage limits enforced per tenant based on subscription plan
- Tenant subdomain validated against database on every API request

**Cookie-Based Tenant Context:**
```typescript
// After onboarding, tenant subdomain stored in cookie
cookieStore.set('tenant-subdomain', tenant.subdomain, {
  httpOnly: false,  // Client needs to read for API calls
  secure: true,
  sameSite: 'lax',
  domain: '.togglebox.local',  // Shared across subdomains
});

// API client reads tenant from cookie, NOT from URL
const tenant = getTenantSubdomain();  // Reads from cookie
const apiUrl = `https://${tenant}.togglebox.local`;
```

## API Design

**Style:** RESTful with JSON responses

**Endpoint Separation:**
- **Public Endpoints** (`/api/v1/platforms/*`): Read-only GET requests, internet-accessible
- **Internal Endpoints** (`/api/v1/internal/*`): Write operations (POST/PUT/PATCH/DELETE), network-restricted

**Actual API Endpoints (from publicRoutes.ts and internalRoutes.ts):**
```
# Public (Read-only) - conditionalAuth based on ENABLE_AUTHENTICATION
GET /api/v1/health                                                    # Health check (always unauthenticated)
GET /api/v1/platforms                                                 # List platforms
GET /api/v1/platforms/:platform/environments                          # List environments
GET /api/v1/platforms/:platform/environments/:env/versions/latest/stable  # Get latest stable config
GET /api/v1/platforms/:platform/environments/:env/flags               # List feature flags
GET /api/v1/platforms/:platform/environments/:env/flags/:flagKey/evaluate?userId=...  # Evaluate flag
GET /api/v1/platforms/:platform/environments/:env/experiments         # List experiments
GET /api/v1/platforms/:platform/environments/:env/experiments/:key/assign?userId=...  # Assign variation
POST /api/v1/platforms/:platform/environments/:env/stats/events       # SDK event ingestion

# Internal (Write operations) - always requireAuth() + requirePermission()
POST /api/v1/internal/platforms                                       # Create platform (config:write)
PATCH /api/v1/internal/platforms/:platform/environments/:env/flags/:flagKey/toggle  # Toggle flag (config:write)
POST /api/v1/internal/platforms/:platform/environments/:env/experiments/:key/start  # Start experiment (config:write)
POST /api/v1/internal/cache/invalidate                                # Invalidate cache (cache:invalidate)
POST /api/v1/internal/users                                           # Create user (user:manage)
POST /api/v1/internal/api-keys                                        # Create API key (apikey:manage)
```

**Versioning:** URL-based (`/api/v1/`)
- Current version: v1
- Breaking changes require new version

**Rate Limiting:**
- All endpoints: 100 requests/minute per IP
- Implemented via express-rate-limit

**Response Format:**
```json
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

## Database

**Multi-Database Architecture:** Supports multiple database backends based on deployment platform

| Platform | Database | ORM/Client |
|----------|----------|------------|
| AWS Lambda | DynamoDB | AWS SDK |
| Cloudflare Workers | D1 (SQLite) | Prisma |
| Self-hosted/RDS | MySQL | Prisma |
| MongoDB Atlas | MongoDB | Mongoose |
| Local Development | SQLite | Prisma |

### DynamoDB (AWS Lambda - Production)
- Single-table design with PK/SK pattern
- No connection pooling (serverless)
- Global Secondary Indexes for query patterns
- TTL for auto-cleanup

```typescript
// DynamoDB single-table pattern
PK: PLATFORM#{platformName}
SK: ENV#{envName}#VERSION#{version}
```

### Prisma (SQL databases)
- Schema generation based on DB_TYPE environment variable
- Migrations managed via `prisma migrate`
- Type-safe query interface

```typescript
// Generate schema for specific database
DB_TYPE=mysql npm run schema:generate
npm run prisma:migrate
```

### Mongoose (MongoDB)
- Document-based storage
- No migrations (schema-less)
- Connection pooling enabled

**Indexes:**
- DynamoDB: GSI on platform, environment, version, stable flag
- Prisma: Index on frequently queried columns in schema
- MongoDB: Compound indexes on query patterns

## Caching

**Cache Package:** `@togglebox/cache` - Multi-provider cache abstraction

**Supported Providers:**
- **CloudFront** (AWS) - For Lambda deployments
- **Cloudflare** - For Cloudflare Workers deployments
- **NoOp** (disabled) - For development or when caching not needed

**Cache Strategy:**
- Default TTL: 3600 seconds (1 hour) configured via env `CACHE_TTL`
- Max age: 86400 seconds (24 hours) configured via env `CACHE_MAX_AGE`
- Cache-Control headers set on public GET endpoints via middleware

**Middleware Integration:**
```typescript
import { cacheHeaders, noCacheHeaders } from '@togglebox/cache';

// Apply cache headers to public endpoints
app.use('/api/v1/platforms', cacheHeaders({
  ttl: 3600,      // 1 hour browser cache
  maxAge: 86400   // 24 hours CDN cache
}));

// Disable caching on internal endpoints
app.use('/api/v1/internal', noCacheHeaders());
```

**Cache Invalidation:**
```typescript
import { createCacheProvider } from '@togglebox/cache';

const cache = createCacheProvider({
  enabled: process.env.CACHE_ENABLED === 'true',
  provider: 'cloudfront', // or 'cloudflare' or 'none'
  cloudfront: {
    distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID,
    region: process.env.AWS_REGION
  },
  cloudflare: {
    zoneId: process.env.CLOUDFLARE_ZONE_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN
  }
});

// Granular invalidation by platform, environment, version
await cache.invalidateVersionCache('web', 'production', '1.2.3');
await cache.invalidateEnvironmentCache('web', 'production');
await cache.invalidatePlatformCache('web');
await cache.invalidateFeatureFlagCache('web', 'production', 'dark-mode');
```

**Webhook Integration:**
- Webhook endpoints trigger cache invalidation for CI/CD integration
- Automatic invalidation after configuration deployments

## Background Jobs

**Current Implementation:** No queue system (synchronous operations)

**Future Considerations:**
- CloudFront cache invalidation is synchronous (typically < 100ms)
- Database operations are fast enough for synchronous handling
- For heavy operations in future: Consider AWS SQS/EventBridge or Cloudflare Queues

## Logging

**Framework:** Pino (structured JSON logging)

**Log Levels:** trace, debug, info, warn, error, fatal

**Log Destinations:**
- **Development**: Console (pretty-printed via pino-pretty)
- **Production**: Grafana Cloud (configured via env vars)

**Grafana Cloud Integration:**
```typescript
// Environment variables
GRAFANA_CLOUD_API_KEY=your-api-key
GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net
LOG_LEVEL=info
```

**What to Log:**
- All errors (with stack traces)
- API requests (method, path, status, duration)
- Cache invalidation events
- Database operations (if enabled)
- Configuration deployments

**Never Log:**
- JWT tokens or API keys
- Secrets from environment variables
- Full configuration payloads (may contain sensitive data)

```typescript
logger.info({ platform, env, version }, 'Configuration deployed');
logger.error({ err, platform, env }, 'Failed to deploy configuration');
```

## Data Validation

**Framework:** Zod (runtime type validation)

**Why Zod:**
- TypeScript-first schema validation
- Automatic type inference
- Runtime safety with compile-time types

**Actual schema from @togglebox/core (packages/core/src/schemas.ts):**
```typescript
import { z } from 'zod';

// Platform schema - shared across all tiers (configs, flags, experiments)
export const PlatformSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
});

// Environment schema
export const EnvironmentSchema = z.object({
  platform: z.string(),
  environment: z.string(),
  description: z.string().optional(),
  createdBy: z.string().optional(),
  createdAt: z.string(),
});

// Standardized error response schema
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  code: z.string().optional(),       // e.g., "API_LIMIT_EXCEEDED", "VALIDATION_FAILED"
  timestamp: z.string(),
  details: z.array(z.string()).optional(),
  meta: z.record(z.unknown()).optional(), // retryAfter, usage/limit, upgradeUrl, etc.
});

// Automatic TypeScript types
export type Platform = z.infer<typeof PlatformSchema>;
export type Environment = z.infer<typeof EnvironmentSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
```

## Testing Strategy

**Framework:** Jest + ts-jest (TypeScript support)

**Test Organization:**
```
apps/api/src/
  controllers/__tests__/
  routes/__tests__/

packages/*/src/
  __tests__/
```

**Coverage Target:**
- Controllers: Test all endpoints
- Database layer: Test multi-database abstractions
- Type safety: TypeScript provides compile-time validation

**CI/CD:**
- ✅ **GitHub Actions configured** in `.github/workflows/`
- **ci.yml**: Lint, TypeCheck, Test, Security Audit, Format Check (runs on push/PR to main/develop)
- **deploy-aws-lambda.yml**: AWS Lambda deployment workflow
- **deploy-cloudflare-workers.yml**: Cloudflare Workers deployment workflow
- **PR Template**: Detailed checklist in `.github/pull_request_template.md`
- **Dependabot**: Configured for dependency updates

## Security

**Secrets Management:**
- Development: `.env` file (never commit)
- Production: AWS Secrets Manager or HashiCorp Vault
- Rotate API keys quarterly

**HTTPS:**
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- HSTS header enabled (max-age: 31536000)

**Input Validation:**
- All requests validated with Joi/Zod schemas
- Sanitize user input
- Parameterized queries (Sequelize does this)

**Security Headers:**
- helmet middleware for all routes
- CSP, X-Frame-Options, X-Content-Type-Options
- Hide X-Powered-By header

**Rate Limiting:**
- Global: 100 requests/minute per IP
- Login: 5 attempts/minute per IP
- Registration: 3 attempts/minute per IP
- Password reset: 3 attempts/hour per email

## Deployment

**Multi-Platform Support:** Single codebase deploys to multiple platforms

| Platform | Entry Point | Command | Database |
|----------|-------------|---------|----------|
| AWS Lambda | `lambda.ts` | `serverless deploy` | DynamoDB |
| Cloudflare Workers | `worker.ts` | `wrangler deploy` | D1 (SQLite) |
| Netlify Functions | `netlify.ts` | `netlify deploy` | External DB |
| Docker/Self-hosted | `index.ts` | `docker-compose up` | MySQL/MongoDB/SQLite |

**Deployment Process:**
1. Build TypeScript: `pnpm build`
2. Run tests: `pnpm test`
3. Deploy to platform:
   - AWS: `serverless deploy --stage production`
   - Cloudflare: `wrangler deploy`
   - Docker: `docker-compose up -d --build`

**Environment-Specific Configuration:**
- Each platform uses same Express app
- Platform detection via environment variables
- Database selection via `DB_TYPE` or auto-detection

**Rollback:**
- AWS Lambda: Deploy previous version via Serverless
- Cloudflare Workers: Rollback via Wrangler dashboard
- Docker: Redeploy previous image tag

## Monitoring

**Application Metrics:**
- PM2 monitoring dashboard
- Health check endpoints: `/health`, `/ready`
- Response time tracking
- Error rate monitoring

**Logs:**
- Centralized logging (ELK stack or CloudWatch)
- Log retention: 30 days
- Alert on error spikes

**Metrics to Monitor:**
- Request rate and response times
- Error rate (4xx, 5xx)
- Queue depth and processing time
- Database connection pool usage
- Memory and CPU usage
- Failed login attempts

**Alerting:**
- Error rate >1% for 5 minutes
- Response time >500ms average
- Queue depth >1000 jobs
- Database connection pool exhausted
- Memory usage >90%

---

**Last Updated:** 2026-01-26

**Note:** This architecture documentation covers **BOTH monorepos**:
- **togglebox/** (open source) - Multi-database, multi-platform deployment, optional auth, multi-provider caching
- **togglebox-cloud/** (private cloud) - Multi-tenancy, Stripe billing, usage tracking, mandatory auth

Both monorepos share core packages from togglebox/ for code reuse while maintaining separation of concerns.
