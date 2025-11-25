import { IUsageRepository } from '../../interfaces';
import { PrismaClient } from '.prisma/client-database';

/**
 * Prisma implementation of usage tracking repository (SQL databases)
 *
 * @remarks
 * Uses SQL's atomic UPDATE with column = column + 1 for concurrent-safe incrementing.
 *
 * **Atomic Increment in SQL:**
 * ```sql
 * UPDATE usage
 * SET api_requests = api_requests + 1, last_updated = CURRENT_TIMESTAMP
 * WHERE tenant_id = ?
 * ```
 *
 * If row doesn't exist, inserts with count = 1 (upsert).
 *
 * **Concurrency Safety:**
 * - Database handles locking automatically
 * - No application-level retry logic needed
 * - Works perfectly under high load
 *
 * @example
 * ```typescript
 * const repo = new PrismaUsageRepository(prisma);
 * await repo.incrementApiRequests('tenant-abc123');
 * ```
 */
export class PrismaUsageRepository implements IUsageRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * Uses Prisma's upsert with increment for atomic operation:
   * - If row exists: increment apiRequests by 1
   * - If row doesn't exist: create with apiRequests = 1
   *
   * **Database Operation:**
   * PostgreSQL/MySQL: `UPDATE ... SET api_requests = api_requests + 1`
   * SQLite: Same atomic behavior via triggers
   *
   * **Multi-Tenancy:**
   * Tenant ID is used as the primary key.
   * No table prefix needed - Prisma handles connection per tenant.
   */
  async incrementApiRequests(tenantId: string): Promise<void> {
    await this.prisma.usage.upsert({
      where: { tenantId },
      update: {
        apiRequests: { increment: 1 },
        lastUpdated: new Date().toISOString(),
      },
      create: {
        tenantId,
        apiRequests: 1,
        lastUpdated: new Date().toISOString(),
      },
    });
  }
}
