# ToggleBox Node.js Example - Product Store API

A production-ready Express.js + TypeScript + Pino example API demonstrating all ToggleBox SDK features in a realistic e-commerce context.

## Quick Start

```bash
# From monorepo root
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox

# Install dependencies
pnpm install

# Build SDK first
pnpm --filter @togglebox/sdk build

# Start the API (required for the examples)
pnpm dev:api

# Seed demo data (in another terminal) - creates demo user, flags, experiments
./scripts/seed-demo-data.sh

# Start example app
pnpm dev:example-nodejs
```

The server starts at `http://localhost:3003`

## Demo Data

The seed script creates demo data for this app:

| Type            | Key                    | Description                                                    |
| --------------- | ---------------------- | -------------------------------------------------------------- |
| **Platform**    | `ecommerce`            | Platform identifier                                            |
| **Environment** | `development`          | Environment for this app                                       |
| **Flag**        | `new-checkout-flow`    | Toggle new checkout flow                                       |
| **Experiment**  | `checkout-button-test` | A/B test button text (`control`, `buy_now`, `add_to_cart`)     |
| **Experiment**  | `pricing-display-test` | Test price display (`control`, `tax_included`, `tax_excluded`) |
| **Config**      | `theme`, `apiTimeout`  | Remote configuration values                                    |

**Demo Admin:** `admin@togglebox.com` / `Parola123!`

## Features Demonstrated

| Tier          | Feature                           | Use Case                           |
| ------------- | --------------------------------- | ---------------------------------- |
| **Tier 1**    | Remote Configs                    | Store settings, currency, tax rate |
| **Tier 2**    | `reviews-enabled` flag            | Toggle product reviews visibility  |
| **Tier 2**    | `express-shipping` flag           | Enable/disable express shipping    |
| **Tier 2**    | `new-checkout-flow` flag          | Gradual rollout of new checkout    |
| **Tier 3**    | `checkout-button-test` experiment | A/B test button text               |
| **Tier 3**    | `pricing-display-test` experiment | Test price display formats         |
| **Analytics** | Event tracking                    | Track views, cart, checkout events |
| **Analytics** | Conversion tracking               | Track purchases for experiments    |

## API Endpoints

### Health Checks

```bash
# Basic health check
curl http://localhost:3003/health

# Readiness check (includes ToggleBox connection)
curl http://localhost:3003/ready
```

### Tier 1: Remote Configs

Get store configuration (same for all users):

```bash
curl http://localhost:3003/api/store/config
```

**Response:**

```json
{
  "store": {
    "name": "My Store",
    "currency": "USD",
    "taxRate": 0.08,
    "freeShippingThreshold": 50
  },
  "_raw": { ... }
}
```

### Tier 2: Feature Flags

Get products with feature flags:

```bash
# With required user context header
curl -H "X-User-Id: user-123" \
     -H "X-Country: US" \
     http://localhost:3003/api/products
```

**Response:**

```json
{
  "products": [
    {
      "id": "prod-001",
      "name": "Wireless Headphones",
      "price": 199.99,
      "reviews": [...]  // Only included if reviews-enabled flag is true
    }
  ],
  "features": {
    "showReviews": true,
    "expressShipping": false
  }
}
```

Get single product:

```bash
curl -H "X-User-Id: user-123" \
     http://localhost:3003/api/products/prod-001
```

### Cart Operations

Add item to cart (with event tracking):

```bash
curl -X POST \
     -H "X-User-Id: user-123" \
     -H "Content-Type: application/json" \
     -d '{"productId": "prod-001", "quantity": 2}' \
     http://localhost:3003/api/cart/add
```

**Response:**

```json
{
  "success": true,
  "item": {
    "productId": "prod-001",
    "name": "Wireless Headphones",
    "quantity": 2,
    "price": 199.99,
    "total": 399.98
  }
}
```

### Tier 3: Experiments

Get checkout page (with experiment assignments):

```bash
curl -H "X-User-Id: user-123" \
     http://localhost:3003/api/checkout
```

**Response:**

```json
{
  "checkoutVersion": "v2",
  "buttonText": "Buy Now",
  "showTaxIncluded": false,
  "experiments": {
    "buttonTest": {
      "variationKey": "buy-now",
      "experimentKey": "checkout-button-test"
    },
    "pricingTest": {
      "variationKey": "tax-excluded",
      "experimentKey": "pricing-display-test"
    }
  }
}
```

Complete purchase (with conversion tracking):

```bash
curl -X POST \
     -H "X-User-Id: user-123" \
     -H "Content-Type: application/json" \
     -d '{"orderId": "ORD-001", "total": 99.99}' \
     http://localhost:3003/api/checkout/complete
```

## Copy-Paste Patterns

### Pattern 1: Initialize Client

```typescript
import { ToggleBoxClient } from "@togglebox/sdk";

const client = new ToggleBoxClient({
  platform: "your-platform",
  environment: "production",
  apiUrl: "https://your-api.togglebox.io",
  pollingInterval: 30000,
  cache: { enabled: true, ttl: 60000 },
});
```

### Pattern 2: Get Config Value (Tier 1)

```typescript
// With default fallback
const theme = await client.getConfigValue("theme", "light");
const maxItems = await client.getConfigValue<number>("maxItems", 100);

// Get entire config
const config = await client.getConfig();
```

### Pattern 3: Check Feature Flag (Tier 2)

```typescript
const isEnabled = await client.isFlagEnabled("my-feature", {
  userId: "user-123",
  country: "US",
});

if (isEnabled) {
  // Show new feature
}
```

### Pattern 4: Get Experiment Variant (Tier 3)

```typescript
const variant = await client.getVariant("my-experiment", {
  userId: "user-123",
});

switch (variant?.variationKey) {
  case "control":
    // Show control version
    break;
  case "treatment":
    // Show treatment version
    break;
}
```

### Pattern 5: Track Event

```typescript
client.trackEvent(
  "add_to_cart",
  { userId: "user-123" },
  {
    experimentKey: "checkout-test",
    variationKey: "treatment",
    properties: { itemCount: 3, cartValue: 150 },
  },
);
```

### Pattern 6: Track Conversion

```typescript
await client.trackConversion(
  "my-experiment",
  { userId: "user-123" },
  {
    metricName: "purchase",
    value: 99.99,
  },
);
```

### Pattern 7: Graceful Shutdown

```typescript
process.on("SIGTERM", async () => {
  await client.flushStats();
  client.destroy();
  process.exit(0);
});
```

## Environment Variables

| Variable                | Description        | Default                        |
| ----------------------- | ------------------ | ------------------------------ |
| `PORT`                  | Server port        | `3003`                         |
| `NODE_ENV`              | Environment        | `development`                  |
| `TOGGLEBOX_PLATFORM`    | Platform name      | `ecommerce`                    |
| `TOGGLEBOX_ENVIRONMENT` | Environment name   | `development`                  |
| `TOGGLEBOX_API_URL`     | API base URL       | `http://localhost:3000/api/v1` |
| `TOGGLEBOX_API_KEY`     | API key (optional) | -                              |

## Project Structure

```
apps/example-nodejs/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── config/
│   │   ├── env.ts            # Environment config
│   │   ├── logger.ts         # Pino logger
│   │   └── togglebox.ts      # SDK client singleton
│   ├── middleware/
│   │   ├── request-logger.ts # Pino HTTP middleware
│   │   ├── user-context.ts   # Context extraction
│   │   └── error-handler.ts  # Error handling
│   ├── routes/
│   │   ├── index.ts          # Route aggregator
│   │   ├── health.routes.ts  # Health checks
│   │   ├── store.routes.ts   # Config endpoints
│   │   ├── products.routes.ts # Products + flags
│   │   ├── cart.routes.ts    # Cart + events
│   │   └── checkout.routes.ts # Checkout + experiments
│   ├── data/
│   │   └── products.ts       # Mock product data
│   └── types/
│       └── index.ts          # Type definitions
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Required Headers

For personalized features (flags, experiments):

| Header       | Description            | Required |
| ------------ | ---------------------- | -------- |
| `X-User-Id`  | Unique user identifier | Yes      |
| `X-Country`  | ISO-3166 country code  | No       |
| `X-Language` | ISO-639 language code  | No       |

## License

MIT
