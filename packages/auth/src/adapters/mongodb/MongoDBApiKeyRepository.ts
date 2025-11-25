import { IApiKeyRepository, CreateApiKeyRepositoryData } from '../../interfaces/IApiKeyRepository';
import { ApiKey, PublicApiKey } from '../../models/ApiKey';
import { ApiKeyModel, IApiKeyDocument } from './schemas';

/**
 * MongoDB implementation of API key repository using Mongoose.
 *
 * @implements {IApiKeyRepository}
 *
 * @remarks
 * **Mongoose ORM Features:**
 * - Schema validation for permissions array
 * - Unique index on keyHash prevents duplicates
 * - Index on userId for efficient user queries
 * - Auto-managed createdAt timestamp
 *
 * **Access Patterns:**
 * 1. Find by ID: `findById()` - Uses indexed `_id`
 * 2. Find by hash: `findOne({ keyHash })` - Uses unique keyHash index
 * 3. List by user: `find({ userId })` - Uses userId index, sorted by creation
 *
 * **Performance:**
 * - All lookups use indexes (fast)
 * - Bulk delete via `deleteMany()` for cascade operations
 *
 * **Security:**
 * - Never stores plaintext keys
 * - `listByUser()` returns PublicApiKey (excludes keyHash, userId)
 */
export class MongoDBApiKeyRepository implements IApiKeyRepository {
  async create(data: CreateApiKeyRepositoryData): Promise<ApiKey> {
    const apiKey = await ApiKeyModel.create(data);
    return this.mapToApiKey(apiKey);
  }

  async findById(id: string): Promise<ApiKey | null> {
    const apiKey = await ApiKeyModel.findById(id);
    return apiKey ? this.mapToApiKey(apiKey) : null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const apiKey = await ApiKeyModel.findOne({ keyHash });
    return apiKey ? this.mapToApiKey(apiKey) : null;
  }

  async listByUser(userId: string): Promise<PublicApiKey[]> {
    const apiKeys = await ApiKeyModel.find({ userId }).sort({ createdAt: -1 });
    return apiKeys.map((apiKey) => {
      const { keyHash, userId: _, ...publicKey } = this.mapToApiKey(apiKey);
      return publicKey as PublicApiKey;
    });
  }

  async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const apiKey = await ApiKeyModel.findByIdAndUpdate(id, data, { new: true });
    if (!apiKey) {
      throw new Error(`API Key with ID ${id} not found`);
    }
    return this.mapToApiKey(apiKey);
  }

  async delete(id: string): Promise<void> {
    await ApiKeyModel.findByIdAndDelete(id);
  }

  async deleteByUser(userId: string): Promise<void> {
    await ApiKeyModel.deleteMany({ userId });
  }

  /**
   * Map Mongoose document to ApiKey domain model.
   *
   * @param doc - Mongoose document from database
   * @returns API Key model with string ID
   *
   * @remarks
   * **ObjectId Conversion:**
   * Converts Mongoose `_id` (ObjectId) to string for domain model.
   *
   * **Null Handling:**
   * - `expiresAt`: null if key never expires
   * - `lastUsedAt`: null if key never used
   */
  private mapToApiKey(doc: IApiKeyDocument): ApiKey {
    return {
      id: doc._id.toString(),
      userId: doc.userId,
      name: doc.name,
      keyHash: doc.keyHash,
      keyPrefix: doc.keyPrefix,
      keyLast4: doc.keyLast4,
      permissions: doc.permissions,
      expiresAt: doc.expiresAt,
      lastUsedAt: doc.lastUsedAt,
      createdAt: doc.createdAt,
    };
  }
}
