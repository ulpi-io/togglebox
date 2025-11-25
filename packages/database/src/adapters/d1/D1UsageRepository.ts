import { IUsageRepository } from '../../interfaces';

/**
 * D1/SQLite implementation of usage tracking repository (Cloudflare Workers)
 *
 * @remarks
 * Uses SQLite's INSERT ... ON CONFLICT UPDATE for atomic increment.
 *
 * **Atomic Increment in SQLite:**
 * ```sql
 * INSERT INTO usage (tenant_id, api_requests, last_updated)
 * VALUES (?, 1, CURRENT_TIMESTAMP)
 * ON CONFLICT(tenant_id) DO UPDATE SET
 *   api_requests = api_requests + 1,
 *   last_updated = CURRENT_TIMESTAMP
 * ```
 *
 * **Concurrency Safety:**
 * - SQLite handles atomic updates automatically
 * - Works correctly even under concurrent Workers requests
 * - Cloudflare handles distributed consistency
 *
 * @example
 * ```typescript
 * const repo = new D1UsageRepository(env.DB);
 * await repo.incrementApiRequests('tenant-abc123');
 * ```
 */
export class D1UsageRepository implements IUsageRepository {
  constructor(private database: D1Database) {}

  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * Uses SQLite's UPSERT pattern (INSERT ... ON CONFLICT UPDATE):
   * - If row exists: increment api_requests by 1
   * - If row doesn't exist: create with api_requests = 1
   *
   * **Database Operation:**
   * Single SQL statement with atomic guarantees via SQLite.
   *
   * **Multi-Tenancy:**
   * Tenant ID is the primary key.
   * Cloudflare Workers handle edge replication automatically.
   */
  async incrementApiRequests(tenantId: string): Promise<void> {
    await this.database
      .prepare(
        `
        INSERT INTO usage (tenant_id, api_requests, last_updated)
        VALUES (?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(tenant_id) DO UPDATE SET
          api_requests = api_requests + 1,
          last_updated = CURRENT_TIMESTAMP
      `
      )
      .bind(tenantId)
      .run();
  }
}
