# ToggleBox

**Open source remote configuration, feature flags, and experimentation platform.**

Self-host it anywhere or use our [hosted version](https://togglebox.dev) for a fully managed experience.

[![GitHub](https://img.shields.io/github/stars/ulpi-io/togglebox?style=social)](https://github.com/ulpi-io/togglebox)
[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.x-orange.svg)](https://pnpm.io/)

[![npm](https://img.shields.io/npm/v/@togglebox/sdk?label=npm%20%40togglebox%2Fsdk)](https://www.npmjs.com/package/@togglebox/sdk)
[![npm](https://img.shields.io/npm/v/@togglebox/sdk-nextjs?label=npm%20%40togglebox%2Fsdk-nextjs)](https://www.npmjs.com/package/@togglebox/sdk-nextjs)
[![npm](https://img.shields.io/npm/v/@togglebox/sdk-expo?label=npm%20%40togglebox%2Fsdk-expo)](https://www.npmjs.com/package/@togglebox/sdk-expo)
[![Packagist](https://img.shields.io/packagist/v/togglebox/sdk?label=packagist%20togglebox%2Fsdk)](https://packagist.org/packages/togglebox/sdk)
[![Packagist](https://img.shields.io/packagist/v/togglebox/laravel?label=packagist%20togglebox%2Flaravel)](https://packagist.org/packages/togglebox/laravel)

---

## Visual Overview

![ToggleBox Overview](./docs/images/togglebox-overview.png)

---

## Core Features

### Remote Configs

Update your app's settings without redeploying. Change themes, API endpoints, copy, or any JSON configuration instantly.

### Feature Flags

Ship code when you're ready, release when you want. Control who sees what with targeting rules and percentage rollouts.

### Experiments

Run A/B tests to make decisions with data. Split traffic between variants and track which performs better.

### Analytics

Track flag evaluations, experiment exposures, and configuration fetches. Know what's happening in your apps.

---

## Why ToggleBox?

| Feature            | ToggleBox                                                     |
| ------------------ | ------------------------------------------------------------- |
| **Self-Hostable**  | Deploy on your infrastructure with full control               |
| **Multi-Database** | DynamoDB, PostgreSQL, MySQL, MongoDB, SQLite, Cloudflare D1   |
| **Multi-Platform** | AWS Lambda, Cloudflare Workers, Docker, Netlify               |
| **Type-Safe SDKs** | JavaScript, Next.js, Expo/React Native, PHP, Laravel          |
| **Open Source**    | Inspect the code, contribute, customize                       |
| **Hosted Option**  | [ToggleBox Cloud](https://togglebox.dev) for zero maintenance |

---

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8.x (`npm install -g pnpm`)

### Installation

```bash
# Clone the repository
git clone https://github.com/ulpi-io/togglebox.git
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

### Docker Development (Alternative)

For a containerized development environment with hot reload:

```bash
# Start development environment
make dev

# View all services
make status

# View logs
make logs          # All services
make logs-api      # API only
make logs-admin    # Admin only

# Stop services
make down

# Rebuild from scratch
make rebuild
```

**Available Make Commands:**

| Command | Description |
|---------|-------------|
| `make dev` | Start development environment with hot reload |
| `make prod` | Start production environment |
| `make down` | Stop all services |
| `make restart` | Restart all services |
| `make build` | Rebuild containers (no cache) |
| `make rebuild` | Clean volumes and rebuild from scratch |
| `make logs` | View logs for all services |
| `make logs-api` | View API logs only |
| `make logs-admin` | View Admin logs only |
| `make status` | Show service status and access points |
| `make shell-api` | Open shell in API container |
| `make shell-admin` | Open shell in Admin container |
| `make test` | Run tests in API container |
| `make help` | Show all available commands |

**Access Points (Docker):**
- API: http://localhost:3000
- Admin: http://localhost:3001
- DynamoDB: http://localhost:8000
- DynamoDB Admin: http://localhost:8001

### Seed Demo Data

To populate the database with demo data for all example apps:

```bash
# Run the seed script (no API required - seeds directly to database)
pnpm seed
```

The seed script creates:

| Resource              | Description                                                                 |
| --------------------- | --------------------------------------------------------------------------- |
| **Demo Admin User**   | `admin@togglebox.com` / `Parola123!`                                        |
| **API Key**           | Full permissions for authenticated requests                                 |
| **Platforms**         | `web`, `mobile`, `ecommerce`                                                |
| **Environments**      | `staging` (web/mobile), `development` (ecommerce)                           |
| **Config Parameters** | `theme`, `apiTimeout` per platform                                          |
| **Feature Flags**     | `dark-mode`, `new-checkout-flow`, `beta-features`, `biometric-auth`         |
| **Experiments**       | `checkout-test`, `cta-test`, `checkout-button-test`, `pricing-display-test` |

All experiments are automatically started and in "running" status.

---

## SDKs

ToggleBox provides official SDKs for multiple platforms:

| SDK | Package | Description |
|-----|---------|-------------|
| **JavaScript** | [![npm](https://img.shields.io/npm/v/@togglebox/sdk)](https://www.npmjs.com/package/@togglebox/sdk) | Core JavaScript SDK for browser and Node.js |
| **Next.js** | [![npm](https://img.shields.io/npm/v/@togglebox/sdk-nextjs)](https://www.npmjs.com/package/@togglebox/sdk-nextjs) | Next.js SDK with React hooks and SSR support |
| **Expo** | [![npm](https://img.shields.io/npm/v/@togglebox/sdk-expo)](https://www.npmjs.com/package/@togglebox/sdk-expo) | React Native/Expo SDK with offline support |
| **PHP** | [![Packagist](https://img.shields.io/packagist/v/togglebox/sdk)](https://packagist.org/packages/togglebox/sdk) | Core PHP SDK (PHP 8.1+) |
| **Laravel** | [![Packagist](https://img.shields.io/packagist/v/togglebox/laravel)](https://packagist.org/packages/togglebox/laravel) | Laravel SDK with service provider and facade |

### JavaScript SDK

[![npm version](https://badge.fury.io/js/%40togglebox%2Fsdk.svg)](https://www.npmjs.com/package/@togglebox/sdk)

```bash
npm install @togglebox/sdk
```

```typescript
import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "web",
  environment: "production",
  apiUrl: "https://your-togglebox-api.com",
});

// Remote config (Tier 1)
const config = await client.getConfig();
const theme = await client.getConfigValue("theme", "light");

// Feature flag (Tier 2)
const showNewUI = await client.isFlagEnabled("new-dashboard", {
  userId: "user-123",
});
if (showNewUI) {
  renderNewDashboard();
}

// Experiment (Tier 3)
const assignment = await client.getVariant("checkout-experiment", {
  userId: "user-123",
});
if (assignment?.variationKey === "one-click") {
  renderOneClickCheckout();
}
```

### Next.js SDK

```bash
npm install @togglebox/sdk-nextjs
```

```tsx
import {
  ToggleBoxProvider,
  useFlag,
  useExperiment,
  useConfig,
} from "@togglebox/sdk-nextjs";

// Wrap your app
<ToggleBoxProvider
  platform="web"
  environment="production"
  apiUrl={process.env.NEXT_PUBLIC_TOGGLEBOX_URL!}
>
  <App />
</ToggleBoxProvider>;

// Use in components
function PricingPage() {
  const config = useConfig();
  const { isEnabled } = useFlag("new-pricing");
  const { getVariant } = useExperiment("pricing-test", { userId: user.id });
  const [showNewPricing, setShowNewPricing] = useState(false);
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    isEnabled().then(setShowNewPricing);
    getVariant().then(setVariant);
  }, [isEnabled, getVariant]);

  return showNewPricing ? <NewPricing variant={variant} /> : <OldPricing />;
}
```

### Expo/React Native SDK

```bash
npm install @togglebox/sdk-expo
```

```tsx
import {
  ToggleBoxProvider,
  useConfig,
  useFlags,
  useToggleBox,
} from "@togglebox/sdk-expo";

// Wrap your app with offline persistence
<ToggleBoxProvider
  platform="mobile"
  environment="production"
  apiUrl="https://your-togglebox-api.com"
  persistToStorage={true}
  storageTTL={86400000}
>
  <App />
</ToggleBoxProvider>;

// Use in components
function HomeScreen() {
  const config = useConfig();
  const flags = useFlags();
  const { isLoading, isOnline, refresh } = useToggleBox();

  // Works offline with cached data
  return <View>...</View>;
}
```

### Example Apps

Both example apps are **kitchen sink** demos with copy-paste ready code:

#### [Next.js Example](./apps/example-nextjs)

Full-featured Next.js 15 app demonstrating:

| Quick Start         | Complete Examples    |
| ------------------- | -------------------- |
| Provider Setup      | Feature Toggle UI    |
| useConfig Hook      | A/B Test CTA Buttons |
| useFlag Hook        | Config-Driven Themes |
| useExperiment Hook  | SSR with Hydration   |
| Event Tracking      | Polling Updates      |
| SSR Config Fetching |                      |

```bash
pnpm dev:example-nextjs  # http://localhost:3002
```

#### [Expo Example](./apps/example-expo)

React Native/Expo app demonstrating:

| Quick Start    | Advanced               |
| -------------- | ---------------------- |
| Provider Setup | Conversion Tracking    |
| Remote Config  | Offline Storage (MMKV) |
| Feature Flags  | Polling & Refresh      |
| Experiments    | Health Check           |
|                | Error Handling         |

```bash
pnpm dev:example-expo  # Expo Go or simulator
```

See the [Next.js Example README](./apps/example-nextjs/README.md) and [Expo Example README](./apps/example-expo/README.md) for detailed documentation.

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

| Database          | Best For                    |
| ----------------- | --------------------------- |
| **DynamoDB**      | AWS Lambda, serverless      |
| **Cloudflare D1** | Cloudflare Workers, edge    |
| **PostgreSQL**    | Self-hosted, full SQL       |
| **MySQL**         | Self-hosted, enterprise     |
| **MongoDB**       | Document-oriented workloads |
| **SQLite**        | Local development, testing  |

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
│   ├── stats/            # Analytics and tracking
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

## SDK Publishing & Monorepo

This repository is a **monorepo** containing all ToggleBox packages and SDKs. SDKs are automatically published to npm and Packagist via GitHub Actions workflows.

### Published SDKs

**JavaScript (npm):**
- [`@togglebox/sdk`](https://www.npmjs.com/package/@togglebox/sdk) - Core JavaScript SDK
- [`@togglebox/sdk-nextjs`](https://www.npmjs.com/package/@togglebox/sdk-nextjs) - Next.js SDK with React hooks
- [`@togglebox/sdk-expo`](https://www.npmjs.com/package/@togglebox/sdk-expo) - Expo/React Native SDK

**PHP (Packagist):**
- [`togglebox/sdk`](https://packagist.org/packages/togglebox/sdk) - Core PHP SDK
- [`togglebox/laravel`](https://packagist.org/packages/togglebox/laravel) - Laravel SDK

### Automated Publishing

**JavaScript SDKs (npm):**
- Managed in the monorepo at `packages/sdk-js/`, `packages/sdk-nextjs/`, `packages/sdk-expo/`
- Published directly from monorepo to npm
- See [PUBLISHING.md](./PUBLISHING.md) for details

**PHP SDKs (Packagist):**
- Managed in the monorepo at `packages/sdk-php/`, `packages/sdk-laravel/`
- **Automatically synced** to separate repositories via GitHub Actions on every push to `main`:
  - `packages/sdk-php/` → [`togglebox-php`](https://github.com/ulpi-io/togglebox-php)
  - `packages/sdk-laravel/` → [`togglebox-laravel`](https://github.com/ulpi-io/togglebox-laravel)
- Packagist auto-detects updates from the split repositories
- See [PUBLISHING.md](./PUBLISHING.md) for details

**How it works:**
1. Developers work in the monorepo (`packages/sdk-php/`, `packages/sdk-laravel/`)
2. On push to `main`, GitHub Actions automatically splits and syncs to separate repos
3. Packagist detects changes via GitHub webhooks and updates packages
4. No manual splitting or syncing required!

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
- [GitHub](https://github.com/ulpi-io/togglebox)
- [GitHub Issues](https://github.com/ulpi-io/togglebox/issues)

---

Built with TypeScript, Express.js, Next.js, and pnpm.
.
