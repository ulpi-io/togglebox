import { IUsageRepository } from "../../interfaces";
import { Connection, Model, Schema } from "mongoose";

/**
 * Usage tracking document schema for MongoDB
 */
const UsageSchema = new Schema({
  tenantId: { type: String, required: true, unique: true },
  apiRequests: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

/**
 * Mongoose implementation of usage tracking repository (MongoDB)
 *
 * @remarks
 * Uses MongoDB's $inc operator for atomic increment operations.
 *
 * **Atomic Increment in MongoDB:**
 * ```javascript
 * db.usage.updateOne(
 *   { tenantId: 'tenant-abc123' },
 *   { $inc: { apiRequests: 1 }, $set: { lastUpdated: new Date() } },
 *   { upsert: true }
 * )
 * ```
 *
 * **Concurrency Safety:**
 * - MongoDB's $inc is atomic at document level
 * - Multiple concurrent increments all applied correctly
 * - No optimistic locking needed
 *
 * @example
 * ```typescript
 * const repo = new MongooseUsageRepository(mongooseConnection);
 * await repo.incrementApiRequests('tenant-abc123');
 * ```
 */
export class MongooseUsageRepository implements IUsageRepository {
  private Usage: Model<any>;

  constructor(connection: Connection) {
    this.Usage = connection.model("Usage", UsageSchema);
  }

  /**
   * Atomically increment API request count for a tenant
   *
   * @param tenantId - Tenant identifier (subdomain)
   *
   * @remarks
   * Uses MongoDB's $inc operator with upsert:
   * - If document exists: increment apiRequests by 1
   * - If document doesn't exist: create with apiRequests = 1
   *
   * **Database Operation:**
   * ```javascript
   * {
   *   $inc: { apiRequests: 1 },
   *   $set: { lastUpdated: Date.now() }
   * }
   * ```
   *
   * **Multi-Tenancy:**
   * Tenant ID is stored as the unique identifier.
   * Each tenant gets their own usage document.
   */
  async incrementApiRequests(tenantId: string): Promise<void> {
    await this.Usage.updateOne(
      { tenantId },
      {
        $inc: { apiRequests: 1 },
        $set: { lastUpdated: new Date() },
      },
      { upsert: true },
    );
  }
}
