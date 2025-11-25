# ToggleBox - Open Source Remote Configuration & Feature Flags

**Self-hosted remote configuration and feature flag management for modern applications.**

[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.x-orange.svg)](https://pnpm.io/)

## Features

- **Multi-Database Support**: DynamoDB, MySQL, PostgreSQL, MongoDB, SQLite, Cloudflare D1
- **Multi-Platform Deployment**: AWS Lambda, Cloudflare Workers, Docker, Netlify
- **Remote Configuration**: Version-controlled JSON configurations per platform/environment
- **Feature Flags**: Dynamic feature toggles with percentage-based rollouts
- **Client SDKs**: JavaScript, Next.js, Expo/React Native
- **Type-Safe**: Full TypeScript support across all packages
- **Multi-Provider Caching**: CloudFront, Cloudflare, or disabled - with automatic cache invalidation
- **Admin Dashboard**: Web-based management interface (Next.js 15)
- **Optional Authentication**: JWT + API key authentication (disabled by default)

## Repository Structure

This is a **pnpm monorepo** containing all open-source packages and applications:

```
togglebox/
├── apps/
│   ├── api/              # Express.js API server (multi-platform)
│   └── admin/            # Admin dashboard (Next.js 15)
├── packages/
│   ├── core/             # Core business logic and types
│   ├── database/         # Multi-database abstraction layer
│   ├── cache/            # Multi-provider cache abstraction
│   ├── auth/             # Authentication module (optional)
│   ├── shared/           # Shared utilities and middleware
│   ├── sdk-js/           # JavaScript SDK
│   ├── sdk-nextjs/       # Next.js SDK with React hooks
│   └── sdk-expo/         # Expo/React Native SDK
└── infrastructure/       # CloudFormation/Terraform templates
```

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8.x (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/togglebox.git
cd togglebox

# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Set up environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your database configuration

# Start API development server
pnpm dev:api

# In another terminal, start admin dashboard
pnpm dev:admin
```

### Database Setup

Choose your database backend by setting `DB_TYPE`:

```bash
# SQLite (default, for local development)
DB_TYPE=sqlite

# MySQL
DB_TYPE=mysql
DATABASE_URL=mysql://user:pass@localhost:3306/togglebox

# PostgreSQL
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/togglebox

# DynamoDB (for AWS Lambda)
DB_TYPE=dynamodb
DYNAMODB_TABLE=togglebox
AWS_REGION=us-east-1

# MongoDB
DB_TYPE=mongodb
MONGODB_URI=mongodb://localhost:27017/togglebox
```

For SQL databases, generate and run migrations:

```bash
cd packages/database
pnpm schema:generate
pnpm prisma:migrate
```

### Authentication (Optional)

Authentication is **disabled by default** for easier development. Enable for production:

```bash
# In your .env file
ENABLE_AUTHENTICATION=true
JWT_SECRET=$(openssl rand -hex 32)
API_KEY_SECRET=$(openssl rand -hex 32)
```

## Deployment

### AWS Lambda

```bash
cd apps/api
npm install -g serverless
serverless deploy --stage production
```

### Cloudflare Workers

```bash
cd apps/api
npm install -g wrangler
wrangler login
wrangler deploy
```

### Docker

```bash
docker build -t togglebox-api .
docker run -p 3000:3000 togglebox-api
```

### Netlify Functions

```bash
cd apps/api
netlify deploy --prod
```

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
});

await config.initialize();
const theme = config.get('theme');
const isDarkMode = config.isFeatureEnabled('dark-mode');
```

### Next.js SDK

```bash
npm install @togglebox/sdk-nextjs
```

```tsx
import { RemoteConfigProvider, useRemoteConfig, useFeatureFlag } from '@togglebox/sdk-nextjs';

// In app layout
export default function Layout({ children }) {
  return (
    <RemoteConfigProvider
      apiUrl="https://your-api.com"
      platform="web"
      environment="production"
    >
      {children}
    </RemoteConfigProvider>
  );
}

// In components
function MyComponent() {
  const { config, isLoading } = useRemoteConfig();
  const isDarkMode = useFeatureFlag('dark-mode');

  if (isLoading) return <Loading />;
  return <div className={isDarkMode ? 'dark' : 'light'}>{config?.theme}</div>;
}
```

### Expo/React Native SDK

```bash
npm install @togglebox/sdk-expo
```

```tsx
import { RemoteConfigProvider, useRemoteConfig } from '@togglebox/sdk-expo';

// Same API as Next.js SDK with offline support
```

## API Endpoints

### Public (Read-only)

```
GET /api/v1/platforms/{platform}/environments/{env}/versions/latest
GET /api/v1/platforms/{platform}/environments/{env}/versions/latest/stable
GET /api/v1/platforms/{platform}/environments/{env}/feature-flags
GET /api/v1/platforms/{platform}/environments/{env}/feature-flags/{flag}
```

### Internal (Write operations)

```
POST   /api/v1/internal/platforms
POST   /api/v1/internal/platforms/{platform}/environments
POST   /api/v1/internal/platforms/{platform}/environments/{env}/versions
PATCH  /api/v1/internal/platforms/{platform}/environments/{env}/feature-flags/{flag}/toggle
DELETE /api/v1/internal/platforms/{platform}
```

## Development

```bash
# Start API with hot reload
pnpm dev:api

# Start admin dashboard
pnpm dev:admin

# Build all packages
pnpm build:packages

# Build everything
pnpm build

# Run tests
pnpm test

# Lint and format
pnpm lint:fix
pnpm format
```

## Documentation

- [Architecture](/.claude/claude-md-refs/architecture.md) - Architecture decisions and patterns
- [Project Commands](/.claude/claude-md-refs/project-commands.md) - Development workflows
- [Conventions](/.claude/claude-md-refs/conventions.md) - Code standards
- [Multi-Database Setup](/packages/database/PRISMA-MULTI-DB.md) - Database configuration
- [API Documentation](/apps/api/openapi.yaml) - OpenAPI specification

## License

**Elastic License 2.0 (ELv2)**

You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

### What You Can Do
- Self-host for your own organization
- Modify and customize
- Use commercially within your company
- Build products on top of it
- Distribute modified versions

### What You Cannot Do
- Offer ToggleBox as a managed SaaS service to third parties
- Compete with official ToggleBox Cloud offering

For a managed SaaS version, see [ToggleBox Cloud](https://togglebox.dev).

## Contributing

We welcome contributions! Please see our contributing guidelines.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- [GitHub Issues](https://github.com/your-org/togglebox/issues) - Bug reports and feature requests
- [Documentation](/.claude/claude-md-refs/) - Detailed guides and references

## Cloud-Only Features

The following features are available exclusively in [ToggleBox Cloud](https://togglebox.dev):

| Feature | Description |
|---------|-------------|
| **Multi-Tenancy** | Isolated workspaces with subdomain-based routing |
| **Team Membership** | Multi-user tenants with role-based access (admin/developer/viewer) |
| **Team Invitations** | Email-based invitation system with secure tokens |
| **Stripe Billing** | Subscription management with tiered pricing |
| **Usage Limits** | Plan-based limits on platforms, configs, and API requests |
| **SSO** | Enterprise single sign-on integration |

## Related Projects

- **[ToggleBox Cloud](https://togglebox.dev)** - Official managed SaaS with multi-tenancy, team collaboration, and enterprise features

---

Built with TypeScript, Express.js, Next.js, and pnpm workspaces.
