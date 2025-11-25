import { IApiKeyRepository, CreateApiKeyRepositoryData } from '../../interfaces/IApiKeyRepository';
import { ApiKey, PublicApiKey } from '../../models/ApiKey';
import * as apiKeyService from './apiKeyService';

/**
 * DynamoDB implementation of API key repository.
 *
 * @implements {IApiKeyRepository}
 *
 * @remarks
 * **Delegation Pattern:**
 * This class delegates to {@link apiKeyService} module for actual implementation.
 * Provides clean interface while keeping business logic separate.
 *
 * **Single-Table Design:**
 * - Primary Key: `PK: APIKEY#<id>`, `SK: APIKEY#<id>`
 * - GSI1: `GSI1PK: USER#<userId>`, `GSI1SK: APIKEY#<createdAt>` (for user's keys)
 * - GSI2: `GSI2PK: APIKEY_HASH#<keyHash>`, `GSI2SK: APIKEY#<id>` (for authentication)
 *
 * **Access Patterns:**
 * 1. Find by ID: Direct PK lookup (consistent read)
 * 2. Find by hash: GSI2 query (for API key authentication)
 * 3. List by user: GSI1 query sorted by creation date
 *
 * **Security:**
 * - Stores hashed keys only (SHA-256 or bcrypt)
 * - Permissions array stored as native DynamoDB list
 * - Optional expiration with `expiresAt` timestamp
 *
 * **Manual Cascade:**
 * `deleteByUser()` performs manual cascade delete by querying and batch deleting.
 * Not automatically triggered when user is deleted.
 *
 * @example
 * ```typescript
 * const repo = new DynamoDBApiKeyRepository();
 * const key = await repo.findByKeyHash(hashedKey);
 * ```
 */
export class DynamoDBApiKeyRepository implements IApiKeyRepository {
  async create(data: CreateApiKeyRepositoryData): Promise<ApiKey> {
    return apiKeyService.createApiKey(data);
  }

  async findById(id: string): Promise<ApiKey | null> {
    return apiKeyService.findApiKeyById(id);
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    return apiKeyService.findApiKeyByKeyHash(keyHash);
  }

  async listByUser(userId: string): Promise<PublicApiKey[]> {
    return apiKeyService.listApiKeysByUser(userId);
  }

  async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    return apiKeyService.updateApiKey(id, data);
  }

  async delete(id: string): Promise<void> {
    return apiKeyService.deleteApiKey(id);
  }

  async deleteByUser(userId: string): Promise<void> {
    return apiKeyService.deleteApiKeysByUser(userId);
  }
}
