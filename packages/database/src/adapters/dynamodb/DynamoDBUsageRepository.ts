import { dynamoDBClient, getTableName } from '../../database';
import { IUsageRepository } from '../../interfaces';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';

/**
 * DynamoDB implementation of usage tracking repository
 *
 * @remarks
 * Uses DynamoDB's atomic ADD operation for concurrent-safe incrementing.
 * Stores usage counters in dedicated items with PK/SK pattern:
 * - PK: `TENANT#${tenantId}`
 * - SK: `USAGE#apiRequests`
 *
 * **Atomic Increment Benefits:**
 * - No read-modify-write race conditions
 * - Single request = single write unit
 * - No hot-item contention (separate item per counter)
 * - Works perfectly under high concurrency
 *
 * **Cost Efficiency:**
 * - Only writes tiny counter items (~50 bytes)
 * - Doesn't rewrite tenant metadata (no write amplification)
 * - Minimal latency (single DynamoDB request)
 *
 * @example
 * ```typescript
 * const repo = new DynamoDBUsageRepository();
 *
 * // Fire and forget - don't block requests
 * repo.incrementApiRequests('tenant-abc123').catch(err => {
 *   logger.error('Failed to track usage', err);
 * });
 * ```
 */
export class DynamoDBUsageRepository implements IUsageRepository {
  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * Uses DynamoDB UPDATE with ADD operation for atomic increment.
   * Automatically initializes counter to 0 if it doesn't exist.
   *
   * **DynamoDB Operation:**
   * ```
   * UPDATE table
   * SET apiRequests = apiRequests + 1,
   *     lastUpdated = :now
   * WHERE PK = TENANT#{tenantId}
   *   AND SK = USAGE#apiRequests
   * ```
   *
   * **Atomicity Guarantee:**
   * Even if 1000 concurrent requests increment simultaneously:
   * - All increments are applied (no lost updates)
   * - Final count = initial + 1000 (correct)
   * - No optimistic locking or retry logic needed
   *
   * **Multi-Tenancy:**
   * Respects TABLE_PREFIX from AsyncLocalStorage context.
   * When called inside withDatabaseContext(), automatically uses
   * tenant-specific table prefix (e.g., `tenant_123_configurations`).
   */
  async incrementApiRequests(tenantId: string): Promise<void> {
    await dynamoDBClient.send(
      new UpdateCommand({
        TableName: getTableName(), // Respects TABLE_PREFIX from AsyncLocalStorage
        Key: {
          PK: `TENANT#${tenantId}`,
          SK: 'USAGE#apiRequests',
        },
        UpdateExpression:
          'SET apiRequests = if_not_exists(apiRequests, :zero) + :one, lastUpdated = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
      })
    );
  }
}
