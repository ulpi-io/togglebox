/**
 * DynamoDB client configuration for authentication data.
 *
 * @module adapters/dynamodb/database
 *
 * @remarks
 * **Single-Table Design:**
 * Authentication data (users, API keys, password reset tokens) shares the same
 * DynamoDB table as configuration data, differentiated by PK/SK patterns.
 *
 * **Multi-Tenancy:**
 * Uses `getTableName()` from @togglebox/database to apply tenant-specific
 * table prefixes from AsyncLocalStorage context.
 *
 * **Environment Variables:**
 * - `DYNAMODB_TABLE` - Base table name (default: "configurations")
 * - `AWS_REGION` - AWS region (default: "us-east-1")
 * - `DYNAMODB_ENDPOINT` - Custom endpoint for local development
 *
 * **Local Development:**
 * ```bash
 * docker run -p 8000:8000 amazon/dynamodb-local
 * export DYNAMODB_ENDPOINT=http://localhost:8000
 * export DYNAMODB_TABLE=configurations
 * export AWS_REGION=us-east-1
 * ```
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { getTableName } from '@togglebox/database';

/**
 * Get the tenant-aware table name for auth operations.
 *
 * @returns Full table name with tenant prefix applied
 *
 * @remarks
 * Automatically applies tenant-specific table prefix from AsyncLocalStorage.
 * Should be called inside `withDatabaseContext()` to ensure proper tenant isolation.
 *
 * **Multi-Tenancy:**
 * - Without context: Returns base table name
 * - With context: Returns `{tenantId}_{tableName}`
 *
 * **Usage:**
 * ```typescript
 * import { withDatabaseContext } from '@togglebox/database';
 *
 * await withDatabaseContext(tenantId, async () => {
 *   const tableName = getAuthTableName(); // Returns "tenant123_configurations"
 *   // ... DynamoDB operations
 * });
 * ```
 */
export function getAuthTableName(): string {
  return getTableName();
}

/**
 * DynamoDB Document Client for simplified API.
 *
 * @remarks
 * **Document Client vs Low-Level Client:**
 * - Automatically marshals/unmarshals JavaScript objects to DynamoDB format
 * - Simpler API for common operations (put, get, query, scan)
 * - No need to specify data types (S, N, BOOL, etc.)
 *
 * **Configuration:**
 * - Region: From `AWS_REGION` env var (default: us-east-1)
 * - Endpoint: Optional custom endpoint for local development
 *
 * **Local Development:**
 * Set `DYNAMODB_ENDPOINT=http://localhost:8000` to use DynamoDB Local.
 *
 * **Credentials:**
 * Uses AWS SDK credential chain:
 * 1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
 * 2. AWS credentials file (`~/.aws/credentials`)
 * 3. IAM role (when running in AWS Lambda/EC2)
 */
const client = new DynamoDBClient({
  region: process.env['AWS_REGION'] || 'us-east-1',
  ...(process.env['DYNAMODB_ENDPOINT'] && { endpoint: process.env['DYNAMODB_ENDPOINT'] }),
});

export const dynamoDBClient = DynamoDBDocumentClient.from(client);
