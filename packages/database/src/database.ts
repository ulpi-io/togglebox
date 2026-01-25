/**
 * DynamoDB client configuration and table name management.
 *
 * @module database
 *
 * @remarks
 * This module provides DynamoDB client initialization and table name resolution
 * with support for multi-tenancy via table prefixes.
 *
 * **Multi-Tenancy Support:**
 * - Each tenant can have a separate DynamoDB table with a prefix
 * - Table prefix can be set per-request using AsyncLocalStorage (safe for concurrent requests)
 * - Default table name from DYNAMODB_TABLE environment variable
 *
 * **Environment Variables:**
 * - DYNAMODB_TABLE: Base table name (default: "configurations")
 * - TABLE_PREFIX: Global table prefix for all requests
 * - AWS_REGION: AWS region (default: "us-east-1")
 * - DYNAMODB_ENDPOINT: Optional local DynamoDB endpoint (for development)
 *
 * **Table Naming Convention:**
 * Full table name = `{prefix}{baseName}`
 * Examples:
 * - No prefix: "configurations"
 * - With prefix: "tenant_abc123_configurations"
 */

import { AsyncLocalStorage } from 'async_hooks';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Default table name from environment variable.
 *
 * @remarks
 * Falls back to "configurations" if DYNAMODB_TABLE is not set.
 * @deprecated Use specific table name functions instead (e.g., getPlatformsTableName)
 */
const DEFAULT_TABLE_NAME = process.env['DYNAMODB_TABLE'] || 'configurations';

/**
 * Table name constants for the DynamoDB tables.
 *
 * @remarks
 * **Environment Variable Configuration:**
 * When deployed to AWS Lambda via serverless.yml, table names are injected
 * via environment variables with stage suffixes (e.g., togglebox-users-dev).
 * For local development, hardcoded defaults are used.
 *
 * **Auth Tables (Admin-only):**
 * - togglebox-users: User accounts
 * - togglebox-api-keys: API key management
 * - togglebox-password-resets: Password reset tokens
 *
 * **Config Tables (Admin + Customer-facing):**
 * - togglebox-platforms: Platform metadata
 * - togglebox-environments: Environment metadata
 * - togglebox-configs: Configuration versions
 *
 * **Three-Tier Architecture Tables:**
 * - togglebox-remote-configs: Remote config key-value pairs
 * - togglebox-flags: Feature flags (2-value model)
 * - togglebox-experiments: A/B experiments (multi-variant)
 * - togglebox-stats: Metrics and analytics
 * - togglebox-usage: API usage tracking per tenant
 */
const TABLE_NAMES = {
  USERS: process.env['DYNAMODB_USERS_TABLE'] || 'togglebox-users',
  API_KEYS: process.env['DYNAMODB_API_KEYS_TABLE'] || 'togglebox-api-keys',
  PASSWORD_RESETS: process.env['DYNAMODB_PASSWORD_RESETS_TABLE'] || 'togglebox-password-resets',
  PLATFORMS: process.env['DYNAMODB_PLATFORMS_TABLE'] || 'togglebox-platforms',
  ENVIRONMENTS: process.env['DYNAMODB_ENVIRONMENTS_TABLE'] || 'togglebox-environments',
  CONFIGS: process.env['DYNAMODB_CONFIGS_TABLE'] || 'togglebox-configs',
  // Three-tier architecture tables
  REMOTE_CONFIGS: process.env['DYNAMODB_REMOTE_CONFIGS_TABLE'] || 'togglebox-remote-configs',
  FLAGS: process.env['DYNAMODB_FLAGS_TABLE'] || 'togglebox-flags',
  EXPERIMENTS: process.env['DYNAMODB_EXPERIMENTS_TABLE'] || 'togglebox-experiments',
  STATS: process.env['DYNAMODB_STATS_TABLE'] || 'togglebox-stats',
  USAGE: process.env['DYNAMODB_USAGE_TABLE'] || 'togglebox-usage',
};

/**
 * AsyncLocalStorage for request-scoped table prefix.
 *
 * @remarks
 * Provides safe multi-tenancy support in concurrent request environments.
 * Each request maintains its own table prefix without race conditions.
 */
const tablePrefixStorage = new AsyncLocalStorage<string>();

/**
 * Fallback table prefix for environments without AsyncLocalStorage context.
 *
 * @remarks
 * Used when no AsyncLocalStorage context is active (e.g., CLI scripts, tests).
 * Read-only value from TABLE_PREFIX environment variable.
 */
const FALLBACK_TABLE_PREFIX = process.env['TABLE_PREFIX'] || '';

/**
 * Get the full table name with optional prefix.
 *
 * @param tablePrefix - Optional prefix to override current prefix (e.g., 'tenant_abc123_')
 * @param tableName - Base table name (defaults to DYNAMODB_TABLE env var)
 * @returns Full table name with prefix applied
 *
 * @remarks
 * **Multi-Tenancy Pattern (AsyncLocalStorage-based):**
 * 1. Wrap request handler: `withDatabaseContext(req, async () => { ... })`
 * 2. Get table name: `getTableName()` → uses request-scoped prefix from AsyncLocalStorage
 * 3. No manual cleanup needed - AsyncLocalStorage handles cleanup automatically
 *
 * **Priority:**
 * 1. tablePrefix parameter (highest priority)
 * 2. AsyncLocalStorage value (request-scoped, safe for concurrent requests)
 * 3. fallbackTablePrefix (from TABLE_PREFIX environment variable)
 * 4. Empty string (no prefix)
 *
 * @example
 * ```ts
 * // Default table name (no prefix)
 * getTableName(); // "configurations"
 *
 * // With global prefix from env
 * process.env.TABLE_PREFIX = 'staging_';
 * getTableName(); // "staging_configurations"
 *
 * // With explicit prefix parameter
 * getTableName('tenant_abc_'); // "tenant_abc_configurations"
 *
 * // With custom table name
 * getTableName('tenant_abc_', 'settings'); // "tenant_abc_settings"
 *
 * // Multi-tenant request pattern (AsyncLocalStorage-based, SAFE for concurrent requests)
 * await withDatabaseContext(req, async () => {
 *   const tableName = getTableName(); // Automatically uses tenant prefix from req.dbConfig
 *   // ... DynamoDB operations ...
 * }); // AsyncLocalStorage cleanup happens automatically
 * ```
 */
export function getTableName(tablePrefix?: string, tableName?: string): string {
  // Priority 1: Explicit parameter
  if (tablePrefix !== undefined) {
    const base = tableName || DEFAULT_TABLE_NAME;
    return `${tablePrefix}${base}`;
  }

  // Priority 2: AsyncLocalStorage (request-scoped, safe for concurrent requests)
  const asyncPrefix = tablePrefixStorage.getStore();
  if (asyncPrefix !== undefined) {
    const base = tableName || DEFAULT_TABLE_NAME;
    return `${asyncPrefix}${base}`;
  }

  // Priority 3: Fallback prefix (for non-request contexts like CLI scripts)
  const base = tableName || DEFAULT_TABLE_NAME;
  return `${FALLBACK_TABLE_PREFIX}${base}`;
}

/**
 * Helper function to get table name with prefix applied.
 *
 * @param baseName - Base table name (e.g., 'togglebox-users')
 * @returns Full table name with prefix applied
 *
 * @internal
 */
function getTableNameWithPrefix(baseName: string): string {
  // Priority 1: AsyncLocalStorage (request-scoped, safe for concurrent requests)
  const asyncPrefix = tablePrefixStorage.getStore();
  if (asyncPrefix !== undefined) {
    return `${asyncPrefix}${baseName}`;
  }

  // Priority 2: Fallback prefix (for non-request contexts like CLI scripts)
  return `${FALLBACK_TABLE_PREFIX}${baseName}`;
}

/**
 * Get the users table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-users' or 'togglebox-users')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `USER#{id}` - User UUID
 * - GSI1: `EMAIL#{email}` - Email lookup
 *
 * @example
 * ```typescript
 * const tableName = getUsersTableName();
 * // Without tenant context: 'togglebox-users'
 * // With tenant context: 'tenant_abc_togglebox-users'
 * ```
 */
export function getUsersTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.USERS);
}

/**
 * Get the API keys table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-api-keys' or 'togglebox-api-keys')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `APIKEY#{id}` - API key UUID
 * - GSI1: `USER#{userId}` - User's API keys
 * - GSI2: `HASH#{keyHash}` - Key hash lookup for authentication
 *
 * @example
 * ```typescript
 * const tableName = getApiKeysTableName();
 * ```
 */
export function getApiKeysTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.API_KEYS);
}

/**
 * Get the password resets table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-password-resets' or 'togglebox-password-resets')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `RESET#{id}` - Reset token UUID
 * - GSI1: `USER#{userId}` - User's reset tokens
 * - GSI2: `HASH#{tokenHash}` - Token hash lookup
 *
 * @example
 * ```typescript
 * const tableName = getPasswordResetsTableName();
 * ```
 */
export function getPasswordResetsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.PASSWORD_RESETS);
}

/**
 * Get the platforms table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-platforms' or 'togglebox-platforms')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{name}` - Platform name (unique)
 * - No GSI needed for simple name-based lookup
 *
 * @example
 * ```typescript
 * const tableName = getPlatformsTableName();
 * ```
 */
export function getPlatformsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.PLATFORMS);
}

/**
 * Get the environments table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-environments' or 'togglebox-environments')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}` - Parent platform
 * - SK: `ENV#{name}` - Environment name
 *
 * @example
 * ```typescript
 * const tableName = getEnvironmentsTableName();
 * ```
 */
export function getEnvironmentsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.ENVIRONMENTS);
}

/**
 * Get the configs table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-configs' or 'togglebox-configs')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}#ENV#{env}` - Platform + environment composite key
 * - SK: `VERSION#{timestamp}` - Version timestamp for ordering
 * - GSI1: `STABLE` - For latest stable version lookup
 *
 * @example
 * ```typescript
 * const tableName = getConfigsTableName();
 * ```
 */
export function getConfigsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.CONFIGS);
}

/**
 * Get the remote configs table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-remote-configs' or 'togglebox-remote-configs')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}#ENV#{env}` - Platform + environment composite key
 * - SK: `CONFIG#{key}#V#{version}` - Config key + version
 * - GSI1: For active config lookup
 */
export function getRemoteConfigsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.REMOTE_CONFIGS);
}

/**
 * Get the flags table name with tenant prefix applied (simplified 2-value model).
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-flags' or 'togglebox-flags')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}#ENV#{env}` - Platform + environment composite key
 * - SK: `FLAG#{key}#V#{version}` - Flag key + version
 * - GSI1: For active flag lookup
 */
export function getFlagsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.FLAGS);
}

/**
 * Get the experiments table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-experiments' or 'togglebox-experiments')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}#ENV#{env}` - Platform + environment composite key
 * - SK: `EXP#{key}#V#{version}` - Experiment key + version
 * - GSI1: For status-based queries (running experiments)
 */
export function getExperimentsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.EXPERIMENTS);
}

/**
 * Get the stats table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-stats' or 'togglebox-stats')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `PLATFORM#{platform}#ENV#{env}` - Platform + environment composite key
 * - SK: `STATS#{type}#{key}` - Stats type (CONFIG, FLAG, EXP) + key
 * - GSI1: For time-based queries
 */
export function getStatsTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.STATS);
}

/**
 * Get the usage table name with tenant prefix applied.
 *
 * @returns Full table name (e.g., 'tenant_abc_togglebox-usage' or 'togglebox-usage')
 *
 * @remarks
 * **Table Schema:**
 * - PK: `TENANT#{id}` - Tenant identifier
 * - SK: `USAGE#apiRequests` - Usage metric type
 */
export function getUsageTableName(): string {
  return getTableNameWithPrefix(TABLE_NAMES.USAGE);
}

/**
 * Execute an operation with a specific table prefix.
 *
 * @param prefix - Table prefix to use (e.g., 'tenant_abc123_')
 * @param operation - Async function to execute with the prefix
 * @returns Result of the operation
 *
 * @remarks
 * **Use Cases:**
 * - Testing: Run tests with specific tenant prefixes
 * - CLI scripts: Execute operations for specific tenants
 * - Background jobs: Process data for specific tenants
 *
 * **Concurrency Safe:**
 * Uses AsyncLocalStorage to provide isolated prefix context.
 * Multiple concurrent calls will not interfere with each other.
 *
 * **Automatic Cleanup:**
 * The prefix context is automatically cleaned up when the operation completes,
 * even if an error occurs.
 *
 * @example
 * ```typescript
 * // Testing with specific tenant
 * await withTablePrefix('test_tenant_', async () => {
 *   const platforms = await platformService.listPlatforms();
 *   expect(platforms).toHaveLength(0);
 * });
 *
 * // CLI script for specific tenant
 * await withTablePrefix('tenant_abc123_', async () => {
 *   const config = await configService.getLatestStableVersion('web', 'production');
 *   console.log(config);
 * });
 *
 * // Background job processing
 * for (const tenant of tenants) {
 *   await withTablePrefix(tenant.tablePrefix, async () => {
 *     await processAnalytics();
 *   });
 * }
 * ```
 */
export async function withTablePrefix<T>(
  prefix: string,
  operation: () => Promise<T>
): Promise<T> {
  return tablePrefixStorage.run(prefix, operation);
}

/**
 * Reset table prefix to empty string for current async context.
 *
 * @remarks
 * Used when accessing shared tables (like tenants table) that should not have tenant-specific prefixes.
 * Ensures operations use the base table name without any prefix applied.
 *
 * @example
 * ```typescript
 * // Access shared tenants table (no prefix)
 * resetTablePrefix();
 * const tenant = await getTenantBySubdomain('acme');
 * ```
 */
export function resetTablePrefix(): void {
  tablePrefixStorage.enterWith('');
}

/**
 * Get the AsyncLocalStorage instance for table prefix.
 *
 * @remarks
 * Used internally by `withDatabaseContext` to provide request-scoped table prefix.
 * Exposed for advanced use cases and testing.
 *
 * @internal
 */
export function getTablePrefixStorage(): AsyncLocalStorage<string> {
  return tablePrefixStorage;
}


/**
 * Pre-configured DynamoDB DocumentClient instance (AWS SDK v3).
 *
 * @remarks
 * **Configuration:**
 * - Region: AWS_REGION environment variable (default: "us-east-1")
 * - Endpoint: DYNAMODB_ENDPOINT environment variable (optional, for local DynamoDB)
 *
 * **Local Development:**
 * Set DYNAMODB_ENDPOINT to use local DynamoDB:
 * ```bash
 * export DYNAMODB_ENDPOINT=http://localhost:8000
 * docker run -p 8000:8000 amazon/dynamodb-local
 * ```
 *
 * **Production:**
 * Relies on AWS SDK default credential provider chain:
 * 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * 2. IAM role (recommended for EC2, Lambda, ECS)
 * 3. AWS credentials file (~/.aws/credentials)
 *
 * **AWS SDK v3:**
 * Uses @aws-sdk/lib-dynamodb which provides backward-compatible DocumentClient API.
 * No .promise() needed - commands return promises directly.
 *
 * @example
 * ```ts
 * import { dynamoDBClient, getTableName } from './database';
 * import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
 *
 * // Query platforms
 * const result = await dynamoDBClient.send(new QueryCommand({
 *   TableName: getTableName(),
 *   IndexName: 'GSI1',
 *   KeyConditionExpression: 'GSI1PK = :pk',
 *   ExpressionAttributeValues: { ':pk': 'PLATFORM' },
 * }));
 *
 * // Put item with conditional check
 * await dynamoDBClient.send(new PutCommand({
 *   TableName: getTableName(),
 *   Item: {
 *     PK: `PLATFORM#${platformName}`,
 *     SK: 'METADATA',
 *     ...platformData,
 *   },
 *   ConditionExpression: 'attribute_not_exists(PK)',
 * }));
 * ```
 */
const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
  ...(process.env['DYNAMODB_ENDPOINT'] && { endpoint: process.env['DYNAMODB_ENDPOINT'] }),
});

export const dynamoDBClient = DynamoDBDocumentClient.from(client);
