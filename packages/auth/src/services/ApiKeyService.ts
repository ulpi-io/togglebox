/**
 * API key service for programmatic authentication.
 *
 * @module services/ApiKeyService
 *
 * @remarks
 * Manages API key lifecycle:
 * - Creation with permission validation
 * - Verification for authentication
 * - Listing and revocation
 *
 * **Security:**
 * - Full keys NEVER stored (only bcrypt hashes)
 * - Keys shown ONLY at creation time
 * - Permissions scoped to user's role
 * - lastUsedAt tracking for monitoring
 */

import { IApiKeyRepository } from "../interfaces/IApiKeyRepository";
import { IUserRepository } from "../interfaces/IUserRepository";
import { ApiKey, ApiKeyWithPlaintext, PublicApiKey } from "../models/ApiKey";
import {
  generateApiKey,
  getApiKeyPrefix,
  getApiKeyLast4,
  hashApiKey,
} from "../utils/token";
import { userHasPermission } from "../models/User";
import { logger } from "@togglebox/shared";

/**
 * API key creation input data.
 */
export interface CreateApiKeyData {
  /** User who will own this API key */
  userId: string;

  /** Human-readable name (e.g., "Production API") */
  name: string;

  /** Permissions granted to this key */
  permissions: string[];

  /** Optional expiration date (null = never expires) */
  expiresAt?: Date | null;
}

/**
 * API key service configuration options.
 */
export interface ApiKeyServiceOptions {
  /**
   * Whether to validate that the user exists in the database before creating API keys.
   *
   * @remarks
   * Set to `false` when:
   * - Authentication is optional and users may not have DB records
   * - JWT users are managed externally (e.g., SSO)
   * - User creation is deferred until first API key creation
   *
   * @default true
   */
  validateUser?: boolean;

  /**
   * Whether to validate that the user has the requested permissions.
   *
   * @remarks
   * Set to `false` when:
   * - Permissions are managed externally
   * - All users should be able to create keys with any permissions
   *
   * @default true
   */
  validatePermissions?: boolean;
}

/**
 * API key service for managing API keys.
 *
 * @remarks
 * **Security:**
 * - Validates permissions against user's role (optional)
 * - Hashes keys with bcrypt before storage
 * - Updates lastUsedAt on verification
 * - Ownership verification for revocation
 */
export class ApiKeyService {
  private options: Required<ApiKeyServiceOptions>;

  constructor(
    private apiKeyRepository: IApiKeyRepository,
    private userRepository: IUserRepository,
    options?: ApiKeyServiceOptions,
  ) {
    // Set defaults for options
    this.options = {
      validateUser: options?.validateUser ?? true,
      validatePermissions: options?.validatePermissions ?? true,
    };
  }

  /**
   * Create a new API key with optional permission validation.
   *
   * @param data - API key data (userId, name, permissions, expiresAt)
   * @returns API key with plaintext key (ONLY shown once)
   * @throws {Error} 'User not found' if userId invalid (when validateUser is true)
   * @throws {Error} If user lacks requested permissions (when validatePermissions is true)
   *
   * @remarks
   * **CRITICAL:** Plaintext key returned ONLY at creation.
   * After this, only prefix + last4 are available for display.
   *
   * **Permission Validation:**
   * When `validatePermissions` is true (default), API key cannot have
   * permissions that user doesn't have.
   *
   * **User Validation:**
   * When `validateUser` is true (default), the user must exist in the database.
   * Set to false for scenarios where JWT users may not have DB records.
   */
  async createApiKey(data: CreateApiKeyData): Promise<ApiKeyWithPlaintext> {
    // Verify user exists (if validation enabled)
    if (this.options.validateUser) {
      const user = await this.userRepository.findById(data.userId);
      if (!user) {
        throw new Error("User not found");
      }

      // Validate permissions against user's role permissions (if enabled)
      if (this.options.validatePermissions) {
        const invalidPermissions = data.permissions.filter(
          (permission) => !userHasPermission(user, permission),
        );

        if (invalidPermissions.length > 0) {
          throw new Error(
            `User does not have the following permissions: ${invalidPermissions.join(", ")}`,
          );
        }
      }
    }

    // Generate API key
    const key = generateApiKey("live");
    // Use SHA-256 for deterministic hashing (required for GSI2 lookup)
    const keyHash = hashApiKey(key);
    const keyPrefix = getApiKeyPrefix(key);
    const keyLast4 = getApiKeyLast4(key);

    // Create API key in database
    const apiKey = await this.apiKeyRepository.create({
      userId: data.userId,
      name: data.name,
      keyHash,
      keyPrefix,
      keyLast4,
      permissions: data.permissions,
      expiresAt: data.expiresAt || null,
    });

    // Return API key with plaintext key (only shown once!)
    const { keyHash: _, userId: __, ...publicKey } = apiKey;
    return {
      ...publicKey,
      key, // Plain text key - only shown at creation
    };
  }

  /**
   * List all API keys for a user.
   *
   * @param userId - User unique identifier
   * @returns Array of public API keys (excludes keyHash)
   */
  async listApiKeys(userId: string): Promise<PublicApiKey[]> {
    return this.apiKeyRepository.listByUser(userId);
  }

  /**
   * Get API key by unique ID.
   *
   * @param id - API key unique identifier
   * @returns Public API key or null if not found
   *
   * @deprecated Use {@link getApiKeyForUser} instead for ownership verification
   */
  async getApiKeyById(id: string): Promise<PublicApiKey | null> {
    const apiKey = await this.apiKeyRepository.findById(id);
    if (!apiKey) {
      return null;
    }

    // Convert to PublicApiKey
    const { keyHash, userId, ...publicKey } = apiKey;
    return publicKey;
  }

  /**
   * Get API key by unique ID with ownership verification.
   *
   * @param id - API key unique identifier
   * @param userId - User who must own the key
   * @returns Public API key or null if not found or not owned by user
   *
   * @remarks
   * **Security:** Returns null if the key exists but belongs to another user.
   * This prevents information leakage about other users' API keys.
   */
  async getApiKeyForUser(
    id: string,
    userId: string,
  ): Promise<PublicApiKey | null> {
    const apiKey = await this.apiKeyRepository.findById(id);
    if (!apiKey) {
      return null;
    }

    // Ownership verification - return null if key belongs to another user
    if (apiKey.userId !== userId) {
      return null;
    }

    // Convert to PublicApiKey (exclude sensitive fields)
    const { keyHash, userId: _, ...publicKey } = apiKey;
    return publicKey;
  }

  /**
   * Verify API key for authentication.
   *
   * @param key - Full plaintext API key
   * @returns API key with metadata or null if invalid/expired
   *
   * @remarks
   * **Process:**
   * 1. Hash provided key
   * 2. Find by keyHash in database
   * 3. Check expiration
   * 4. Update lastUsedAt (async, non-blocking)
   *
   * Used by authentication middleware.
   */
  async verifyApiKey(key: string): Promise<ApiKey | null> {
    // Use SHA-256 for deterministic hashing (required for GSI2 lookup)
    const keyHash = hashApiKey(key);

    // Find API key by hash
    const apiKey = await this.apiKeyRepository.findByKeyHash(keyHash);
    if (!apiKey) {
      return null;
    }

    // Check if key is expired
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    // Update lastUsedAt timestamp (async, don't await)
    this.apiKeyRepository
      .update(apiKey.id, {
        lastUsedAt: new Date(),
      })
      .catch((err) => {
        logger.error("Failed to update API key lastUsedAt", err);
      });

    return apiKey;
  }

  /**
   * Revoke (delete) an API key.
   *
   * @param id - API key unique identifier
   * @param userId - User who owns the key
   * @throws {Error} 'API key not found'
   * @throws {Error} 'You do not have permission to revoke this API key'
   *
   * @remarks
   * **Ownership Verification:** Only the owner can revoke the key.
   */
  async revokeApiKey(id: string, userId: string): Promise<void> {
    // Verify the key belongs to the user
    const apiKey = await this.apiKeyRepository.findById(id);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    if (apiKey.userId !== userId) {
      throw new Error("You do not have permission to revoke this API key");
    }

    // Delete the API key
    await this.apiKeyRepository.delete(id);
  }

  /**
   * Revoke all API keys for a user.
   *
   * @param userId - User unique identifier
   *
   * @remarks
   * Used when:
   * - User account is deleted
   * - Security breach requires revoking all access
   */
  async revokeAllApiKeys(userId: string): Promise<void> {
    await this.apiKeyRepository.deleteByUser(userId);
  }
}
