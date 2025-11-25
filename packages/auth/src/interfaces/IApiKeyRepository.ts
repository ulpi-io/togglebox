/**
 * API Key repository interface for authentication system.
 *
 * @remarks
 * Defines the contract for API key operations across all database adapters.
 * API keys are hashed for security and include metadata for tracking and permissions.
 */

import type { ApiKey, PublicApiKey } from '../models/ApiKey';

/**
 * API Key creation data for repository (includes computed security fields).
 *
 * @remarks
 * This interface includes pre-computed security fields that are generated
 * by the service layer before repository storage:
 * - **keyHash**: SHA-256 hash of the full API key (for secure lookup)
 * - **keyPrefix**: First 8 characters of key (for display: "ak_12345...")
 * - **keyLast4**: Last 4 characters of key (for identification)
 */
export interface CreateApiKeyRepositoryData {
  userId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
  permissions: string[];
  expiresAt: Date | null;
}

/**
 * API Key repository interface.
 *
 * @remarks
 * All database adapters (Prisma, DynamoDB, MongoDB) must implement this interface.
 *
 * **Security Model:**
 * - Full API keys are NEVER stored (only hashed values)
 * - Authentication uses keyHash lookup
 * - Display uses keyPrefix and keyLast4
 *
 * **Key Operations:**
 * - Create/read/update/delete API keys
 * - Hash-based authentication lookup
 * - User-scoped key management
 */
export interface IApiKeyRepository {
  /**
   * Creates a new API key with hashed value.
   *
   * @param data - API key data with pre-computed hash and display fields
   * @returns Created API key with generated ID and timestamps
   *
   * @remarks
   * The full API key value is NOT stored - only the hash, prefix, and last4.
   */
  create(data: CreateApiKeyRepositoryData): Promise<ApiKey>;

  /**
   * Finds API key by unique ID.
   *
   * @returns API key if found, null otherwise
   */
  findById(id: string): Promise<ApiKey | null>;

  /**
   * Finds API key by hashed value (for authentication).
   *
   * @param keyHash - SHA-256 hash of the full API key
   * @returns API key if found and valid, null otherwise
   *
   * @remarks
   * Used during API authentication to verify the provided key.
   */
  findByKeyHash(keyHash: string): Promise<ApiKey | null>;

  /**
   * Lists all API keys for a user (public view without sensitive data).
   *
   * @param userId - User ID
   * @returns Array of public API keys (excludes keyHash)
   *
   * @remarks
   * Returns PublicApiKey objects that exclude the keyHash for security.
   */
  listByUser(userId: string): Promise<PublicApiKey[]>;

  /**
   * Updates API key metadata.
   *
   * @param id - API key ID
   * @param data - Partial API key data to update
   * @returns Updated API key
   *
   * @remarks
   * Commonly used to update `lastUsedAt` timestamp during authentication.
   */
  update(id: string, data: Partial<ApiKey>): Promise<ApiKey>;

  /**
   * Deletes/revokes an API key.
   *
   * @param id - API key ID
   *
   * @remarks
   * Permanently deletes the API key. Use this for explicit revocation.
   */
  delete(id: string): Promise<void>;

  /**
   * Deletes all API keys for a user.
   *
   * @param userId - User ID
   *
   * @remarks
   * Used when deleting a user account or revoking all access.
   */
  deleteByUser(userId: string): Promise<void>;
}
