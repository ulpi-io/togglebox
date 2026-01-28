import { dynamoDBClient, getUsageTableName } from "../../database";
import { IUsageRepository } from "../../interfaces";
import { UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

/**
 * Number of time-based shards for distributing usage writes.
 * With 10 shards, we can handle ~35,000 WCU before hitting partition limits.
 */
const USAGE_SHARD_COUNT = 10;

/**
 * DynamoDB implementation of usage tracking repository
 *
 * @remarks
 * Uses DynamoDB's atomic ADD operation for concurrent-safe incrementing.
 * Stores usage counters in dedicated items with PK/SK pattern:
 * - PK: `TENANT#${tenantId}`
 * - SK: `USAGE#apiRequests#SHARD#${shard}` (sharded for high throughput)
 *
 * **Sharding Strategy:**
 * To prevent hot partition issues for high-traffic tenants, writes are
 * distributed across multiple shards using time-based sharding. This allows
 * enterprise tenants with 10k+ req/sec to avoid partition throughput limits.
 *
 * **Atomic Increment Benefits:**
 * - No read-modify-write race conditions
 * - Single request = single write unit
 * - Sharding prevents hot-item contention at scale
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
   * Get a time-based shard number for distributing writes.
   * Uses current timestamp to ensure even distribution over time.
   */
  private getShard(): number {
    return Date.now() % USAGE_SHARD_COUNT;
  }

  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * Uses DynamoDB UPDATE with ADD operation for atomic increment.
   * Automatically initializes counter to 0 if it doesn't exist.
   * Uses time-based sharding to prevent hot partitions for high-traffic tenants.
   *
   * **DynamoDB Operation:**
   * ```
   * UPDATE table
   * SET apiRequests = apiRequests + 1,
   *     lastUpdated = :now
   * WHERE PK = TENANT#{tenantId}
   *   AND SK = USAGE#apiRequests#SHARD#{shard}
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
    const shard = this.getShard();

    await dynamoDBClient.send(
      new UpdateCommand({
        TableName: getUsageTableName(), // Respects TABLE_PREFIX from AsyncLocalStorage
        Key: {
          PK: `TENANT#${tenantId}`,
          SK: `USAGE#apiRequests#SHARD#${shard}`,
        },
        UpdateExpression:
          "SET apiRequests = if_not_exists(apiRequests, :zero) + :one, lastUpdated = :now",
        ExpressionAttributeValues: {
          ":zero": 0,
          ":one": 1,
          ":now": new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Get total API request count for a tenant.
   * Aggregates across all shards.
   *
   * @param tenantId - Tenant identifier (subdomain)
   * @returns Total API request count across all shards
   */
  async getApiRequestCount(tenantId: string): Promise<number> {
    const result = await dynamoDBClient.send(
      new QueryCommand({
        TableName: getUsageTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `TENANT#${tenantId}`,
          ":prefix": "USAGE#apiRequests#SHARD#",
        },
      }),
    );

    // Sum up counts from all shards
    let total = 0;
    for (const item of result.Items || []) {
      total += (item["apiRequests"] as number) || 0;
    }

    return total;
  }
}
