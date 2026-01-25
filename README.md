# ToggleBox

**Open source remote configuration, feature flags, and experimentation platform.**

Self-host it anywhere or use our [hosted version](https://togglebox.dev) for a fully managed experience.

[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.x-orange.svg)](https://pnpm.io/)

---

## What You Can Do

### Remote Configs

Manage application configuration without redeploying. Push JSON configurations to your apps instantly.

- Version-controlled configurations
- Environment-specific settings (dev, staging, production)
- Platform-specific configs (web, mobile, API)
- Instant updates without app store releases

### Feature Flags

Control feature rollouts with precision. Turn features on or off without touching code.

- Boolean and multivariate flags
- Percentage-based rollouts
- User targeting and segmentation
- Kill switches for instant rollback

### Experiments

Run A/B tests and experiments to make data-driven decisions.

- Variant allocation with consistent bucketing
- Traffic splitting
- Experiment analytics integration
- Statistical significance tracking

---

## Why ToggleBox?

| Feature | ToggleBox |
|---------|-----------|
| **Self-Hostable** | Deploy on your infrastructure with full control |
| **Multi-Database** | DynamoDB, PostgreSQL, MySQL, MongoDB, SQLite, Cloudflare D1 |
| **Multi-Platform** | AWS Lambda, Cloudflare Workers, Docker, Netlify |
| **Type-Safe SDKs** | JavaScript, Next.js, Expo/React Native |
| **Open Source** | Inspect the code, contribute, customize |
| **Hosted Option** | [ToggleBox Cloud](https://togglebox.dev) for zero maintenance |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8.x (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/togglebox/togglebox.git
cd togglebox

# Install dependencies
pnpm install

# Build packages
pnpm build:packages

# Configure environment
cp apps/api/.env.example apps/api/.env

# Start the API
pnpm dev:api

# Start the admin dashboard (in another terminal)
pnpm dev:admin
```

The API runs at `http://localhost:3000` and the admin dashboard at `http://localhost:3001`.

---

## SDKs

### JavaScript SDK

```bash
npm install @togglebox/sdk-js
```

```javascript
import { ToggleBox } from '@togglebox/sdk-js';

const client = new ToggleBox({
  apiUrl: 'https://your-api.com',
  platform: 'web',
  environment: 'production',
});

await client.initialize();

// Remote config
const theme = client.getConfig('theme');

// Feature flag
if (client.isEnabled('dark-mode')) {
  enableDarkMode();
}

// Experiment
const variant = client.getVariant('checkout-experiment');
```

### Next.js SDK

```bash
npm install @togglebox/sdk-nextjs
```

```tsx
import { ToggleBoxProvider, useFeatureFlag, useExperiment } from '@togglebox/sdk-nextjs';

// Wrap your app
<ToggleBoxProvider
  apiUrl="https://your-api.com"
  platform="web"
  environment="production"
>
  <App />
</ToggleBoxProvider>

// Use in components
function PricingPage() {
  const showNewPricing = useFeatureFlag('new-pricing');
  const { variant } = useExperiment('pricing-test');

  return showNewPricing ? <NewPricing variant={variant} /> : <OldPricing />;
}
```

### Expo/React Native SDK

```bash
npm install @togglebox/sdk-expo
```

```tsx
import { ToggleBoxProvider, useConfig } from '@togglebox/sdk-expo';

// Same React hooks API with offline support and AsyncStorage caching
const config = useConfig();
```

---

## Deployment

### AWS Lambda

```bash
cd apps/api
npm install -g serverless
serverless deploy --stage production
```

Best with DynamoDB for serverless-native performance.

### Cloudflare Workers

```bash
cd apps/api
npm install -g wrangler
wrangler deploy
```

Use with Cloudflare D1 for edge-first deployment.

### Docker

```bash
docker build -t togglebox .
docker run -p 3000:3000 togglebox
```

Works with any database backend.

### Self-Hosted

Deploy on any Node.js environment with your preferred database.

---

## Database Support

| Database | Best For |
|----------|----------|
| **DynamoDB** | AWS Lambda, serverless |
| **Cloudflare D1** | Cloudflare Workers, edge |
| **PostgreSQL** | Self-hosted, full SQL |
| **MySQL** | Self-hosted, enterprise |
| **MongoDB** | Document-oriented workloads |
| **SQLite** | Local development, testing |

Configure via `DB_TYPE` environment variable:

```bash
DB_TYPE=postgresql
DATABASE_URL=postgresql://user:pass@localhost:5432/togglebox
```

---

## Repository Structure

```
togglebox/
├── apps/
│   ├── api/              # Express.js API (multi-platform)
│   ├── admin/            # Admin dashboard (Next.js)
│   ├── example-nextjs/   # Next.js example app
│   └── example-expo/     # Expo example app
├── packages/
│   ├── core/             # Core business logic
│   ├── database/         # Multi-database abstraction
│   ├── cache/            # Cache providers (CloudFront, Cloudflare)
│   ├── auth/             # Authentication (optional)
│   ├── flags/            # Feature flag logic
│   ├── experiments/      # Experimentation logic
│   ├── configs/          # Remote config logic
│   ├── sdk-js/           # JavaScript SDK
│   ├── sdk-nextjs/       # Next.js SDK
│   └── sdk-expo/         # Expo SDK
└── infrastructure/       # IaC templates
```

---

## Hosted Version

Don't want to manage infrastructure? [ToggleBox Cloud](https://togglebox.dev) gives you:

- **Zero maintenance** - We handle hosting, scaling, and updates
- **Team collaboration** - Multi-user workspaces with roles
- **Enterprise features** - SSO, audit logs, advanced analytics
- **Guaranteed uptime** - SLA-backed reliability

[Get started free](https://togglebox.dev) - No credit card required.

---

## License

**Elastic License 2.0 (ELv2)**

- Use, modify, and self-host for your organization
- Build products and services on top of it
- Distribute modified versions

**Limitation:** Cannot offer ToggleBox as a hosted service to third parties.

---

## Contributing

Contributions welcome! See our [contributing guide](./CONTRIBUTING.md).

```bash
# Fork and clone
git clone https://github.com/your-username/togglebox.git

# Create a branch
git checkout -b feature/your-feature

# Make changes and test
pnpm test
pnpm lint

# Submit a PR
```

---

## Links

- [Documentation](/.claude/claude-md-refs/)
- [ToggleBox Cloud](https://togglebox.dev)
- [GitHub Issues](https://github.com/togglebox/togglebox/issues)

---

Built with TypeScript, Express.js, Next.js, and pnpm.
