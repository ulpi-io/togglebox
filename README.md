# ToggleBox - Open Source Remote Configuration & Feature Flags

**Self-hosted remote configuration and feature flag management for modern applications.**

## Features

- **Multi-Database Support**: DynamoDB, MySQL, PostgreSQL, MongoDB, SQLite
- **Multi-Platform Deployment**: AWS Lambda, Cloudflare Workers, Docker, Netlify
- **Remote Configuration**: Version-controlled JSON configurations per platform/environment
- **Feature Flags**: Dynamic feature toggles with percentage-based rollouts
- **Client SDKs**: JavaScript, Next.js, Expo/React Native
- **Type-Safe**: Full TypeScript support across all packages
- **Multi-Provider Caching**: CloudFront, Cloudflare, or disabled - with automatic cache invalidation
- **Admin Dashboard**: Web-based management interface
- **Optional Authentication**: JWT + API key authentication (disabled by default, enable for production)

## Repository Structure

This is a **pnpm monorepo** containing all open-source packages and applications:

```
togglebox/
├── packages/
│   ├── core/           # Core business logic and types
│   ├── database/       # Multi-database abstraction layer
│   ├── cache/          # Multi-provider cache abstraction (CloudFront, Cloudflare)
│   ├── shared/         # Shared utilities and types
│   ├── auth/           # Authentication and authorization
│   ├── sdk-js/         # JavaScript SDK for browsers and Node.js
│   ├── sdk-nextjs/     # Next.js SDK with React hooks
│   └── sdk-expo/       # Expo/React Native SDK
└── apps/
    ├── api/            # Express.js API server
    └── admin/          # Admin dashboard (Next.js 15)
```

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm installed
- One of: AWS account, Cloudflare account, or Docker

### Installation

```bash
# Navigate to the togglebox directory
cd togglebox

# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Set up environment
cp apps/api/.env.example apps/api/.env

# Configure your database (DB_TYPE and connection details)

# Optional: Enable authentication for production
# Auth is disabled by default for easier local development
# Uncomment and set to enable:
# ENABLE_AUTHENTICATION=true
# JWT_SECRET=$(openssl rand -hex 32)
# API_KEY_SECRET=$(openssl rand -hex 32)

# Start API development server
pnpm dev:api
```

### Authentication (Optional)

**Authentication is disabled by default** for easier local development. Enable for production:

```bash
# In your .env file
ENABLE_AUTHENTICATION=true

# Generate secure secrets (32+ characters required)
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SECRET=$(openssl rand -hex 32)
```

**Required when authentication is enabled:**
1. **JWT_SECRET**: 32+ character secret for JWT tokens
2. **API_KEY_SECRET**: 32+ character secret for API keys

See `.claude/claude-md-refs/architecture.md` for deployment-specific security configurations:
- **AWS Lambda**: Network-level security via VPC/API Gateway Resource Policy
- **Cloudflare Workers**: Application-level auth required (no VPC)
- **Self-hosted**: Configure based on your security requirements

### Database Setup

Choose your database backend:

```bash
# For Prisma (MySQL, PostgreSQL, SQLite)
cd packages/database
export DB_TYPE=mysql  # or postgresql, sqlite
pnpm schema:generate
pnpm prisma:migrate

# For DynamoDB (AWS Lambda)
export DYNAMODB_TABLE=configurations
export AWS_REGION=us-east-1

# For MongoDB
export MONGODB_URI=mongodb://localhost:27017/togglebox
```

## Deployment Options

### AWS Lambda (Serverless)

```bash
cd apps/api
serverless deploy --stage production
```

### Cloudflare Workers

```bash
cd apps/api
wrangler deploy
```

### Docker

```bash
docker-compose up -d
```

See deployment configuration files in `apps/api/` for detailed instructions:
- `serverless.yml` - AWS Lambda deployment
- `wrangler.toml` - Cloudflare Workers deployment
- `Dockerfile` - Docker deployment

## Using the SDKs

### JavaScript SDK

```bash
npm install @togglebox/sdk-js
```

```javascript
import { RemoteConfig } from '@togglebox/sdk-js';

const config = new RemoteConfig({
  apiUrl: 'https://your-api.com',
  platform: 'web',
  environment: 'production',
  cacheEnabled: true,
});

await config.initialize();
const theme = config.get('theme');
```

### Next.js SDK

```bash
npm install @togglebox/sdk-nextjs
```

```typescript
import { RemoteConfigProvider, useRemoteConfig } from '@togglebox/sdk-nextjs';

// In app layout
<RemoteConfigProvider
  apiUrl="https://your-api.com"
  platform="web"
  environment="production"
>
  {children}
</RemoteConfigProvider>

// In components
const { config, isLoading } = useRemoteConfig();
const theme = config?.theme;
```

### Expo/React Native SDK

```bash
npm install @togglebox/sdk-expo
```

```typescript
import { RemoteConfigProvider, useRemoteConfig } from '@togglebox/sdk-expo';

// Similar API to Next.js SDK
```

## Documentation

Project documentation is available in `.claude/claude-md-refs/`:
- `architecture.md` - Architecture decisions and patterns
- `project-commands.md` - Project commands and deployment workflows
- `conventions.md` - Team conventions and standards

Additional documentation:
- `apps/api/serverless.yml` - AWS Lambda deployment configuration
- `apps/api/wrangler.toml` - Cloudflare Workers deployment configuration
- `packages/database/PRISMA-MULTI-DB.md` - Multi-database setup guide

## Development

```bash
# Run API in development mode
pnpm dev:api

# Build all packages
pnpm build:packages

# Run tests
pnpm test

# Lint and format
pnpm lint:fix
pnpm format
```

## Architecture

**API Layer**: Express.js with multi-platform handlers (Lambda, Workers, Netlify, Docker)

**Database Layer**: Abstraction supporting DynamoDB, Prisma (SQL), and Mongoose (MongoDB)

**SDK Layer**: Client libraries for JavaScript, Next.js, and Expo/React Native

**Caching**: Multi-provider support (CloudFront, Cloudflare) with automatic cache invalidation and headers

**Authentication**: JWT tokens and API keys (configurable)

## Self-Hosting

ToggleBox is designed for self-hosting. Deploy to your own infrastructure:

- **AWS**: Lambda + DynamoDB + CloudFront
- **Cloudflare**: Workers + D1 database
- **Docker**: Self-hosted with any supported database
- **Traditional**: Node.js server with MySQL/PostgreSQL/MongoDB

## License

**Elastic License 2.0** - You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

See [LICENSE](./LICENSE) file for full details.

### What You Can Do:
- ✅ Self-host for your own organization
- ✅ Modify and customize
- ✅ Use commercially within your company
- ✅ Build products on top of it
- ✅ Distribute modified versions

### What You Cannot Do:
- ❌ Offer ToggleBox as a managed SaaS service to third parties
- ❌ Compete with official ToggleBox Cloud offering

For a managed SaaS version, see [ToggleBox Cloud](https://togglebox.dev).

## Contributing

⚠️ **Note:** This project is not yet initialized as a git repository.

Contributions guidelines will be added once the project is set up with version control.

## Support

⚠️ **Note:** GitHub repository not yet set up.

For support:
- Refer to documentation in `.claude/claude-md-refs/`
- Check deployment configuration files in `apps/api/`
- Review package-specific README files in `packages/*/`

## Related Projects

- **ToggleBox Cloud**: Official managed SaaS version with multi-tenancy, team collaboration, and enterprise features

---

Built with TypeScript, Express.js, Next.js, and ❤️
