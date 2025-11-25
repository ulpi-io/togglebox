/**
 * Usage tracking repository interface
 *
 * Provides atomic increment operations for usage metrics to avoid
 * read-modify-write race conditions under concurrent requests.
 *
 * @remarks
 * All implementations MUST use atomic increment operations:
 * - DynamoDB: UpdateExpression with ADD
 * - SQL: UPDATE with column = column + 1
 * - MongoDB: $inc operator
 *
 * This ensures accurate usage counts even under high concurrency
 * without needing distributed locks or optimistic concurrency control.
 */
export interface IUsageRepository {
  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * This operation MUST be atomic to prevent lost updates:
   * - Thread A increments: 100 → 101
   * - Thread B increments: 100 → 101 (WRONG if not atomic)
   * - Thread B increments: 101 → 102 (CORRECT with atomic increment)
   *
   * @example
   * ```typescript
   * // In middleware (don't await - fire and forget)
   * db.usage.incrementApiRequests(tenant.subdomain).catch(err => {
   *   logger.error('Failed to track API usage', err);
   * });
   * ```
   */
  incrementApiRequests(tenantId: string): Promise<void>;
}
