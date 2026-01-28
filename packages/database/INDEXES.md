# Database Indexes Documentation

Comprehensive documentation of all database indexes across all supported database types.

**Last Updated:** 2025-11-23

---

## Index Strategy

All databases are optimized for these common query patterns:

1. **Get by Platform + Environment** - Most frequent query
2. **Get Latest Stable Version** - Critical path for production reads
3. **List all flags for Environment** - Evaluation endpoints
4. **Foreign key lookups** - Referential integrity

---

## Prisma (MySQL, PostgreSQL, SQLite)

### Platforms Table

| Index Name | Columns | Type        | Purpose                      |
| ---------- | ------- | ----------- | ---------------------------- |
| PRIMARY    | `id`    | PRIMARY KEY | Unique identifier            |
| UNIQUE     | `name`  | UNIQUE      | Platform name must be unique |

### Environments Table

| Index Name | Columns                   | Type                  | Purpose                         |
| ---------- | ------------------------- | --------------------- | ------------------------------- |
| PRIMARY    | `[platform, environment]` | COMPOSITE PRIMARY KEY | Unique environment per platform |
| INDEX      | `platformId`              | FOREIGN KEY INDEX     | Fast lookups by platform        |

**Query Patterns:**

```sql
-- Get environment (uses PRIMARY KEY)
SELECT * FROM environments WHERE platform = 'web' AND environment = 'production';

-- List environments for platform (uses platformId INDEX)
SELECT * FROM environments WHERE platformId = 'uuid-123';
```

### ConfigVersions Table

| Index Name | Columns                                     | Type                  | Purpose                                 |
| ---------- | ------------------------------------------- | --------------------- | --------------------------------------- |
| PRIMARY    | `[platform, environment, versionTimestamp]` | COMPOSITE PRIMARY KEY | Unique version identifier               |
| INDEX      | `platformId`                                | FOREIGN KEY INDEX     | Fast lookups by platform                |
| INDEX      | `[platform, environment, isStable]`         | COMPOSITE INDEX       | **Critical for getLatestStableVersion** |

**Query Patterns:**

```sql
-- Get specific version (uses PRIMARY KEY)
SELECT * FROM config_versions
WHERE platform = 'web' AND environment = 'production' AND versionTimestamp = '2025-01-01T00:00:00Z';

-- Get latest stable version (uses COMPOSITE INDEX)
SELECT * FROM config_versions
WHERE platform = 'web' AND environment = 'production' AND isStable = 1
ORDER BY versionTimestamp DESC
LIMIT 1;

-- List versions (uses PRIMARY KEY prefix)
SELECT * FROM config_versions
WHERE platform = 'web' AND environment = 'production'
ORDER BY versionTimestamp DESC;
```

### FeatureFlags Table

| Index Name | Columns                             | Type                  | Purpose                           |
| ---------- | ----------------------------------- | --------------------- | --------------------------------- |
| PRIMARY    | `[platform, environment, flagName]` | COMPOSITE PRIMARY KEY | Unique flag identifier            |
| INDEX      | `platformId`                        | FOREIGN KEY INDEX     | Fast lookups by platform          |
| INDEX      | `[platform, environment]`           | COMPOSITE INDEX       | **Critical for listFeatureFlags** |

**Query Patterns:**

```sql
-- Get specific flag (uses PRIMARY KEY)
SELECT * FROM feature_flags
WHERE platform = 'web' AND environment = 'production' AND flagName = 'new-feature';

-- List all flags for environment (uses COMPOSITE INDEX)
SELECT * FROM feature_flags
WHERE platform = 'web' AND environment = 'production';
```

---

## Cloudflare D1 (SQLite at Edge)

D1 uses the same schema as Prisma SQLite with explicit index creation:

### Indexes

```sql
-- Platforms
CREATE INDEX idx_platforms_name ON platforms(name);

-- Environments
CREATE INDEX idx_environments_platformId ON environments(platformId);

-- ConfigVersions
CREATE INDEX idx_config_versions_platformId ON config_versions(platformId);
CREATE INDEX idx_config_versions_stable ON config_versions(platform, environment, isStable);

-- FeatureFlags
CREATE INDEX idx_feature_flags_platformId ON feature_flags(platformId);
CREATE INDEX idx_feature_flags_env ON feature_flags(platform, environment);
```

**Performance Notes:**

- D1 is SQLite-based and optimized for edge locations
- Indexes are smaller due to edge database size limits
- Query performance is excellent for small-to-medium datasets (<10K rows per table)

---

## Mongoose (MongoDB)

### Platform Collection

```javascript
PlatformSchema.index({ name: 1 }, { unique: true });
```

| Index     | Type   | Purpose              |
| --------- | ------ | -------------------- |
| `name: 1` | UNIQUE | Platform name lookup |

### Environment Collection

```javascript
EnvironmentSchema.index({ platformId: 1 });
EnvironmentSchema.index({ platform: 1, environment: 1 }, { unique: true });
```

| Index                             | Type            | Purpose                         |
| --------------------------------- | --------------- | ------------------------------- |
| `platformId: 1`                   | INDEX           | Foreign key lookup              |
| `{ platform: 1, environment: 1 }` | UNIQUE COMPOUND | Unique environment per platform |

### ConfigVersion Collection

```javascript
ConfigVersionSchema.index({ platformId: 1 });
ConfigVersionSchema.index(
  { platform: 1, environment: 1, versionTimestamp: 1 },
  { unique: true },
);
ConfigVersionSchema.index({ platform: 1, environment: 1, isStable: 1 });
```

| Index                                                  | Type            | Purpose                                 |
| ------------------------------------------------------ | --------------- | --------------------------------------- |
| `platformId: 1`                                        | INDEX           | Foreign key lookup                      |
| `{ platform: 1, environment: 1, versionTimestamp: 1 }` | UNIQUE COMPOUND | Unique version identifier               |
| `{ platform: 1, environment: 1, isStable: 1 }`         | COMPOUND INDEX  | **Critical for stable version queries** |

### FeatureFlag Collection

```javascript
FeatureFlagSchema.index({ platformId: 1 });
FeatureFlagSchema.index(
  { platform: 1, environment: 1, flagName: 1 },
  { unique: true },
);
FeatureFlagSchema.index({ platform: 1, environment: 1 });
```

| Index                                          | Type            | Purpose                        |
| ---------------------------------------------- | --------------- | ------------------------------ |
| `platformId: 1`                                | INDEX           | Foreign key lookup             |
| `{ platform: 1, environment: 1, flagName: 1 }` | UNIQUE COMPOUND | Unique flag identifier         |
| `{ platform: 1, environment: 1 }`              | COMPOUND INDEX  | **Critical for listing flags** |

---

## DynamoDB (Single-Table Design)

### ⚠️ CRITICAL: Current Implementation Issues

**Problem:** The `getLatestStableVersion` query uses a FilterExpression, which is extremely inefficient:

```typescript
// ❌ BAD: Scans ALL versions, then filters in memory
const params = {
  KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
  FilterExpression: "isStable = :isStable", // ← INEFFICIENT!
  ExpressionAttributeValues: {
    ":pk": `PLATFORM#web`,
    ":sk": `ENV#production#CONFIG#`,
    ":isStable": true,
  },
};
```

This reads ALL config versions for the environment, then filters by `isStable` in memory. For 1000 versions with only 10 stable, this reads 100x more data than necessary!

### Required Fix: Add Global Secondary Index (GSI)

**GSI Name:** `StableVersionIndex`

| Attribute | Type   | Key Type      |
| --------- | ------ | ------------- |
| `GSI_PK`  | STRING | PARTITION KEY |
| `GSI_SK`  | STRING | SORT KEY      |

**GSI Attribute Values:**

```
GSI_PK = "PLATFORM#{platform}#ENV#{environment}#STABLE"
GSI_SK = "TIMESTAMP#{versionTimestamp}"
```

**Only write GSI attributes when `isStable = true`:**

- Sparse index - only stable versions are indexed
- Reduces storage and read costs
- Query returns only stable versions without filtering

### Table Schema

**Main Table:**

```
TableName: configurations
PartitionKey: PK (STRING)
SortKey: SK (STRING)
BillingMode: PAY_PER_REQUEST (or PROVISIONED)
```

**Access Patterns:**

| Pattern           | PK                                     | SK                                   | Index            |
| ----------------- | -------------------------------------- | ------------------------------------ | ---------------- |
| Get version       | `PLATFORM#{platform}`                  | `ENV#{env}#CONFIG#{timestamp}`       | Main Table       |
| List versions     | `PLATFORM#{platform}`                  | `begins_with(ENV#{env}#CONFIG#)`     | Main Table       |
| Get latest stable | `PLATFORM#{platform}#ENV#{env}#STABLE` | `TIMESTAMP#{timestamp}` DESC LIMIT 1 | **GSI Required** |
| Get flag          | `PLATFORM#{platform}`                  | `ENV#{env}#FLAG#{flagName}`          | Main Table       |
| List flags        | `PLATFORM#{platform}`                  | `begins_with(ENV#{env}#FLAG#)`       | Main Table       |

### Item Structure Examples

**Config Version (Stable):**

```json
{
  "PK": "PLATFORM#web",
  "SK": "ENV#production#CONFIG#2025-01-01T12:00:00Z",
  "GSI_PK": "PLATFORM#web#ENV#production#STABLE",
  "GSI_SK": "TIMESTAMP#2025-01-01T12:00:00Z",
  "platform": "web",
  "environment": "production",
  "versionTimestamp": "2025-01-01T12:00:00Z",
  "isStable": true,
  "config": "{...}",
  "createdBy": "admin@example.com",
  "createdAt": "2025-01-01T12:00:00Z"
}
```

**Config Version (Unstable):**

```json
{
  "PK": "PLATFORM#web",
  "SK": "ENV#production#CONFIG#2025-01-01T11:00:00Z",
  "platform": "web",
  "environment": "production",
  "versionTimestamp": "2025-01-01T11:00:00Z",
  "isStable": false,
  "config": "{...}",
  "createdBy": "admin@example.com",
  "createdAt": "2025-01-01T11:00:00Z"
}
```

Note: Unstable versions do NOT have `GSI_PK` or `GSI_SK` attributes (sparse index).

**Feature Flag:**

```json
{
  "PK": "PLATFORM#web",
  "SK": "ENV#production#FLAG#new-feature",
  "platform": "web",
  "environment": "production",
  "flagName": "new-feature",
  "enabled": true,
  "description": "New feature toggle",
  "createdBy": "admin@example.com",
  "createdAt": "2025-01-01T12:00:00Z",
  "rolloutType": "simple"
}
```

---

## CloudFormation Template (AWS)

See `infrastructure/dynamodb-cloudformation.yml` for complete template with GSI configuration.

## Terraform Template (AWS)

See `infrastructure/dynamodb-terraform.tf` for complete template with GSI configuration.

---

## Connection Pooling Configuration

### Overview

Connection pooling reuses database connections to improve performance and reduce overhead. Properly configured connection pools are critical for production performance.

### Prisma (MySQL/PostgreSQL)

**Configuration via Environment Variables:**

```bash
DATABASE_CONNECTION_LIMIT=10      # Max connections in pool (default: 10)
DATABASE_POOL_TIMEOUT=10          # Connection timeout in seconds (default: 10)
```

**How it works:**

- Prisma automatically manages connection pooling
- Connection limit appended to connection URL: `?connection_limit=10&pool_timeout=10`
- SQLite: No connection pooling (single connection per process)

**Recommendations:**

- **Serverless (Lambda/Workers)**: 5-10 connections per function instance
- **Traditional servers**: 10-20 connections per process
- **High traffic**: Monitor and increase as needed

### Mongoose (MongoDB)

**Configuration via Environment Variables:**

```bash
DATABASE_MAX_POOL_SIZE=10         # Max connections in pool (default: 10)
DATABASE_MIN_POOL_SIZE=2          # Min connections in pool (default: 2)
DATABASE_MAX_IDLE_TIME_MS=60000   # Max idle time in milliseconds (default: 60000)
```

**Connection Pool Options:**

- `maxPoolSize`: Maximum number of connections (default: 10)
- `minPoolSize`: Minimum number of connections (default: 2)
- `maxIdleTimeMS`: Max time a connection can be idle before being closed (default: 60000ms)
- `serverSelectionTimeoutMS`: Timeout for server selection (default: 30000ms)
- `socketTimeoutMS`: Socket timeout (default: 45000ms)

**Recommendations:**

- **Serverless (Lambda)**: `maxPoolSize=5`, `minPoolSize=1`
- **Traditional servers**: `maxPoolSize=10-20`, `minPoolSize=2-5`
- **High traffic**: `maxPoolSize=50-100`, `minPoolSize=10`

### DynamoDB

**No connection pooling configuration needed** - AWS SDK manages connections automatically.

### Cloudflare D1

**No connection pooling configuration needed** - Edge database with automatic connection management.

---

## Performance Recommendations

### General Guidelines

1. **Always query by indexed fields** - Never use full table scans
2. **Use composite indexes** - For multi-field WHERE clauses
3. **Keep indexes selective** - High cardinality is better
4. **Monitor slow queries** - Use database profiling tools
5. **Configure connection pooling** - Match pool size to your workload and deployment environment

### Database-Specific Tips

**Prisma/SQL:**

- Use `EXPLAIN` to verify index usage
- Add covering indexes for frequently accessed columns
- Monitor query execution time in production

**MongoDB:**

- Use `explain("executionStats")` to verify index usage
- Create compound indexes in query field order
- Enable profiler: `db.setProfilingLevel(1, { slowms: 100 })`

**DynamoDB:**

- ✅ Always query with partition key
- ✅ Use sort key for range queries
- ❌ Never use FilterExpression for high-selectivity filters
- ✅ Use GSI for alternate access patterns
- ✅ Use sparse indexes (only write when attribute exists)

### Cost Optimization

**DynamoDB:**

- Use sparse indexes to reduce storage costs
- PAY_PER_REQUEST for unpredictable workloads
- PROVISIONED for predictable, steady workloads
- Monitor Read/Write Capacity Units (RCU/WCU)

---

## Migration Guide

If you need to add the DynamoDB GSI to an existing table:

1. **Create GSI** (online operation, no downtime):

   ```bash
   aws dynamodb update-table \
     --table-name configurations \
     --attribute-definitions \
       AttributeName=GSI_PK,AttributeType=S \
       AttributeName=GSI_SK,AttributeType=S \
     --global-secondary-index-updates \
       '[{
         "Create": {
           "IndexName": "StableVersionIndex",
           "KeySchema": [
             {"AttributeName": "GSI_PK", "KeyType": "HASH"},
             {"AttributeName": "GSI_SK", "KeyType": "RANGE"}
           ],
           "Projection": {"ProjectionType": "ALL"},
           "ProvisionedThroughput": {
             "ReadCapacityUnits": 5,
             "WriteCapacityUnits": 5
           }
         }
       }]'
   ```

2. **Backfill GSI attributes** for existing stable versions:

   ```typescript
   // See scripts/dynamodb-backfill-gsi.ts
   ```

3. **Update application code** to use GSI for stable version queries

4. **Monitor GSI status** until ACTIVE

---

## Monitoring

### Key Metrics to Track

**SQL Databases:**

- Slow query log (queries > 100ms)
- Index usage statistics
- Table scan count (should be zero)

**MongoDB:**

- Query execution time (use profiler)
- Index hit ratio (should be > 99%)
- Collection scan count (should be near zero)

**DynamoDB:**

- ConsumedReadCapacityUnits
- ConsumedWriteCapacityUnits
- ThrottledRequests (should be zero)
- GSI backlog (should be near zero)

---

## Testing Index Performance

See `packages/database/src/__tests__/index-performance.test.ts` for performance benchmarks.

**Expected Query Times:**

- Get by PK: < 5ms (all databases)
- Get latest stable: < 10ms (with proper indexes)
- List paginated: < 20ms for first page (all databases)
- Full table scan: **NEVER** - always use indexes!
