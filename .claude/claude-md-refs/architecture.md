# Architecture

## Three-Tier Feature System

ToggleBox implements a three-tier system for feature management:

| Tier | Package | Purpose | Use Case |
|------|---------|---------|----------|
| **Tier 1** | `@togglebox/configs` | Remote configs | Key-value settings, themes, API URLs |
| **Tier 2** | `@togglebox/flags` | Feature flags | On/off toggles with targeting |
| **Tier 3** | `@togglebox/experiments` | A/B experiments | Multi-variant tests with analytics |

## Multi-Database Architecture

The `@togglebox/database` package provides adapters for:

| Database | Environment Variable | Best For |
|----------|---------------------|----------|
| DynamoDB | `DB_TYPE=dynamodb` | AWS Lambda, serverless |
| Cloudflare D1 | `DB_TYPE=d1` | Cloudflare Workers, edge |
| PostgreSQL | `DB_TYPE=postgresql` | Self-hosted, full SQL |
| MySQL | `DB_TYPE=mysql` | Self-hosted, enterprise |
| MongoDB | `DB_TYPE=mongodb` | Document workloads |
| SQLite | `DB_TYPE=sqlite` | Local development |

### DynamoDB Table Structure (10 Tables)

```
togglebox-users           # User accounts
togglebox-api-keys        # API key management
togglebox-password-resets # Password reset tokens (TTL enabled)
togglebox-platforms       # Platform metadata
togglebox-environments    # Environment metadata
togglebox-configs         # Legacy config versions
togglebox-remote-configs  # Tier 1: Remote configurations
togglebox-flags           # Tier 2: Feature flags
togglebox-experiments     # Tier 3: A/B experiments
togglebox-stats           # Usage analytics
```

All tables use PK/SK pattern with GSI1, GSI2, GSI3 for access patterns.

## Multi-Platform Deployment

The API (`apps/api`) supports deployment to:

- **AWS Lambda** via Serverless Framework (`serverless-http`)
- **Cloudflare Workers** via Wrangler
- **Docker/Self-hosted** via standard Node.js

## Package Dependencies

```
@togglebox/core          # Base types, hashing utilities
    ↓
@togglebox/configs       # Remote config logic
@togglebox/flags         # Feature flag logic
@togglebox/experiments   # Experiment logic
@togglebox/stats         # Analytics logic
    ↓
@togglebox/shared        # Shared utilities, middleware
    ↓
@togglebox/database      # Multi-database abstraction
@togglebox/cache         # Cache providers (CloudFront, Cloudflare)
@togglebox/auth          # Optional authentication (JWT, bcrypt)
    ↓
@togglebox/sdk           # JavaScript SDK
@togglebox/sdk-nextjs    # Next.js SDK with React hooks
@togglebox/sdk-expo      # Expo SDK with offline support
```

## Authentication

Authentication is **optional** and controlled by `ENABLE_AUTHENTICATION` env var.

When enabled:
- JWT-based authentication (`@togglebox/auth`)
- API key authentication for SDK requests
- bcrypt password hashing
- nodemailer for password reset emails

When disabled:
- Network-level security (VPC, API Gateway Resource Policy)
- Suitable for internal services

## Cache Providers

The `@togglebox/cache` package supports:

| Provider | Environment | Config |
|----------|-------------|--------|
| CloudFront | AWS | `CLOUDFRONT_DISTRIBUTION_ID` |
| Cloudflare | Workers | `CLOUDFLARE_ZONE_ID`, `CLOUDFLARE_API_TOKEN` |
| NoOp | Development | No caching |

## SDKs

### JavaScript SDKs (TypeScript)

| Package | Platform | Features |
|---------|----------|----------|
| `@togglebox/sdk` | Browser/Node.js | Core client |
| `@togglebox/sdk-nextjs` | Next.js | React hooks, SSR |
| `@togglebox/sdk-expo` | React Native | Offline storage (MMKV) |

### PHP SDKs (Composer)

| Package | Platform | Features |
|---------|----------|----------|
| `togglebox/sdk-php` | PHP 8.0+ | PSR cache adapters |
| `togglebox/sdk-laravel` | Laravel | Facade, service provider |

## Experiment State Machine

Experiments follow a strict state machine:

```
draft → running → paused → completed → archived
         ↑          ↓
         └──────────┘
```

### State Transitions

| Current State | Action | New State | Endpoint |
|---------------|--------|-----------|----------|
| `draft` | Start | `running` | `POST /experiments/:key/start` |
| `running` | Pause | `paused` | `POST /experiments/:key/pause` |
| `paused` | Resume | `running` | `POST /experiments/:key/resume` |
| `running` | Complete | `completed` | `POST /experiments/:key/complete` |
| `paused` | Complete | `completed` | `POST /experiments/:key/complete` |
| `completed` | Archive | `archived` | `POST /experiments/:key/archive` |

### State Constraints

- **draft**: Experiment configuration can be fully edited
- **running**: Only traffic allocation can be modified (PATCH /traffic)
- **paused**: Same as running, variation assignments paused
- **completed**: Read-only, winner recorded
- **archived**: Hidden from active lists

## Flag Versioning

Feature flags use versioning for audit and rollback:

### Version Creation

- `PUT /flags/:key` - Creates a **new version**, previous version deactivated
- `PATCH /flags/:key/rollout` - Updates **in-place** (no new version)
- `PATCH /flags/:key/toggle` - Updates **in-place** (no new version)

### When to Create New Version

| Operation | New Version? |
|-----------|--------------|
| Change flag key | N/A (new flag) |
| Change value/targeting rules | Yes |
| Change rollout percentage | No (in-place) |
| Toggle enabled state | No (in-place) |

### Version History Endpoints

- `GET /flags/:key/versions` - List all versions
- `GET /flags/:key/versions/:version` - Get specific version

## Pagination Patterns

The API supports two pagination styles based on database backend:

### Token-Based (DynamoDB)

Used for DynamoDB which doesn't support offset pagination.

**Request:**
```
GET /configs/list?limit=20&nextToken=eyJrZXkiOiJ2YWx1ZSJ9
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "nextToken": "eyJrZXkiOiJ2YWx1ZSJ9",
    "hasMore": true
  }
}
```

### Offset-Based (SQL/MongoDB)

Used for PostgreSQL, MySQL, SQLite, MongoDB.

**Request:**
```
GET /configs/list?page=1&perPage=20
```

**Response:**
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Smart Pagination

Controllers use `getSmartPaginationParams()` to detect pagination style from request and return appropriate response format.
