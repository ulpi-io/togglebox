# Team Conventions

**Recommended** development standards and workflow conventions for ToggleBox dual monorepo structure.

**Architecture:** This file documents conventions for **BOTH monorepos**:
```
/Users/ciprian/work/_______OGG_______/togglebox/  ← Parent directory
├── togglebox/          ← Open source monorepo
└── togglebox-cloud/    ← Private cloud monorepo
```

**Current Status (togglebox/ - Open Source):**
- ✅ **Git repository initialized** - `.git` directory exists
- ✅ **CI/CD configured** - GitHub Actions in `.github/workflows/`
  - `ci.yml` - Lint, TypeCheck, Test, Security Audit, Format Check
  - `deploy-aws-lambda.yml` - AWS Lambda deployment
  - `deploy-cloudflare-workers.yml` - Cloudflare Workers deployment
- ✅ **PR Template** - Located at `.github/pull_request_template.md`
- ✅ **Dependabot** - Configured at `.github/dependabot.yml`
- ✅ **.env.example exists** - Located at `apps/api/.env.example`
- ✅ **pnpm workspaces** - Configured and working
- ✅ **TypeScript with strict mode** - Configured
- ✅ **ESLint + Prettier** - Configured
- ✅ **Jest testing** - Configured

**Current Status (togglebox-cloud/ - Private Cloud):**
- ⚠️ **Separate git repository** - togglebox-cloud has its own repository
- ⚠️ **CI/CD to be configured** - Based on deployment target
- ✅ **.env.example exists** - Located at `apps/cloud-api/.env.example` and `.env.local.example`
- ✅ **pnpm workspaces** - Configured and working
- ✅ **TypeScript with strict mode** - Configured
- ✅ **ESLint + Prettier** - Configured
- ✅ **Docker development environment** - Configured with Makefile

## Git Workflow

**Branching Strategy:** GitHub Flow
- `main` - Production-ready code, protected branch
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/user-authentication`)
- `bugfix/*` - Bug fixes (e.g., `bugfix/login-validation`)
- `hotfix/*` - Critical production fixes (e.g., `hotfix/payment-error`)

**CI/CD Triggers:**
- CI runs on push to `main` and `develop` branches
- CI runs on all pull requests targeting `main` or `develop`

**Branch Protection (configure in GitHub):**
- Require pull request before merging to `main`
- Require 1-2 approvals from team members
- Require all CI checks to pass
- No force push to `main`

**Commit Messages:** Conventional Commits format
```
feat: add user profile export functionality
fix: resolve login validation error
docs: update API documentation
refactor: simplify user service logic
test: add tests for payment processing
chore: update dependencies
```

**Commit Format:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation only changes
- `refactor:` - Code changes that neither fix bugs nor add features
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks (dependencies, config, etc.)
- `perf:` - Performance improvements

## Pull Request Process

**Requirements:**
- 2 approvals required before merge
- All CI/CD checks must pass
- Code review within 24 hours
- Squash and merge into `main`
- Delete branch after merge

**PR Template (actual .github/pull_request_template.md):**
```markdown
## Description
<!-- Provide a brief description of the changes in this PR -->

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Dependency update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] All existing tests pass

## Code Quality Checklist
- [ ] Code follows the project's style guidelines (ESLint and Prettier)
- [ ] Self-review of code completed
- [ ] Code commented where necessary (especially complex logic)
- [ ] No hardcoded values (configuration moved to env vars)
- [ ] Error handling implemented
- [ ] No commented-out code
- [ ] Environment variables documented in `.env.example`

## Security Checklist
- [ ] No secrets or API keys in code
- [ ] Input validation implemented
- [ ] No SQL injection vulnerabilities
- [ ] Authentication/authorization properly implemented (if applicable)
- [ ] Dependencies scanned for vulnerabilities (`pnpm audit`)

## Performance Checklist
- [ ] No N+1 query patterns introduced
- [ ] Database queries optimized (indexes, eager loading)
- [ ] No blocking operations in request handlers
- [ ] Caching strategy considered (if applicable)

## Database Changes (if applicable)
- [ ] Prisma schema updated
- [ ] Migrations created
- [ ] Rollback plan documented

## Reviewer Checklist
- [ ] Code is easy to understand and maintain
- [ ] Tests are comprehensive and meaningful
- [ ] No security vulnerabilities introduced
- [ ] Changes align with project architecture
```

**Merge Strategy:** Squash and merge
- Keeps `main` history clean
- Single commit per feature/fix
- Detailed history preserved in PR

## Code Review Guidelines

**Review Checklist:**
- [ ] Code passes ESLint and Prettier checks
- [ ] Tests included for new features/fixes
- [ ] No N+1 queries (check with logging in development)
- [ ] Security considerations addressed
- [ ] No hardcoded values (use config files)
- [ ] Error handling implemented
- [ ] No commented-out code
- [ ] Environment variables documented in `.env.example`
- [ ] Async operations use try/catch or asyncHandler
- [ ] No blocking operations in request handlers

**Review SLA:** Reviews completed within 24 hours (business days)

**Blocking Issues:**
- Security vulnerabilities
- Failing tests
- Missing tests for new features
- Hardcoded secrets or sensitive data
- Unhandled error cases
- Blocking operations in request handlers

**Auto-merge:** Not permitted - all changes require manual review

## Code Style

**Standard:** TypeScript + ESLint + Prettier (configured in both monorepos)

**Commands work identically in both monorepos:**

```bash
# Navigate to either monorepo first:
# cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox
# OR
# cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud

# Check code style across all packages
pnpm lint

# Fix code style automatically
pnpm lint:fix

# Format with Prettier
pnpm format

# Combined
pnpm lint:fix && pnpm format
```

**ESLint Configuration:**
- TypeScript-specific rules via `@typescript-eslint`
- Configured at root level, applies to all packages
- Individual packages can extend with package-specific rules

**Prettier Configuration:**
- Consistent formatting across all packages
- Configured at root level: `.prettierrc` or `prettier.config.js`
- Formats TypeScript, JSON, YAML, Markdown files

**TypeScript Standards:**
- Strict mode enabled (`strict: true` in `tsconfig.json`)
- Explicit return types for public functions
- Avoid `any` type (use `unknown` if truly dynamic)
- Use interfaces for object shapes, types for unions/intersections
- Enable `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`

**Run Before Commit (when git is initialized):**
```bash
git add .
pnpm lint:fix
pnpm format
git add .
git commit -m "feat: your commit message"
```

**Additional Standards:**
- Use async/await over promises/callbacks
- Use const by default, let when reassignment needed, never var
- Use template literals for string interpolation
- Always handle errors in async functions
- Prefer type inference when obvious, explicit types when not

## Testing Standards

**Framework:** Jest + ts-jest (TypeScript support)

**Required Tests:**
- Integration test for every API endpoint
- Unit test for database abstraction layer
- Test for validation schemas (Zod)
- Type safety tests (compilation tests via `tsc`)

**Coverage Requirements (Recommended):**
- Controllers: Test all endpoints
- Database layer: Test multi-database abstractions
- Core business logic: 80% minimum
- Type coverage: 100% (enforce via `strict: true`)

**Test Organization:**

**togglebox/ (Open Source):**
```
apps/api/src/
  controllers/__tests__/
    configController.test.ts
  routes/__tests__/
    publicRoutes.test.ts

packages/database/src/
  __tests__/
    prisma.test.ts
    dynamodb.test.ts
```

**togglebox-cloud/ (Private Cloud):**
```
apps/cloud-api/src/
  controllers/__tests__/
    billingController.test.ts
  middleware/__tests__/
    subdomainTenantContext.test.ts

packages/billing/src/
  __tests__/
    stripe.test.ts
packages/multitenancy/src/
  __tests__/
    tenantIsolation.test.ts
```

**Test Naming:** Use descriptive names
```typescript
describe('POST /api/v1/internal/platforms', () => {
  it('should create a new platform with valid data', async () => {});
  it('should return 422 for invalid platform name', async () => {});
  it('should return 409 for duplicate platform', async () => {});
});
```

**Mock External Services:**
```typescript
jest.mock('aws-sdk');
jest.mock('@prisma/client');

// In test
const mockDynamoDB = DynamoDB as jest.Mocked<typeof DynamoDB>;
mockDynamoDB.DocumentClient.prototype.put.mockReturnValue({
  promise: jest.fn().mockResolvedValue({}),
} as any);
```

**Run Tests Before Deployment:**
```bash
pnpm test
pnpm build  # Type check via TypeScript compilation
```

**CI/CD (Configured):**
- ✅ GitHub Actions configured in `.github/workflows/ci.yml`
- **Jobs run on PR/push:**
  - `lint` - ESLint checks
  - `typecheck` - TypeScript build verification
  - `test` - Jest test suite
  - `security-audit` - `pnpm audit --audit-level moderate`
  - `format-check` - Prettier format verification
- Block merge if any step fails

## Database Conventions

**Multi-Database Support:**
- DynamoDB (single-table design, no migrations)
- Prisma for SQL databases (MySQL, PostgreSQL, SQLite)
- Mongoose for MongoDB (schema-less, no migrations)

**Prisma Migrations (SQL databases):**

**Database package location:** `togglebox/packages/database/` (shared by both monorepos)

```bash
# Navigate to database package
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox/packages/database

# Generate schema based on DB_TYPE
export DB_TYPE=mysql
pnpm schema:generate

# Create migration
pnpm prisma:migrate

# Deploy to production
pnpm prisma:deploy
```

**Prisma Schema Example:**
```prisma
model Platform {
  id          String   @id @default(uuid())
  name        String   @unique
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([name])
  @@map("platforms")
}
```

**Naming Conventions:**
- **Prisma Models**: PascalCase (e.g., `Platform`, `Environment`)
- **Database Tables**: snake_case (e.g., `platforms`, `environments`)
- **Columns**: camelCase in Prisma, snake_case in database via `@map()`
- **Boolean fields**: `isActive`, `hasVerified` in code, `is_active` in DB
- **Timestamps**: `createdAt`, `updatedAt` in code, `created_at` in DB

**DynamoDB Conventions:**
```typescript
// Single-table design with PK/SK pattern
{
  PK: "PLATFORM#{platformName}",
  SK: "ENV#{envName}#VERSION#{version}",
  // ... data
  createdAt: ISO8601 timestamp,
  updatedAt: ISO8601 timestamp
}
```

**Indexes:**
- Prisma: Define in schema via `@@index([field])`
- DynamoDB: Use GSI (Global Secondary Index) for alternate query patterns
- MongoDB: Create via Mongoose schema `index: true`

## API Conventions

**Response Format:** Consistent JSON structure
```json
{
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

**List Response:**
```json
{
  "data": [
    { "id": 1, "name": "User 1" },
    { "id": 2, "name": "User 2" }
  ],
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Format:**
```json
{
  "error": {
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Email is required" }
    ]
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

**Pagination:**
- Default limit: 20 items per page
- Max limit: 100 items per page
- Query params: `?page=1&perPage=20`
- Include pagination meta in response

**Filtering:**
- Query parameters for filtering: `?status=active&role=admin`
- Sorting: `?sort=-createdAt` (- for descending)
- Search: `?search=keyword`

## Multi-Tenancy Conventions (togglebox-cloud/)

**CRITICAL: Frontend vs API URL Pattern**

```
Frontend (Next.js):  ALWAYS https://app.togglebox.local
                     NO tenant subdomains for frontend
                     Tenant context stored in cookie

API (Express):       Auth/Onboarding: https://api.togglebox.local
                     Tenant-specific:  https://{tenant}.togglebox.local
```

**Frontend URL Pattern:**
- Users ALWAYS access dashboard via `app.togglebox.local`
- NO redirects to tenant subdomains
- Tenant context stored in `tenant-subdomain` cookie
- Cookie is readable by client-side JavaScript (`httpOnly: false`)

**API URL Pattern:**
- Auth endpoints (login, register, password-reset): `api.togglebox.local`
- Onboarding endpoints (create tenant): `api.togglebox.local`
- All tenant-specific endpoints: `{tenant}.togglebox.local`

**Cookie-Based Tenant Context:**
```typescript
// After onboarding, set tenant cookie with shared domain
const domain = process.env.NEXT_PUBLIC_DOMAIN || 'togglebox.local';
cookieStore.set('tenant-subdomain', tenant.subdomain, {
  httpOnly: false,     // Client needs to read for API URL construction
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,  // 1 year
  path: '/',
  domain: `.${domain}`,  // Shared across all subdomains
});
```

**API Client Pattern:**
```typescript
// Server-side: read tenant from cookie
async function getTenantSubdomain(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('tenant-subdomain')?.value || null;
}

// Client-side: read tenant from document.cookie
function getTenantSubdomainClient(): string | null {
  if (typeof window === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )tenant-subdomain=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Construct tenant-aware API URL
const tenant = await getTenantSubdomain();
const baseUrl = tenant
  ? `https://${tenant}.togglebox.local`
  : 'https://api.togglebox.local';
```

**Middleware Pattern:**
- Frontend middleware handles ONLY authentication (check `auth-token` cookie)
- NO tenant detection in frontend middleware (tenant not in URL)
- API middleware extracts tenant from subdomain

**Environment Variables for Multi-Tenancy:**
```bash
# Frontend (cloud-app)
NEXT_PUBLIC_API_URL=https://api.togglebox.local   # For auth/onboarding
NEXT_PUBLIC_DOMAIN=togglebox.local                 # For cookie domain

# API (cloud-api)
DOMAIN=togglebox.local                             # Base domain for tenant subdomains
```

## Naming Conventions

**Files:**
- kebab-case for all files: `config-controller.ts`, `auth-middleware.ts`
- TypeScript extension: `.ts` for code, `.d.ts` for type declarations

**Controllers:**
- camelCase exported functions (not classes in this project)
- File suffix: `Controller`
- Example: `configController.ts` exports functions like `createPlatform`

**Interfaces and Types:**
- PascalCase: `Platform`, `Environment`, `ConfigVersion`
- Prefix interfaces with `I` if ambiguous: `IConfigInput` vs `Config` model

**Functions:**
- camelCase: `getPlatforms`, `deployConfiguration`, `toggleFeatureFlag`

**Constants:**
- UPPER_SNAKE_CASE: `CACHE_TTL`, `DEFAULT_PAGE_SIZE`, `MAX_PLATFORMS`

**Environment Variables:**
- UPPER_SNAKE_CASE: `DB_TYPE`, `AWS_REGION`, `DYNAMODB_TABLE`

**Package Names (monorepo):**

**togglebox/ (Open Source):**
- Core: `@togglebox/core`, `@togglebox/configs`, `@togglebox/flags`, `@togglebox/experiments`, `@togglebox/stats`
- Infrastructure: `@togglebox/database`, `@togglebox/cache`, `@togglebox/auth`, `@togglebox/shared`, `@togglebox/ui`
- JavaScript SDKs: `@togglebox/sdk`, `@togglebox/sdk-nextjs`, `@togglebox/sdk-expo`
- PHP SDKs: `togglebox/sdk-php` (Composer), `togglebox/sdk-laravel` (Composer)

**togglebox-cloud/ (Private Cloud):**
- Scoped: `@togglebox/billing`, `@togglebox/multitenancy`
- Uses all open source packages from `togglebox/` plus cloud-specific packages

## Documentation Standards

**TSDoc Comments:** All public functions and types
```typescript
/**
 * Deploys a new configuration version to the specified platform and environment.
 *
 * @param platformName - The platform identifier (e.g., "web", "mobile")
 * @param environmentName - The environment (e.g., "production", "staging")
 * @param config - The configuration payload (arbitrary JSON)
 * @returns The created configuration version with metadata
 * @throws {ValidationError} If configuration fails schema validation
 */
export async function deployConfiguration(
  platformName: string,
  environmentName: string,
  config: Record<string, unknown>
): Promise<ConfigVersion> {
  // Implementation
}
```

**Focus on WHY, not WHAT:**
- TypeScript types document WHAT the code does
- Comments explain WHY decisions were made
- Document business logic and non-obvious patterns

**README Updates:**
- Keep setup instructions current
- Document all environment variables in `.env.example`
- Include deployment procedures for each platform
- Document monorepo workspace structure

**Environment Variables:**
- ✅ **`.env.example` files exist** in both monorepos:
  - `togglebox/apps/api/.env.example` (open source)
  - `togglebox-cloud/apps/cloud-api/.env.example` (cloud)
  - `togglebox-cloud/.env.local.example` (Docker development)
- Document purpose and default values when adding new variables
- Never commit `.env` to version control
- Group related variables with comments

**Required Environment Variables (based on deployment platform):**

```bash
# togglebox/ (Open Source) - Example from apps/api/.env.example:

# Server Configuration
PORT=3000
NODE_ENV=development

# Database Selection (choose one)
DB_TYPE=sqlite  # Options: mysql, postgresql, sqlite, mongodb, dynamodb, d1

# AWS Configuration (for Lambda/DynamoDB deployment)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
DYNAMODB_TABLE=configurations
DYNAMODB_ENDPOINT=http://localhost:8000  # For local testing

# CloudFront Configuration (for caching)
CLOUDFRONT_DISTRIBUTION_ID=your-distribution-id

# Authentication (optional in open source - from @togglebox/auth package)
JWT_SECRET=your-jwt-secret-key-32-chars-minimum
JWT_EXPIRES_IN=24h
API_KEY_SECRET=your-api-key-secret-32-chars-minimum
ENABLE_AUTHENTICATION=false

# Cache Configuration (@togglebox/cache package)
CACHE_ENABLED=true
CACHE_PROVIDER=cloudfront  # Options: cloudfront, cloudflare, none
CACHE_TTL=3600
CACHE_MAX_AGE=86400

# Logging Configuration
LOG_LEVEL=info
GRAFANA_CLOUD_API_KEY=your-grafana-api-key
GRAFANA_CLOUD_URL=https://logs-prod-us-central1.grafana.net

# CORS Configuration
CORS_ORIGIN=*

# See serverless.yml and wrangler.toml for platform-specific variables
```

**togglebox-cloud/ (Private Cloud) - Additional Variables:**

```bash
# Multi-Tenancy (mandatory in cloud)
DOMAIN_NAME=togglebox.dev

# Billing (Stripe integration)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (Resend for notifications)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@togglebox.dev

# Authentication (mandatory in cloud - no ENABLE_AUTHENTICATION flag)
JWT_SECRET=your-jwt-secret-key-32-chars-minimum
API_KEY_SECRET=your-api-key-secret-32-chars-minimum

# See .env.local.example for Docker development environment variables
```

## Security Standards

**Environment Variables:**
- Never commit `.env` files
- Always update `.env.example` (with dummy values)
- Document each variable's purpose

**Code Review for Security:**
- Authentication/authorization changes require security-focused review
- Payment-related code requires lead developer review
- SQL queries reviewed for injection vulnerabilities
- File uploads reviewed for security implications
- Rate limiting implemented on public endpoints

**Secrets Management:**
- Development: `.env` file
- Production: AWS Secrets Manager, Azure Key Vault, or similar
- Rotate API keys quarterly
- Use different keys per environment

**Input Validation:**
- Validate ALL user input with Joi or Zod
- Sanitize user input before database queries
- Use parameterized queries (Sequelize does this automatically)
- Implement rate limiting on all endpoints

**Dependencies:**
- Run `npm audit` regularly
- Update dependencies monthly
- Review security advisories
- Pin exact versions in production

## Performance Standards

**Query Optimization:**
- Eager load relationships: `User.findAll({ include: ['posts', 'profile'] })`
- Use `attributes` to limit columns returned
- Use `limit` and `offset` for pagination
- Never query inside loops (N+1 problem)

**N+1 Detection Example:**
```javascript
// Bad: N+1 query problem
const users = await User.findAll();
for (const user of users) {
  user.posts = await user.getPosts(); // N+1!
}

// Good: Eager loading
const users = await User.findAll({
  include: ['posts']
});
```

**Caching Requirements:**
- Cache queries taking >100ms
- Document cache keys and TTL
- Invalidate cache before updates
- Use descriptive cache key prefixes: `cache:users:${id}`

**Async Operations:**
- Always use async/await for I/O operations
- Never use blocking operations (sync file reads, etc.)
- Queue long-running operations (>2 seconds)
- Use streaming for large data transfers

## Deployment Standards

**Deployment Targets:**

**togglebox/ (Open Source):**
- AWS Lambda (serverless deploy)
- Cloudflare Workers (wrangler deploy)
- Netlify Functions (netlify deploy)
- Docker/Self-hosted (docker-compose up)

**togglebox-cloud/ (Private Cloud):**
- AWS Lambda + CloudFront + DynamoDB (CloudFormation + serverless)
- Docker development (make up)

**Pre-Deployment Checklist:**
- [ ] All tests passing locally
- [ ] All tests passing in CI/CD (when configured)
- [ ] Code reviewed and approved (when git initialized)
- [ ] Database migrations tested on staging (if applicable)
- [ ] Environment variables documented in .env.example
- [ ] Rollback plan documented
- [ ] Dependencies audited for vulnerabilities

**Deployment Process (varies by platform):**

**AWS Lambda Deployment:**
```bash
# Navigate to app directory
cd togglebox/apps/api  # or togglebox-cloud/apps/cloud-api

# Build and deploy
pnpm build
serverless deploy --stage production
```

**Cloudflare Workers Deployment:**
```bash
# Navigate to app directory
cd togglebox/apps/api

# Deploy
pnpm build
wrangler deploy
```

**Docker Deployment (togglebox-cloud/):**
```bash
# Navigate to cloud monorepo
cd /Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud

# Deploy with Docker
make build
make up
```

**Post-Deployment:**
- Monitor error rates in logs
- Check queue processing
- Verify cache is working
- Test critical user flows
- Check application health endpoint
- Announce deployment in team channel

**Health Checks:**
```javascript
// /health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /ready endpoint (checks dependencies)
app.get('/ready', async (req, res) => {
  try {
    await sequelize.authenticate();
    await redis.ping();
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready' });
  }
});
```

**Rollback Procedure:**
```bash
# Revert to previous deployment
pm2 delete all
git checkout <previous-commit>
npm ci --production
npm run migrate:rollback  # If needed
pm2 start ecosystem.config.js
```

## Logging Standards

**Log Levels:**
- `trace` - Very detailed debugging (not in production)
- `debug` - Debugging information
- `info` - General informational messages
- `warn` - Warning messages (non-critical issues)
- `error` - Error messages (caught errors)
- `fatal` - Fatal errors (application crash)

**What to Log:**
- All errors with stack traces
- Authentication attempts (success/failure)
- Authorization failures
- External API calls (with timing)
- Queue job start/completion/failure
- Database query errors

**What NOT to Log:**
- Passwords or secrets
- Credit card numbers
- JWT tokens
- Personal identification numbers
- Full request/response bodies (unless debugging)

**Structured Logging:**
```javascript
logger.info({ userId, action: 'user_created' }, 'User created successfully');
logger.error({ err, userId, context: { orderId } }, 'Failed to process payment');
```

**Correlation IDs:**
- Add unique request ID to every request
- Include request ID in all logs for that request
- Return request ID in error responses for support

```javascript
// Middleware
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  req.log = logger.child({ requestId: req.id });
  next();
});
```

---

**Last Updated:** 2026-01-26

**Note:** These conventions apply to **BOTH monorepos**:
- **togglebox/** (open source) - Located at `/Users/ciprian/work/_______OGG_______/togglebox/togglebox`
- **togglebox-cloud/** (private cloud) - Located at `/Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

**Current Implementation Status:**
- ✅ pnpm workspaces (configured in both)
- ✅ TypeScript with strict mode (configured in both)
- ✅ ESLint + Prettier (configured in both)
- ✅ .env.example files (exist in both)
- ✅ Git repository (initialized in togglebox/)
- ✅ CI/CD (GitHub Actions configured in togglebox/)
