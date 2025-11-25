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
 */
const DEFAULT_TABLE_NAME = process.env['DYNAMODB_TABLE'] || 'configurations';

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
