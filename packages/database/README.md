# @togglebox/database

Multi-database abstraction layer for ToggleBox. Supports MySQL, MongoDB, SQLite, DynamoDB, and Cloudflare D1.

## Features

- 🔄 **Multi-Database Support** - MySQL, MongoDB, SQLite, DynamoDB, Cloudflare D1
- 🏗️ **Repository Pattern** - Clean abstraction over database operations
- 🏭 **Factory Pattern** - Runtime database selection via environment variables
- ⚡ **TypeScript** - Full type safety across all adapters
- 🎯 **Single Table Design** - Optimized DynamoDB implementation
- 🚩 **Feature Flags** - 2-value model with country/language targeting
- 🧪 **Experiments** - Multi-variant A/B testing support
- 📊 **Usage Tracking** - API usage statistics

## Supported Databases

| Database          | Status              | Adapter  | Use Case                   |
| ----------------- | ------------------- | -------- | -------------------------- |
| **DynamoDB**      | ✅ Production Ready | Custom   | AWS serverless deployments |
| **MySQL**         | ✅ Ready            | Prisma   | Traditional SQL databases  |
| **SQLite**        | ✅ Ready            | Prisma   | Local development, testing |
| **MongoDB**       | ✅ Ready            | Mongoose | Document-oriented storage  |
| **Cloudflare D1** | ✅ Ready            | D1       | Edge deployments           |

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Environment Variables

Choose your database by setting `DB_TYPE`:

**DynamoDB (Default)**

```bash
export DB_TYPE=dynamodb
export DYNAMODB_TABLE=configurations
export AWS_REGION=us-east-1
```

**MySQL**

```bash
export DB_TYPE=mysql
export MYSQL_URL="mysql://user:password@localhost:3306/config_db"
```

**SQLite**

```bash
export DB_TYPE=sqlite
export SQLITE_FILE="./data/config.db"
```

**MongoDB**

```bash
export DB_TYPE=mongodb
export MONGO_URL="mongodb://user:password@localhost:27017/config_db"
```

### 3. Generate Prisma Client (for MySQL, SQLite, MongoDB)

```bash
# Update schema provider
cd packages/database
# Edit prisma/schema.prisma and set provider to: mysql, sqlite, or mongodb

# Set DATABASE_URL
export DATABASE_URL="your-connection-string"

# Generate client
pnpm prisma:generate

# Run migrations (SQL databases only)
pnpm prisma:migrate
```

## Usage

### Using the Factory Pattern (Recommended)

```typescript
import { getDatabase } from "@togglebox/database";

// Get database instance (singleton)
const db = getDatabase();

// Use repositories
const platform = await db.platform.createPlatform({
  name: "web",
  description: "Web application",
  createdAt: new Date().toISOString(),
});

// Feature flags (2-value model)
const flags = await db.flag.listActive("web", "production");
const flag = await db.flag.getActive("web", "production", "dark-mode");

// Experiments
const experiments = await db.experiment.listActive("web", "production");
```

### Using Legacy Exports (Backward Compatible)

```typescript
import * as platformService from "@togglebox/database";

const platform = await platformService.createPlatform({
  name: "web",
  description: "Web application",
  createdAt: new Date().toISOString(),
});
```

## Repository Interfaces

### IPlatformRepository

```typescript
interface IPlatformRepository {
  createPlatform(platform: Omit<Platform, "id">): Promise<Platform>;
  getPlatform(name: string): Promise<Platform | null>;
  listPlatforms(): Promise<Platform[]>;
}
```

### IEnvironmentRepository

```typescript
interface IEnvironmentRepository {
  createEnvironment(
    environment: Omit<Environment, "createdAt">,
  ): Promise<Environment>;
  getEnvironment(
    platform: string,
    environment: string,
  ): Promise<Environment | null>;
  listEnvironments(platform: string): Promise<Environment[]>;
}
```

### IConfigRepository

```typescript
interface IConfigRepository {
  createVersion(
    version: Omit<Version, "versionTimestamp" | "createdAt">,
  ): Promise<Version>;
  getVersion(
    platform: string,
    environment: string,
    versionLabel: string,
  ): Promise<Version | null>;
  getLatestStableVersion(
    platform: string,
    environment: string,
  ): Promise<Version | null>;
  listVersions(
    platform: string,
    environment: string,
    pagination?: PaginationParams,
  ): Promise<PaginatedResult<Version>>;
  deleteVersion(
    platform: string,
    environment: string,
    versionLabel: string,
  ): Promise<boolean>;
  markVersionStable(
    platform: string,
    environment: string,
    versionLabel: string,
  ): Promise<Version | null>;
}
```

> **Note:** All version lookups use `versionLabel` (semantic version like "1.0.0"), NOT `versionTimestamp`.

### IFlagRepository

The flag repository implements the 2-value model (A/B) with versioning and targeting.

```typescript
interface IFlagRepository {
  create(data: CreateFlag): Promise<Flag>;
  update(
    platform: string,
    environment: string,
    flagKey: string,
    data: UpdateFlag,
  ): Promise<Flag>;
  toggle(platform: string, environment: string, flagKey: string): Promise<Flag>;
  getActive(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag | null>;
  getVersion(
    platform: string,
    environment: string,
    flagKey: string,
    version: string,
  ): Promise<Flag | null>;
  listActive(platform: string, environment: string): Promise<FlagPage>;
  listVersions(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag[]>;
  delete(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<boolean>;
}
```

> **Note:** Flag types are imported from `@togglebox/flags` package.

## Environment Variables Reference

### Required

| Variable  | Description   | Example                                  |
| --------- | ------------- | ---------------------------------------- |
| `DB_TYPE` | Database type | `dynamodb`, `mysql`, `sqlite`, `mongodb` |

### DynamoDB

| Variable            | Description    | Required |
| ------------------- | -------------- | -------- |
| `DYNAMODB_TABLE`    | Table name     | Yes      |
| `AWS_REGION`        | AWS region     | Yes      |
| `DYNAMODB_ENDPOINT` | Local endpoint | No       |

### MySQL

| Variable    | Description    | Required |
| ----------- | -------------- | -------- |
| `MYSQL_URL` | Connection URL | Yes      |

### MongoDB

| Variable    | Description    | Required |
| ----------- | -------------- | -------- |
| `MONGO_URL` | Connection URL | Yes      |

### SQLite

| Variable      | Description        | Required | Default            |
| ------------- | ------------------ | -------- | ------------------ |
| `SQLITE_FILE` | Database file path | No       | `./data/config.db` |

## Prisma Setup

### 1. Configure Schema Provider

Edit `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "sqlite"  // Change to: mysql, sqlite, or mongodb
  url      = env("DATABASE_URL")
}
```

### 2. Set DATABASE_URL

```bash
# SQLite
export DATABASE_URL="file:./dev.db"

# MySQL
export DATABASE_URL="mysql://user:pass@localhost:3306/db"

# MongoDB
export DATABASE_URL="mongodb://user:pass@localhost:27017/db"
```

### 3. Generate Client

```bash
pnpm prisma:generate
```

### 4. Run Migrations (SQL only)

```bash
pnpm prisma:migrate
```

## Architecture

```
packages/database/
├── src/
│   ├── interfaces/          # Repository interfaces
│   │   ├── IPlatformRepository.ts
│   │   ├── IEnvironmentRepository.ts
│   │   ├── IConfigRepository.ts
│   │   ├── IUsageRepository.ts
│   │   └── IPagination.ts
│   ├── adapters/
│   │   ├── prisma/          # Prisma adapter (MySQL, PostgreSQL, SQLite)
│   │   │   ├── PrismaPlatformRepository.ts
│   │   │   ├── PrismaEnvironmentRepository.ts
│   │   │   ├── PrismaConfigRepository.ts
│   │   │   ├── PrismaFlagRepository.ts
│   │   │   └── PrismaExperimentRepository.ts
│   │   ├── dynamodb/        # DynamoDB adapter
│   │   │   ├── DynamoDBPlatformRepository.ts
│   │   │   ├── DynamoDBEnvironmentRepository.ts
│   │   │   ├── DynamoDBConfigRepository.ts
│   │   │   ├── DynamoDBNewFlagRepository.ts
│   │   │   └── DynamoDBExperimentRepository.ts
│   │   ├── mongoose/        # MongoDB adapter
│   │   │   ├── MongoosePlatformRepository.ts
│   │   │   ├── MongooseConfigRepository.ts
│   │   │   ├── MongooseFlagRepository.ts
│   │   │   └── MongooseExperimentRepository.ts
│   │   └── d1/              # Cloudflare D1 adapter
│   │       ├── D1PlatformRepository.ts
│   │       ├── D1ConfigRepository.ts
│   │       ├── D1FlagRepository.ts
│   │       └── D1ExperimentRepository.ts
│   ├── config.ts            # Database configuration
│   ├── factory.ts           # Database factory pattern
│   └── [legacy services]    # Existing DynamoDB services (backward compatible)
└── prisma/
    ├── schema.prisma        # Prisma schema
    └── .env.example         # Example configuration
```

> **Note:** Flag and Experiment repository interfaces are defined in their respective domain packages (`@togglebox/flags` and `@togglebox/experiments`).

## Migration Guide

### From Legacy DynamoDB to Factory Pattern

**Before:**

```typescript
import * as platformService from '@togglebox/database';
const platform = await platformService.createPlatform({ ... });
```

**After:**

```typescript
import { getDatabase } from '@togglebox/database';
const db = getDatabase();
const platform = await db.platform.createPlatform({ ... });
```

### Switching Databases

1. Set `DB_TYPE` environment variable
2. Set database-specific environment variables
3. For Prisma databases: Run `prisma generate`
4. Restart application

**No code changes required!**

## Testing

Run validation tests:

```bash
pnpm tsc src/validation-test.ts --outDir dist --skipLibCheck
node dist/validation-test.js
```

## Troubleshooting

### Error: "DB_TYPE environment variable is required"

**Solution:** Set the `DB_TYPE` environment variable:

```bash
export DB_TYPE=dynamodb  # or mysql, sqlite, mongodb
```

### Error: "@prisma/client did not initialize yet"

**Solution:** Generate Prisma Client:

```bash
cd packages/database
DATABASE_URL="your-connection-string" pnpm prisma:generate
```

### Error: "Cannot find module '@prisma/client'"

**Solution:** Install dependencies:

```bash
pnpm install
```

## Performance Notes

### DynamoDB

- Uses single-table design for optimal performance
- Leverages GSI for list operations
- Optimized for serverless environments

### Prisma (MySQL/SQLite/MongoDB)

- Uses proper indexes for fast queries
- Connection pooling supported
- Optimized queries for list operations

## License

**Elastic License 2.0** - You can use, modify, and distribute this software for any purpose **except** providing it as a hosted/managed service to third parties.

See the main [LICENSE](../../LICENSE) file for full details.

## Support

For issues or questions:

- Refer to documentation in `.claude/claude-md-refs/`
- Check deployment configuration files
- Review INDEXES.md for performance optimization
