# @config/database

Multi-database abstraction layer for remote config service. Supports MySQL, MongoDB, SQLite, and DynamoDB.

## Features

- 🔄 **Multi-Database Support** - MySQL, MongoDB, SQLite, DynamoDB
- 🏗️ **Repository Pattern** - Clean abstraction over database operations
- 🏭 **Factory Pattern** - Runtime database selection via environment variables
- ⚡ **TypeScript** - Full type safety across all adapters
- 🔙 **Backward Compatible** - Legacy DynamoDB exports preserved
- 🎯 **Single Table Design** - Optimized DynamoDB implementation

## Supported Databases

| Database | Status | Adapter | Use Case |
|----------|--------|---------|----------|
| **DynamoDB** | ✅ Production Ready | Custom | AWS serverless deployments |
| **MySQL** | ✅ Ready | Prisma | Traditional SQL databases |
| **SQLite** | ✅ Ready | Prisma | Local development, testing |
| **MongoDB** | ✅ Ready | Prisma | Document-oriented storage |

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
import { getDatabase } from '@config/database';

// Get database instance (singleton)
const db = getDatabase();

// Use repositories
const platform = await db.platform.createPlatform({
  name: 'web',
  description: 'Web application',
  createdAt: new Date().toISOString(),
});

const flags = await db.featureFlag.listFeatureFlags('web', 'production');
```

### Using Legacy Exports (Backward Compatible)

```typescript
import * as platformService from '@config/database';

const platform = await platformService.createPlatform({
  name: 'web',
  description: 'Web application',
  createdAt: new Date().toISOString(),
});
```

## Repository Interfaces

### IPlatformRepository

```typescript
interface IPlatformRepository {
  createPlatform(platform: Omit<Platform, 'id'>): Promise<Platform>;
  getPlatform(name: string): Promise<Platform | null>;
  listPlatforms(): Promise<Platform[]>;
}
```

### IEnvironmentRepository

```typescript
interface IEnvironmentRepository {
  createEnvironment(environment: Omit<Environment, 'createdAt'>): Promise<Environment>;
  getEnvironment(platform: string, environment: string): Promise<Environment | null>;
  listEnvironments(platform: string): Promise<Environment[]>;
}
```

### IConfigRepository

```typescript
interface IConfigRepository {
  createVersion(version: Omit<Version, 'versionTimestamp' | 'createdAt'>): Promise<Version>;
  getVersion(platform: string, environment: string, versionTimestamp: string): Promise<Version | null>;
  getLatestStableVersion(platform: string, environment: string): Promise<Version | null>;
  listVersions(platform: string, environment: string): Promise<Version[]>;
  deleteVersion(platform: string, environment: string, versionTimestamp: string): Promise<boolean>;
}
```

### IFeatureFlagRepository

```typescript
interface IFeatureFlagRepository {
  createFeatureFlag(featureFlag: Omit<FeatureFlag, 'createdAt' | 'updatedAt'>): Promise<FeatureFlag>;
  getFeatureFlag(platform: string, environment: string, flagName: string): Promise<FeatureFlag | null>;
  listFeatureFlags(platform: string, environment: string): Promise<FeatureFlag[]>;
  updateFeatureFlag(platform: string, environment: string, flagName: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag | null>;
  deleteFeatureFlag(platform: string, environment: string, flagName: string): Promise<boolean>;
}
```

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_TYPE` | Database type | `dynamodb`, `mysql`, `sqlite`, `mongodb` |

### DynamoDB

| Variable | Description | Required |
|----------|-------------|----------|
| `DYNAMODB_TABLE` | Table name | Yes |
| `AWS_REGION` | AWS region | Yes |
| `DYNAMODB_ENDPOINT` | Local endpoint | No |

### MySQL

| Variable | Description | Required |
|----------|-------------|----------|
| `MYSQL_URL` | Connection URL | Yes |

### MongoDB

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URL` | Connection URL | Yes |

### SQLite

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SQLITE_FILE` | Database file path | No | `./data/config.db` |

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
│   │   └── IFeatureFlagRepository.ts
│   ├── adapters/
│   │   ├── prisma/          # Prisma adapter (MySQL, SQLite, MongoDB)
│   │   │   ├── PrismaPlatformRepository.ts
│   │   │   ├── PrismaEnvironmentRepository.ts
│   │   │   ├── PrismaConfigRepository.ts
│   │   │   └── PrismaFeatureFlagRepository.ts
│   │   └── dynamodb/        # DynamoDB adapter
│   │       ├── DynamoDBPlatformRepository.ts
│   │       ├── DynamoDBEnvironmentRepository.ts
│   │       ├── DynamoDBConfigRepository.ts
│   │       └── DynamoDBFeatureFlagRepository.ts
│   ├── config.ts            # Database configuration
│   ├── factory.ts           # Database factory pattern
│   └── [legacy services]    # Existing DynamoDB services (backward compatible)
└── prisma/
    ├── schema.prisma        # Prisma schema
    └── .env.example         # Example configuration
```

## Migration Guide

### From Legacy DynamoDB to Factory Pattern

**Before:**
```typescript
import * as platformService from '@config/database';
const platform = await platformService.createPlatform({ ... });
```

**After:**
```typescript
import { getDatabase } from '@config/database';
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
