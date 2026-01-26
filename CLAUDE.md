# ToggleBox Project Guide

Comprehensive guide for the ToggleBox dual monorepo project - a remote configuration and feature flag platform.

## About This Project

**ToggleBox** is a remote configuration and feature flag service with:
- **Open Source Core** (`togglebox/`) - Self-hostable, multi-platform deployment
- **Cloud Version** (`togglebox-cloud/`) - Commercial SaaS with multi-tenancy and billing

## Project Documentation

Additional project-specific guidance is available in:

- **@.claude/claude-md-refs/project-commands.md** - Project commands and deployment workflows
- **@.claude/claude-md-refs/architecture.md** - Architecture decisions and patterns
- **@.claude/claude-md-refs/conventions.md** - Team conventions and standards

---

## Dual Monorepo Architecture

**CRITICAL: This workspace contains TWO separate monorepos at the parent directory level:**

```
/Users/ciprian/work/_______OGG_______/togglebox/   ← Parent directory (CLAUDE.md lives here)
├── CLAUDE.md                  ← This file
├── .claude/                   ← Claude Code configuration
├── togglebox/                 ← OPEN SOURCE monorepo
└── togglebox-cloud/           ← PRIVATE CLOUD monorepo
```

### togglebox/ (Open Source)

**Purpose:** Self-hostable remote config API with optional authentication. Deploy anywhere.

**Location:** `/Users/ciprian/work/_______OGG_______/togglebox/togglebox`

**Structure:**
```
togglebox/
├── apps/
│   ├── api/                   # Express.js API (multi-platform: Lambda, Workers, Docker)
│   ├── admin/                 # Admin dashboard (Next.js 15)
│   ├── example-nextjs/        # Example Next.js app using SDK
│   └── example-expo/          # Example Expo/React Native app using SDK
├── packages/
│   ├── core/                  # Core business logic, types, and hashing utilities
│   ├── database/              # Multi-database abstraction (DynamoDB, Prisma, Mongoose, D1)
│   ├── cache/                 # Multi-provider cache (CloudFront, Cloudflare, NoOp)
│   ├── auth/                  # OPTIONAL authentication (JWT, bcrypt, nodemailer)
│   ├── shared/                # Shared utilities, types, middleware
│   ├── flags/                 # Feature flag business logic
│   ├── experiments/           # A/B experiments business logic
│   ├── configs/               # Remote configuration business logic
│   ├── stats/                 # Analytics and statistics
│   ├── ui/                    # Shared UI components (shadcn/ui)
│   ├── sdk-js/                # JavaScript SDK for browsers/Node.js (@togglebox/sdk)
│   ├── sdk-nextjs/            # Next.js SDK with React hooks (@togglebox/sdk-nextjs)
│   ├── sdk-expo/              # Expo/React Native SDK (@togglebox/sdk-expo)
│   ├── sdk-php/               # PHP SDK (Composer package)
│   └── sdk-laravel/           # Laravel SDK (Composer package)
├── .github/                   # GitHub Actions CI/CD workflows
│   ├── workflows/ci.yml       # Lint, TypeCheck, Test, Security Audit
│   ├── workflows/deploy-aws-lambda.yml
│   └── workflows/deploy-cloudflare-workers.yml
└── docker/                    # Docker development environment
```

**Key Characteristics:**
- Authentication is **OPTIONAL** (disabled by default)
- Supports multiple databases: DynamoDB, MySQL, PostgreSQL, SQLite, MongoDB
- Deploys to: AWS Lambda, Cloudflare Workers, Netlify, Docker
- No tenant concept - single-tenant or network-isolated

### togglebox-cloud/ (Private Cloud)

**Purpose:** Commercial SaaS version with multi-tenancy, billing, and usage tracking.

**Location:** `/Users/ciprian/work/_______OGG_______/togglebox/togglebox-cloud`

**Structure:**
```
togglebox-cloud/
├── apps/
│   ├── cloud-api/             # Cloud API (Express.js with multi-tenancy)
│   ├── cloud-app/             # Cloud dashboard (Next.js 15)
│   └── web/                   # Marketing site (Next.js 15)
├── packages/
│   ├── billing/               # Stripe billing integration
│   └── multitenancy/          # Tenant isolation, subdomain routing
├── docker/                    # Docker development environment
│   ├── certs/                 # SSL certificates for *.togglebox.local
│   └── generate-certs.sh      # Certificate generation script
├── scripts/                   # Utility scripts
├── docker-compose.yml         # Full development stack
├── Makefile                   # Docker orchestration commands
└── LOCAL_DEVELOPMENT.md       # Complete Docker setup guide
```

**Key Characteristics:**
- Authentication is **MANDATORY**
- Multi-tenant with subdomain-based API routing
- Stripe billing with usage-based pricing
- Uses packages from `togglebox/` via npm or local links

---

## Multi-Tenancy Architecture (Cloud)

**CRITICAL ARCHITECTURE DECISION:**

### Frontend: Always `app.togglebox.local`

The frontend (cloud-app) is **ALWAYS** served from `app.togglebox.local` - there are NO tenant subdomains for the frontend.

- Users access: `https://app.togglebox.local/dashboard`
- Tenant context stored in `tenant-subdomain` cookie after onboarding
- Frontend reads tenant from cookie, NOT from URL

### API: Tenant subdomains `{tenant}.togglebox.local`

The API uses tenant subdomains for routing:

- Auth/Onboarding (no tenant): `https://api.togglebox.local/api/v1/auth/*`
- Tenant-specific calls: `https://{tenant}.togglebox.local/api/v1/*`

### Flow Summary

```
1. User visits:        https://app.togglebox.local/register
2. User registers:     API call to https://api.togglebox.local/api/v1/auth/register
3. User onboards:      API call to https://api.togglebox.local/api/v1/onboarding/signup
4. Cookie set:         tenant-subdomain=acme
5. Dashboard loads:    https://app.togglebox.local/dashboard (same domain!)
6. API calls go to:    https://acme.togglebox.local/api/v1/platforms
```

---

## Standard Commands

**Note:** Both monorepos use **pnpm workspaces** with TypeScript.

### togglebox/ (Open Source)

```bash
cd togglebox

pnpm install              # Install all workspace dependencies
pnpm dev:api              # Start API development server (tsx watch)
pnpm dev:admin            # Start admin dashboard (Next.js)
pnpm dev:example-nextjs   # Start example Next.js app
pnpm dev:example-expo     # Start example Expo app
pnpm build                # Build all packages + apps
pnpm build:packages       # Build only workspace packages
pnpm build:api            # Build only API
pnpm build:admin          # Build only admin dashboard
pnpm test                 # Run tests across all packages
pnpm lint                 # Run ESLint across all packages
pnpm lint:fix             # Fix ESLint issues
pnpm format               # Run Prettier
pnpm clean                # Clean dist and node_modules
```

### togglebox-cloud/ (Private Cloud)

```bash
cd togglebox-cloud

pnpm install         # Install all workspace dependencies
pnpm dev:cloud-api   # Start cloud API (tsx watch)
pnpm dev:cloud-app   # Start cloud dashboard (Next.js)
pnpm dev:web         # Start marketing site (Next.js)
pnpm build           # Build all packages + apps
pnpm link-local      # Link to local togglebox/ packages
pnpm unlink-local    # Restore npm packages
pnpm test            # Run tests
pnpm lint            # Run ESLint
```

### Docker Development (togglebox-cloud)

```bash
cd togglebox-cloud

make up              # Start all services (Traefik, DynamoDB, apps)
make down            # Stop all services
make logs            # Tail all logs
make logs-api        # Cloud API logs only
make logs-app        # Cloud App logs only
make certs           # Generate SSL certificates
make certs-trust     # Trust certificate (macOS, requires sudo)
make status          # Show service status and access points
```

**Docker Access Points:**
- Frontend Dashboard: `https://app.togglebox.local`
- Marketing Site: `https://togglebox.local`
- Auth API: `https://api.togglebox.local`
- Tenant APIs: `https://{tenant}.togglebox.local`
- DynamoDB Admin: `https://dynamodb-admin.togglebox.local`
- Traefik Dashboard: `http://traefik.togglebox.local:8080`

---

## Code Style

### TypeScript Standards
- Use ES6+ features (async/await, destructuring, arrow functions)
- Use 2-space indentation
- Use semicolons consistently
- Use const by default, let when reassignment needed, never var
- Use template literals for string interpolation
- Use async/await over promises/callbacks
- Strict mode enabled (`strict: true` in tsconfig.json)

### Naming Conventions
- Files: kebab-case (`user-service.ts`, `auth-middleware.ts`)
- Classes: PascalCase (`UserService`, `AuthMiddleware`)
- Functions/variables: camelCase (`getUserById`, `isAuthenticated`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`, `API_VERSION`)
- Routes: kebab-case (`/api/v1/user-profiles`)

### Package Names
- Core: `@togglebox/core`, `@togglebox/configs`, `@togglebox/flags`, `@togglebox/experiments`, `@togglebox/stats`
- Infrastructure: `@togglebox/database`, `@togglebox/cache`, `@togglebox/auth`, `@togglebox/shared`, `@togglebox/ui`
- JavaScript SDKs: `@togglebox/sdk`, `@togglebox/sdk-nextjs`, `@togglebox/sdk-expo`
- PHP SDKs: `togglebox/sdk-php` (Composer), `togglebox/sdk-laravel` (Composer)
- Cloud: `@togglebox/billing`, `@togglebox/multitenancy`

### Naming Conventions
- Files: kebab-case (e.g., `user-service.js`, `auth-middleware.js`)
- Classes: PascalCase (e.g., `UserService`, `AuthMiddleware`)
- Functions/variables: camelCase (e.g., `getUserById`, `isAuthenticated`)
- Constants: UPPER_SNAKE_CASE (e.g., `MAX_RETRY_ATTEMPTS`, `API_VERSION`)
- Routes: kebab-case (e.g., `/api/v1/user-profiles`)

## Application Architecture

### Route Handler Pattern
Keep route handlers thin - they should only handle HTTP concerns:

```javascript
// routes/users.js
router.post('/', validateUser, async (req, res, next) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ data: user });
  } catch (error) {
    next(error);
  }
});
```

### Service Layer Pattern
All business logic lives in service classes:

```javascript
// services/user-service.js
class UserService {
  constructor(userRepository, emailService, logger) {
    this.userRepository = userRepository;
    this.emailService = emailService;
    this.logger = logger;
  }

  async createUser(userData) {
    // Validation
    // Business logic
    // Data persistence
    // Side effects (emails, etc.)
    return user;
  }
}
```

### Repository Pattern (Optional)
For complex data access logic:

```javascript
// repositories/user-repository.js
class UserRepository {
  async findById(id) {
    return await User.findByPk(id, {
      include: ['profile', 'roles']
    });
  }

  async findByEmail(email) {
    return await User.findOne({ where: { email } });
  }
}
```

## Middleware Architecture

### Middleware Order
```javascript
// Correct middleware order
app.use(helmet());                    // Security headers first
app.use(cors(corsOptions));           // CORS
app.use(compression());               // Compression
app.use(express.json());              // Body parsing
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);               // Logging
app.use(rateLimiter);                 // Rate limiting
app.use('/api', routes);              // Routes
app.use(errorHandler);                // Error handling last
```

### Custom Middleware Pattern
```javascript
// middleware/auth.js
const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
};
```

## Async Error Handling

### Async Wrapper
Always wrap async route handlers:

```javascript
// utils/async-handler.js
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
router.get('/', asyncHandler(async (req, res) => {
  const users = await userService.getAllUsers();
  res.json({ data: users });
}));
```

### Custom Error Classes
```javascript
// utils/errors.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 422);
  }
}
```

### Centralized Error Handler
```javascript
// middleware/error-handler.js
const errorHandler = (err, req, res, next) => {
  logger.error({
    err,
    req: { method: req.method, url: req.url }
  });

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  res.status(statusCode).json({
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
};
```

## Validation

### Input Validation with Zod
**This project uses Zod for runtime type validation:**

```typescript
// validators/config-validator.ts
import { z } from 'zod';

const createConfigSchema = z.object({
  platformName: z.string().min(1).max(100),
  environmentName: z.string().min(1).max(50),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  config: z.record(z.unknown()), // Arbitrary JSON
  isStable: z.boolean().optional(),
});

// Middleware usage
const validateConfig = (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createConfigSchema.parse(req.body);
    req.body = validated;
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(422).json({
        error: {
          message: 'Validation failed',
          details: error.errors,
        },
      });
    }
    next(error);
  }
};
```

### Type-Safe Validation
```typescript
// Zod provides automatic TypeScript types
type CreateConfigInput = z.infer<typeof createConfigSchema>;

// TypeScript knows the exact shape:
// {
//   platformName: string;
//   environmentName: string;
//   version: string;
//   config: Record<string, unknown>;
//   isStable?: boolean;
// }
```

## Logging with Pino

### Logger Setup
```javascript
// config/logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});

module.exports = logger;
```

### Request Logging Middleware
```javascript
// middleware/logger.js
const pinoHttp = require('pino-http');
const logger = require('../config/logger');

const requestLogger = pinoHttp({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  }
});
```

### Structured Logging
```javascript
// In service
logger.info({ userId: user.id, action: 'user_created' }, 'User created successfully');
logger.error({ err, userId }, 'Failed to create user');
```

## Database Best Practices

**This project uses multi-database support:**
- **DynamoDB** (AWS Lambda deployment)
- **Cloudflare D1** (Cloudflare Workers deployment)
- **MySQL** (Self-hosted or RDS)
- **MongoDB** (Self-hosted or Atlas)
- **SQLite** (Local development)

### Prisma ORM (for SQL databases)
```typescript
// packages/database - Prisma Client usage
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
});

// Generate schema based on DB_TYPE environment variable
// npm run schema:generate
// npm run prisma:migrate
```

### DynamoDB (AWS SDK)
```typescript
// For DynamoDB single-table design
import { DynamoDB } from 'aws-sdk';

const dynamodb = new DynamoDB.DocumentClient({
  region: process.env.AWS_REGION,
  endpoint: process.env.DYNAMODB_ENDPOINT,
});

// Single-table design with PK/SK pattern
await dynamodb.put({
  TableName: process.env.DYNAMODB_TABLE,
  Item: {
    PK: `PLATFORM#${platformName}`,
    SK: `ENV#${envName}#VERSION#${version}`,
    ...data,
  },
});
```

### Mongoose (for MongoDB)
```typescript
// For MongoDB document storage
import mongoose from 'mongoose';

await mongoose.connect(process.env.MONGODB_URI);
```

### Query Optimization
- Use Prisma's `select` for specific columns
- Use `include` for eager loading (prevent N+1)
- Add indexes in Prisma schema
- Use pagination for large result sets
- For DynamoDB: Design efficient PK/SK patterns to minimize scans

## API Development

### RESTful Route Design
```javascript
// Good REST structure
GET    /api/v1/users           # List users
GET    /api/v1/users/:id       # Get single user
POST   /api/v1/users           # Create user
PUT    /api/v1/users/:id       # Update user (full)
PATCH  /api/v1/users/:id       # Update user (partial)
DELETE /api/v1/users/:id       # Delete user
```

### Response Format
```javascript
// Success response
res.status(200).json({
  data: user,
  meta: {
    timestamp: new Date().toISOString()
  }
});

// List response with pagination
res.status(200).json({
  data: users,
  meta: {
    page: 1,
    perPage: 20,
    total: 100,
    totalPages: 5
  }
});

// Error response
res.status(422).json({
  error: {
    message: 'Validation failed',
    details: [
      { field: 'email', message: 'Email is required' }
    ]
  }
});
```

### HTTP Status Codes
- `200 OK` - Successful GET, PUT, PATCH
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Invalid request format
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Authenticated but not authorized
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Validation failed
- `500 Internal Server Error` - Server error

## Security Best Practices

### Helmet Security Headers
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### CORS Configuration
```javascript
const cors = require('cors');

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', limiter);
```

### Environment Variables
```javascript
// .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=your-secret-key
REDIS_URL=redis://localhost:6379
```

**Never commit .env files**

## Testing

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Integration Tests with Supertest
```javascript
// tests/integration/users.test.js
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/v1/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User'
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    expect(response.body.data.email).toBe('test@example.com');
  });

  it('should return 422 for invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({
        email: 'invalid-email',
        password: 'password123'
      });

    expect(response.status).toBe(422);
  });
});
```

### Unit Tests for Services
```javascript
// tests/unit/user-service.test.js
const UserService = require('../src/services/user-service');

describe('UserService', () => {
  let userService;
  let mockRepository;

  beforeEach(() => {
    mockRepository = {
      create: jest.fn(),
      findByEmail: jest.fn()
    };
    userService = new UserService(mockRepository);
  });

  it('should create a user', async () => {
    mockRepository.findByEmail.mockResolvedValue(null);
    mockRepository.create.mockResolvedValue({ id: 1, email: 'test@example.com' });

    const user = await userService.createUser({ email: 'test@example.com' });

    expect(user).toHaveProperty('id');
    expect(mockRepository.create).toHaveBeenCalled();
  });
});
```

## Production Deployment

**This project supports multiple deployment platforms:**

### AWS Lambda Deployment
```bash
# Deploy to AWS Lambda using Serverless Framework
cd apps/api
serverless deploy --stage production

# Environment: AWS Lambda
# Database: DynamoDB
# Security: Network isolation (API Gateway Resource Policy)
```

### Cloudflare Workers Deployment
```bash
# Deploy to Cloudflare Workers
cd apps/api
wrangler deploy

# Environment: Cloudflare Workers
# Database: Cloudflare D1 (SQLite at edge)
# Security: Application-level auth (JWT/API Keys required)
```

### Docker/Self-Hosted Deployment
```bash
# Build Docker image
docker build -t remote-config-api .

# Run with Docker Compose
docker-compose up -d

# Environment: Docker/ECS/Self-hosted
# Database: MySQL, MongoDB, or SQLite
# Security: Configurable (auth or network isolation)
```

### Health Checks
```typescript
// routes/health.ts
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

router.get('/ready', async (req, res) => {
  try {
    // Check database connection based on DB type
    // For DynamoDB, Prisma, or Mongoose
    res.status(200).json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

## Configuration Management

### Config-Driven Development
```javascript
// config/index.js
module.exports = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    url: process.env.DATABASE_URL,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100
  }
};
```

## Recommended Packages

**Packages used in this project:**
- `express` - Web framework
- `pino` / `pino-http` - Logging
- `zod` - Runtime validation (type-safe)
- `helmet` - Security headers
- `cors` - CORS middleware
- `express-rate-limit` - Rate limiting
- `compression` - Response compression
- `@prisma/client` / `prisma` - ORM for SQL databases
- `mongoose` - MongoDB ODM
- `aws-sdk` - AWS DynamoDB client
- `jest` / `ts-jest` - Testing framework
- `dotenv` - Environment variables
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution and watch mode
- `serverless-http` - AWS Lambda adapter

**Deployment Tools:**
- `wrangler` - Cloudflare Workers CLI
- `serverless` - AWS Lambda deployment

---

*Last updated: 2026-01-25*
*Framework: Express.js + TypeScript*
*Architecture: pnpm monorepo with multi-database and multi-platform deployment support*
