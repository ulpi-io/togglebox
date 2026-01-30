# ToggleBox

Open source remote configuration, feature flags, and experimentation platform.

## Project Documentation

@.claude/claude-md-refs/project-commands.md
@.claude/claude-md-refs/architecture.md
@.claude/claude-md-refs/conventions.md
@.claude/claude-md-refs/development-guide.md

## Project Structure

```
togglebox/
├── apps/
│   ├── api/              # Express.js API (Lambda, Workers, Docker)
│   ├── admin/            # Admin dashboard (Next.js 15, port 3001)
│   ├── example-nextjs/   # Example Next.js app (port 3002)
│   ├── example-expo/     # Example Expo app
│   └── example-nodejs/   # Example Node.js app
├── packages/
│   ├── core/             # Core types, hashing utilities
│   ├── configs/          # Tier 1: Remote configurations
│   ├── flags/            # Tier 2: Feature flags
│   ├── experiments/      # Tier 3: A/B experiments
│   ├── stats/            # Analytics and tracking
│   ├── database/         # Multi-database (DynamoDB, Prisma, Mongoose)
│   ├── cache/            # Cache providers (CloudFront, Cloudflare)
│   ├── auth/             # Optional authentication (JWT, bcrypt)
│   ├── shared/           # Shared utilities, middleware
│   ├── ui/               # UI components (shadcn/ui)
│   ├── sdk-js/           # JavaScript SDK (@togglebox/sdk)
│   ├── sdk-nextjs/       # Next.js SDK (@togglebox/sdk-nextjs)
│   ├── sdk-expo/         # Expo SDK (@togglebox/sdk-expo)
│   ├── sdk-php/          # PHP SDK (togglebox/sdk-php)
│   └── sdk-laravel/      # Laravel SDK (togglebox/sdk-laravel)
├── docker/               # Docker scripts and DynamoDB init
└── .github/workflows/    # CI/CD pipelines
```

## Quick Start

```bash
pnpm install              # Install dependencies
pnpm build:packages       # Build packages (3 stages)
pnpm dev:api              # Start API (port 3000)
pnpm dev:admin            # Start dashboard (port 3001)
pnpm seed                 # Seed demo data
```

**Demo login:** `admin@togglebox.com` / `Parola123!`

## Key Technologies

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| API        | Express.js 5, TypeScript, Zod                    |
| Admin      | Next.js 15, React 19, Tailwind, shadcn/ui        |
| Database   | DynamoDB, PostgreSQL, MySQL, MongoDB, SQLite, D1 |
| Auth       | JWT, bcrypt (optional)                           |
| Logging    | Pino                                             |
| Deployment | AWS Lambda, Cloudflare Workers, Docker           |

## Database Configuration

Set `DB_TYPE` environment variable:

| Value        | Database      | Use Case           |
| ------------ | ------------- | ------------------ |
| `dynamodb`   | AWS DynamoDB  | AWS Lambda         |
| `d1`         | Cloudflare D1 | Cloudflare Workers |
| `postgresql` | PostgreSQL    | Self-hosted        |
| `mysql`      | MySQL         | Enterprise         |
| `mongodb`    | MongoDB       | Document store     |
| `sqlite`     | SQLite        | Local development  |

## API Patterns

### Route Handlers

Keep handlers thin - HTTP concerns only:

```typescript
router.post("/", validateConfig, async (req, res, next) => {
  try {
    const config = await configService.create(req.body);
    res.status(201).json({ data: config });
  } catch (error) {
    next(error);
  }
});
```

### Service Layer

Business logic in services:

```typescript
class ConfigService {
  constructor(private repository: ConfigRepository) {}

  async create(data: CreateConfigInput) {
    // Validation, business logic, persistence
    return this.repository.create(data);
  }
}
```

### Response Format

```typescript
// Success
{ success: true, data: {...}, timestamp: '2024-01-15T10:30:00.000Z' }

// List with pagination (offset-based)
{ success: true, data: [...], meta: { page: 1, perPage: 20, total: 100 }, timestamp: '...' }

// List with pagination (token-based for DynamoDB)
{ success: true, data: [...], meta: { nextToken: '...', hasMore: true }, timestamp: '...' }

// Error
{ success: false, error: 'Error message', code: 'ERROR_CODE', details: [...], timestamp: '...' }
```

## SDK Usage

### JavaScript

```typescript
import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "web",
  environment: "production",
  apiUrl: "https://api.example.com",
});

// Remote config (Tier 1)
const theme = await client.getConfigValue("theme", "light");

// Feature flag (Tier 2)
const enabled = await client.isFlagEnabled("new-feature", { userId });

// Experiment (Tier 3)
const variant = await client.getVariant("checkout-test", { userId });
```

### Next.js

```tsx
import {
  ToggleBoxProvider,
  useConfig,
  useFlag,
  useExperiment,
  useAnalytics,
} from "@togglebox/sdk-nextjs";

// Wrap app
<ToggleBoxProvider platform="web" environment="production" apiUrl={url}>
  <App />
</ToggleBoxProvider>;

// Tier 1: Remote configs
const { config, getConfigValue, isLoading } = useConfig();
const apiUrl = await getConfigValue("api_url", "https://default.api.com");

// Tier 2: Feature flags
const { flag, exists, isEnabled } = useFlag("dark-mode");
const enabled = await isEnabled();

// Tier 3: Experiments
const { experiment, getVariant } = useExperiment("checkout-test", { userId });
const variant = await getVariant();

// Analytics
const { trackConversion, flushStats } = useAnalytics();
await trackConversion(
  "checkout-test",
  { userId },
  { metricId: "purchase", value: 99.99 },
);
```

### Expo

```tsx
import {
  ToggleBoxProvider,
  useConfig,
  useFlag,
  useAnalytics,
} from "@togglebox/sdk-expo";

// Provider with offline support
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl={url}
  persistToStorage={true}
>
  <App />
</ToggleBoxProvider>;
```

## Security

- Authentication optional (`ENABLE_AUTHENTICATION=true/false`)
- When disabled: use VPC/API Gateway for security
- Helmet for security headers
- Rate limiting via express-rate-limit
- CORS configuration via `CORS_ORIGIN`
