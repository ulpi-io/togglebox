# Project Commands

## Development Commands

```bash
# Install dependencies
pnpm install

# Start API server (port 3000)
pnpm dev:api

# Start admin dashboard (port 3001)
pnpm dev:admin

# Start example apps
pnpm dev:example-nextjs    # port 3002
pnpm dev:example-expo      # Expo Go
pnpm dev:example-nodejs    # Node.js CLI

# Build
pnpm build                 # Build all (packages + apps)
pnpm build:packages        # Build packages only (3 stages)
pnpm build:api             # Build API only
pnpm build:admin           # Build admin only
```

## Database Commands

```bash
# Seed demo data (DynamoDB local)
pnpm seed

# Prisma (for SQL databases)
cd packages/database
npm run schema:generate    # Generate schema based on DB_TYPE
npm run prisma:generate    # Generate + Prisma client
npm run prisma:migrate     # Generate + migrate
npm run prisma:deploy      # Generate + deploy migrations
```

## Quality Commands

```bash
pnpm test          # Run tests across all packages
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint issues
pnpm format        # Run Prettier
pnpm clean         # Clean dist and node_modules
```

## Deployment Commands

### AWS Lambda

```bash
cd apps/api
npm install -g serverless
serverless deploy --stage staging
serverless deploy --stage production
```

### Cloudflare Workers

```bash
cd apps/api
npm install -g wrangler
wrangler deploy
```

## Docker Development (Local DynamoDB)

```bash
# Start DynamoDB local
docker-compose up -d dynamodb-local

# Initialize tables (10 tables for three-tier architecture)
./docker/scripts/init-dynamodb.sh
```

## Demo Credentials

After running `pnpm seed`:
- **Email:** `admin@togglebox.com`
- **Password:** `Parola123!`
