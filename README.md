# ToggleBox

**Open source remote configuration, feature flags, and experimentation platform.**

Self-host it anywhere or use our [hosted version](https://togglebox.dev) for a fully managed experience.

[![GitHub](https://img.shields.io/github/stars/ulpi-io/togglebox?style=social)](https://github.com/ulpi-io/togglebox)
[![License: ELv2](https://img.shields.io/badge/License-ELv2-blue.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![pnpm](https://img.shields.io/badge/pnpm-8.x-orange.svg)](https://pnpm.io/)

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
| **Type-Safe SDKs** | JavaScript, Next.js, Expo/React Native                        |
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

### JavaScript SDK

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
  const { checkEnabled } = useFlag("new-pricing");
  const { getVariant } = useExperiment("pricing-test", { userId: user.id });
  const [showNewPricing, setShowNewPricing] = useState(false);
  const [variant, setVariant] = useState<string | null>(null);

  useEffect(() => {
    checkEnabled().then(setShowNewPricing);
    getVariant().then(setVariant);
  }, [checkEnabled, getVariant]);

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
