# Project Commands

**pnpm monorepo** commands and project-specific workflows for ToggleBox.

**Architecture:** Dual monorepo structure at parent directory level.

**Directory Structure:**
```
/Users/ciprian/work/_______OGG_______/togglebox/  ← Parent directory
├── togglebox/          ← Open source monorepo
└── togglebox-cloud/    ← Private cloud monorepo
```

This file documents commands for **BOTH monorepos**. Pay attention to which directory each command applies to.

## First-Time Project Setup

### togglebox/ (Open Source) Setup

```bash
# Navigate to open source monorepo
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox

# Install pnpm (if not already installed)
npm install -g pnpm@8.12.0

# Install all workspace dependencies
pnpm install

# Build all packages
pnpm build:packages

# Generate Prisma schema (for SQL databases)
cd packages/database
pnpm schema:generate  # Generates schema based on DB_TYPE env var
pnpm prisma:generate  # Generate Prisma client

# Start API development server
cd ../..
pnpm dev:api
```

### togglebox-cloud/ (Private Cloud) Setup

```bash
# Navigate to cloud monorepo
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud

# Install all workspace dependencies
pnpm install

# Option 1: Use published packages from npm
pnpm build

# Option 2: Link to local togglebox/ packages for development
pnpm link-local  # Links to ../togglebox packages

# Start cloud API development server
pnpm dev:cloud-api

# OR start Docker development environment (recommended for full cloud setup)
make up  # See togglebox-cloud/LOCAL_DEVELOPMENT.md for details
```

## Development Commands

### togglebox/ (Open Source) Commands

**Working directory:** `cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox`

```bash
# Development servers
pnpm dev:api              # Start API development server with hot reload (tsx watch)
pnpm dev:admin            # Start admin dashboard (Next.js)
pnpm dev:example-nextjs   # Start example Next.js app demonstrating SDK
pnpm dev:example-expo     # Start example Expo app demonstrating SDK
pnpm dev:example-nodejs   # Start example Node.js app demonstrating SDK

# Build commands
pnpm build                # Build all packages + apps
pnpm build:packages       # Build only workspace packages
pnpm build:api            # Build only API
pnpm build:admin          # Build only admin dashboard
pnpm build:example-nextjs # Build example Next.js app
pnpm build:example-nodejs # Build example Node.js app

# Maintenance
pnpm clean                # Clean all dist directories and node_modules
pnpm test                 # Run tests across all packages
pnpm lint                 # Run ESLint across all packages
pnpm lint:fix             # Fix ESLint issues
pnpm format               # Run Prettier on all files
```

### togglebox-cloud/ (Private Cloud) Commands

**Working directory:** `cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

```bash
# Development servers
pnpm dev:cloud-api   # Start cloud API development server
pnpm dev:cloud-app   # Start cloud dashboard (Next.js)
pnpm dev:web         # Start marketing site (Next.js)

# Build commands
pnpm build           # Build all packages + apps
pnpm build:packages  # Build only workspace packages (billing, multitenancy)
pnpm build:cloud-api # Build only cloud API
pnpm build:cloud-app # Build only cloud dashboard
pnpm build:web       # Build only marketing site

# Local development with open source packages
pnpm link-local      # Link to local ../togglebox packages
pnpm unlink-local    # Restore npm packages

# Maintenance
pnpm clean           # Clean all dist directories and node_modules
pnpm test            # Run tests across all packages
pnpm lint            # Run ESLint across all packages
pnpm lint:fix        # Fix ESLint issues
pnpm format          # Run Prettier on all files
```

### togglebox-cloud/ Docker Development (Makefile)

**Working directory:** `cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

Complete Docker development environment with Traefik, DynamoDB Local, and multi-tenant subdomains:

```bash
# Service management
make up              # Start all services (generates SSL certs if needed)
make down            # Stop all services
make restart         # Restart all services
make build           # Rebuild all services
make clean           # Stop services and remove volumes
make status          # Show service status and access points

# Logs
make logs            # Tail logs for all services
make logs-api        # Cloud API logs only
make logs-app        # Cloud App logs only
make logs-web        # Marketing site logs only
make logs-db         # DynamoDB Local logs only

# Database management
make reset-db        # Reset DynamoDB data (WARNING: deletes all data)
make init-db         # Re-initialize DynamoDB tables

# Shell access
make shell-api       # Open shell in cloud-api container
make shell-app       # Open shell in cloud-app container
make shell-web       # Open shell in web container

# SSL certificates
make certs           # Generate self-signed SSL certificates
make certs-clean     # Remove SSL certificates
make certs-trust     # Trust certificate (macOS only, requires sudo)

# Hosts file management
make hosts-add       # Add *.togglebox.local to /etc/hosts (requires sudo)
make hosts-remove    # Remove entries from /etc/hosts (requires sudo)

# Testing
make test            # Run tests in cloud-api container
make test-watch      # Run tests in watch mode
```

**Docker Access Points:**
- Marketing site: https://togglebox.local
- Cloud Dashboard (Frontend): https://app.togglebox.local
  - **IMPORTANT:** Frontend is ALWAYS on `app.togglebox.local` (NO tenant subdomains)
  - Tenant context stored in `tenant-subdomain` cookie
- Global API (Auth/Onboarding): https://api.togglebox.local
  - Used for authentication, registration, onboarding (before tenant exists)
- Tenant APIs: https://{tenant}.togglebox.local (e.g., acme.togglebox.local, demo.togglebox.local)
  - Used for all tenant-specific API calls after onboarding
- DynamoDB Admin: https://dynamodb-admin.togglebox.local
- Traefik Dashboard: http://traefik.togglebox.local:8080

**Multi-Tenancy Flow:**
1. User visits https://app.togglebox.local/login
2. After login, API calls go to https://api.togglebox.local/api/v1/auth/*
3. After onboarding creates tenant, cookie `tenant-subdomain` is set
4. Subsequent API calls go to https://{tenant}.togglebox.local/api/v1/*
5. User STAYS on https://app.togglebox.local/dashboard (no redirect to tenant subdomain)

See `togglebox-cloud/LOCAL_DEVELOPMENT.md` for complete Docker setup guide.

## Database Operations

**Database Package Location:** `togglebox/packages/database/`

Both monorepos can use the multi-database package from the open source repo. Supported databases:
- **DynamoDB** (AWS Lambda deployment)
- **Cloudflare D1** (Cloudflare Workers deployment)
- **MySQL** (Self-hosted/RDS)
- **PostgreSQL** (Self-hosted/RDS)
- **MongoDB** (Self-hosted/Atlas)
- **SQLite** (Local development)

### Prisma (for SQL databases)

**Working directory:** `cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox/packages/database`

```bash
# Generate Prisma schema based on DB_TYPE environment variable
export DB_TYPE=mysql  # Options: mysql, postgresql, sqlite
pnpm schema:generate

# Generate Prisma client
pnpm prisma:generate

# Run migrations (development)
pnpm prisma:migrate

# Deploy migrations (production)
pnpm prisma:deploy

# Open Prisma Studio (GUI)
npx prisma studio
```

#### DynamoDB (AWS Lambda deployment)
```bash
# DynamoDB uses single-table design with PK/SK pattern
# No migrations needed - table created via CloudFormation/Terraform

# Local DynamoDB for development
docker run -p 8000:8000 amazon/dynamodb-local

# Set environment variables
export DYNAMODB_TABLE=configurations
export DYNAMODB_ENDPOINT=http://localhost:8000
export AWS_REGION=us-east-1
```

#### Cloudflare D1 (Cloudflare Workers deployment)
```bash
# Create D1 database
wrangler d1 create remote-config-db

# Apply schema
wrangler d1 execute remote-config-db --file=packages/database/d1/schema.sql

# Query database
wrangler d1 execute remote-config-db --command="SELECT * FROM platforms"

# Local development
wrangler d1 execute remote-config-db --local --file=packages/database/d1/schema.sql
```

#### MongoDB (Alternative)
```bash
# MongoDB uses Mongoose - no migrations
# Connection handled via MONGODB_URI environment variable

# Start local MongoDB
docker run -p 27017:27017 mongo:latest

# Set environment variable
export MONGODB_URI=mongodb://localhost:27017/remote-config
```

### Code Quality

```bash
# Run ESLint on all packages
pnpm lint

# Fix ESLint issues automatically across all packages
pnpm lint:fix

# Run Prettier on all TypeScript and config files
pnpm format

# Run lint and format together
pnpm lint:fix && pnpm format
```

### Testing

```bash
# Run all tests across all packages
pnpm test

# Run tests for specific package
pnpm --filter api test
pnpm --filter @config/database test

# Run tests in watch mode (API)
pnpm --filter api test:watch

# TypeScript type checking
pnpm --filter api build  # Will fail on type errors
```

## Monorepo Workspace Commands

### Working with Specific Packages

```bash
# Run command in specific workspace package
pnpm --filter <package-name> <command>

# Examples:
pnpm --filter api dev
pnpm --filter @config/database build
pnpm --filter @config/core test

# Run command in all packages recursively
pnpm -r <command>

# Examples:
pnpm -r build    # Build all packages
pnpm -r test     # Test all packages
pnpm -r clean    # Clean all packages

# Add dependency to specific package
pnpm --filter api add express
pnpm --filter @config/database add @prisma/client
```

## Project-Specific Custom Commands

### Demo Data Seeding
```bash
# Seed demo data for example apps (requires API to be running)
./scripts/seed-demo-data.sh

# With custom API URL
API_URL=http://localhost:3000/api/v1 ./scripts/seed-demo-data.sh

# Creates:
#   - Platforms: web, mobile
#   - Environments: staging for each platform
#   - Config versions: 1.0.0 and 1.1.0 (stable) for web, 1.0.0 for mobile
#   - Feature flags: dark-mode, new-checkout, beta-features for web; offline-mode, biometric-auth for mobile
#   - Experiments: checkout-test, pricing-page for web; onboarding-flow for mobile
```

### Docker DynamoDB Initialization
```bash
# Initialize DynamoDB tables (run from docker/ directory)
./docker/scripts/init-dynamodb.sh

# Wait for DynamoDB to be ready before starting
./docker/scripts/wait-for-dynamodb.sh

# Creates 10 tables:
#   - togglebox-users, togglebox-api-keys, togglebox-password-resets
#   - togglebox-platforms, togglebox-environments, togglebox-configs
#   - togglebox-remote-configs, togglebox-flags, togglebox-experiments, togglebox-stats
```

### Database Schema Generation
```bash
# Generate Prisma schema for specific database type
cd packages/database
export DB_TYPE=mysql    # or: postgresql, sqlite, mongodb
pnpm schema:generate

# Generate for PostgreSQL
DB_TYPE=postgresql pnpm schema:generate

# Generate for MySQL
DB_TYPE=mysql pnpm schema:generate
```

### Multi-Platform Validation
```bash
# Validate Prisma schemas for all database types
cd packages/database
npm run validate:all   # If script exists

# Or manually:
DB_TYPE=postgresql npx prisma validate
DB_TYPE=mysql npx prisma validate
```

## Deployment Commands

**This project supports multiple deployment platforms:**

### AWS Lambda Deployment (Serverless Framework)

```bash
# Prerequisites
npm install -g serverless

# Deploy to AWS Lambda
cd apps/api
serverless deploy --stage production

# Deploy specific function
serverless deploy function --function api --stage production

# View logs
serverless logs --function api --tail

# Remove deployment
serverless remove --stage production

# Environment: AWS Lambda + API Gateway
# Database: DynamoDB (recommended)
# Security: Network isolation via API Gateway Resource Policy
```

### Cloudflare Workers Deployment

```bash
# Prerequisites
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Deploy to Cloudflare Workers
cd apps/api
wrangler deploy

# Deploy with specific environment
wrangler deploy --env production

# Tail logs
wrangler tail

# View deployment info
wrangler deployments list

# Environment: Cloudflare Workers (edge)
# Database: Cloudflare D1 (recommended)
# Security: Application-level auth (JWT/API Keys required)
```

### Docker/Self-Hosted Deployment

```bash
# Build Docker image
docker build -t remote-config-api:latest .

# Run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Build and restart
docker-compose up -d --build

# Environment: Docker/ECS/Self-hosted
# Database: MySQL, MongoDB, or SQLite
# Security: Configurable (auth or network isolation)
```

### Netlify Deployment

```bash
# Deploy to Netlify Functions
cd apps/api
netlify deploy

# Deploy to production
netlify deploy --prod

# View logs
netlify functions:log

# Environment: Netlify Functions
# Database: MySQL, MongoDB (external)
# Security: Application-level auth recommended
```

### Build and Prepare for Deployment

```bash
# Build all packages and API for production
pnpm build

# Type check before deployment
pnpm -r build  # Will fail if type errors exist

# Run tests before deployment
pnpm test
```


## Maintenance & Monitoring

### Application Health

```bash
# Check health endpoint
curl http://localhost:3000/health

# Check readiness endpoint
curl http://localhost:3000/ready

# View application metrics (if implemented)
curl http://localhost:3000/metrics
```

### Log Management

**togglebox-cloud with Docker:**
```bash
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud
make logs           # All services
make logs-api       # Cloud API only
make logs-app       # Cloud dashboard only
make logs-web       # Marketing site only
```

**Development mode:**
```bash
# Logs are output to console when running pnpm dev:api or pnpm dev:cloud-api
# Check terminal output
```

## Debugging

### Node.js Debugger
```bash
# Start with debugger
node --inspect src/index.js

# Start with debugger and break at first line
node --inspect-brk src/index.js

# Debug with nodemon
nodemon --inspect src/index.js

# Connect debugger on port 9229
chrome://inspect
```

### Environment Variables
```bash
# Print all environment variables
npm run env

# Check specific variable
echo $NODE_ENV
echo $DATABASE_URL

# Load .env and run command
npx dotenv -- node src/index.js
```

### Database Debugging

**Prisma query logging:**
```typescript
// In database configuration
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});
```

**DynamoDB (Docker Local):**
```bash
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud
make logs-db  # View DynamoDB Local logs
```

## Useful pnpm Commands

```bash
# Install dependencies
pnpm install

# Install production dependencies only
pnpm install --prod

# Install specific package
pnpm add <package-name>

# Install dev dependency
pnpm add -D <package-name>

# Install package in specific workspace
pnpm --filter <workspace-name> add <package-name>

# Remove package
pnpm remove <package-name>

# Update all dependencies
pnpm update

# Update specific package
pnpm update <package-name>

# Check for outdated packages
pnpm outdated

# Check for security vulnerabilities
pnpm audit

# List installed packages
pnpm list

# View package info
pnpm info <package-name>
```

---

**Last Updated:** 2026-01-26

**Note:** This documentation covers commands for **BOTH monorepos**:
- **togglebox/** - Open source core at `/Users/ciprian/work/_______OGG_______/togglebox/togglebox`
- **togglebox-cloud/** - Private cloud at `/Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

Both use **pnpm workspaces**. Always verify you're in the correct directory before running commands.
