/**
 * API Key model and security utilities for programmatic access.
 *
 * @module models/ApiKey
 *
 * @remarks
 * Provides secure API key management for programmatic access to Togglebox.
 *
 * **Security Model:**
 * - Full API keys are NEVER stored (only SHA-256 hashed values)
 * - Keys are shown in plaintext ONLY at creation time
 * - Display uses prefix (first 8 chars) and last4 for identification
 * - Keys can have expiration dates and granular permissions
 *
 * **Key Format:**
 * - Prefix: `tbx_live_` or `tbx_test_` (first 8 characters)
 * - Full key: 32+ character random string
 * - Display: `tbx_live_****1234` (prefix + **** + last4)
 */

/**
 * API Key entity with hashed value and metadata.
 *
 * @remarks
 * **Security:**
 * - `keyHash` is SHA-256 hash of full key (used for authentication)
 * - `keyPrefix` and `keyLast4` for display only (NOT for authentication)
 * - Full key is NEVER stored (only returned at creation via {@link ApiKeyWithPlaintext})
 *
 * **Permissions:**
 * - Scoped to specific resources (config, cache, etc.)
 * - Checked via {@link apiKeyHasPermission} helper
 */
export interface ApiKey {
  /** Unique API key identifier (UUID) */
  id: string;

  /** User who owns this API key */
  userId: string;

  /** Human-readable name for the key (e.g., "Production App", "Development") */
  name: string;

  /** SHA-256 hashed API key value (never expose in responses) */
  keyHash: string;

  /** First 8 characters of the key for display (e.g., "tbx_live") */
  keyPrefix: string;

  /** Last 4 characters of the key for identification */
  keyLast4: string;

  /** Permissions granted to this API key (e.g., ["config:read", "config:write"]) */
  permissions: string[];

  /** Optional expiration date (null = never expires) */
  expiresAt: Date | null;

  /** Last time this key was used (updated on each authentication) */
  lastUsedAt: Date | null;

  /** Timestamp when key was created */
  createdAt: Date;
}

/**
 * API Key data for creation (before hashing).
 *
 * @remarks
 * Excludes auto-generated fields: `id`, `keyHash`, `keyPrefix`, `keyLast4`, `lastUsedAt`, `createdAt`.
 * These are computed by the service layer before passing to repository.
 *
 * The `key` field contains the plaintext API key that will be:
 * 1. Hashed with SHA-256 to create `keyHash`
 * 2. Truncated to create `keyPrefix` (first 8 chars) and `keyLast4`
 */
export type CreateApiKeyData = Omit<
  ApiKey,
  'id' | 'keyHash' | 'keyPrefix' | 'keyLast4' | 'lastUsedAt' | 'createdAt'
> & {
  /** Plain text key to be hashed (only available before storage) */
  key: string;
};

/**
 * Public API key data (safe to return in API responses).
 *
 * @remarks
 * **Security:** Excludes `keyHash` and `userId` to prevent:
 * - Hash exposure (could enable rainbow table attacks)
 * - User enumeration
 *
 * Use this type for list API responses.
 */
export type PublicApiKey = Omit<ApiKey, 'keyHash' | 'userId'>;

/**
 * API key with the plain text key (only returned once at creation).
 *
 * @remarks
 * **CRITICAL SECURITY:**
 * - This type is ONLY used in the create API response
 * - The `key` field contains the full plaintext API key
 * - This is the ONLY time the user sees the full key
 * - After creation, only `keyPrefix` and `keyLast4` are available
 *
 * Users must save this key securely as it cannot be recovered.
 */
export type ApiKeyWithPlaintext = PublicApiKey & {
  /** Plain text key - ONLY shown at creation time, cannot be recovered later */
  key: string;
};

/**
 * Generate API key prefix from full key.
 *
 * @param key - Full plaintext API key
 * @returns First 8 characters for display (e.g., "tbx_live")
 *
 * @remarks
 * Used for display purposes only, NOT for authentication.
 *
 * @example
 * ```typescript
 * getKeyPrefix('tbx_live_abc123def456'); // 'tbx_live'
 * ```
 */
export function getKeyPrefix(key: string): string {
  return key.substring(0, 8);
}

/**
 * Generate last 4 characters from full key.
 *
 * @param key - Full plaintext API key
 * @returns Last 4 characters for identification (e.g., "1234")
 *
 * @remarks
 * Used for display purposes only, NOT for authentication.
 *
 * @example
 * ```typescript
 * getKeyLast4('tbx_live_abc123def456'); // 'f456'
 * ```
 */
export function getKeyLast4(key: string): string {
  return key.substring(key.length - 4);
}

/**
 * Format API key for display in UI.
 *
 * @param apiKey - Public API key data
 * @returns Formatted key string for safe display
 *
 * @remarks
 * Combines prefix and last4 with asterisks for secure display.
 *
 * @example
 * ```typescript
 * const apiKey: PublicApiKey = {
 *   keyPrefix: 'tbx_live',
 *   keyLast4: '1234',
 *   // ...
 * };
 * formatKeyForDisplay(apiKey); // 'tbx_live****1234'
 * ```
 */
export function formatKeyForDisplay(apiKey: PublicApiKey): string {
  return `${apiKey.keyPrefix}****${apiKey.keyLast4}`;
}

/**
 * Check if an API key is expired.
 *
 * @param apiKey - API key to check
 * @returns true if key is expired, false otherwise
 *
 * @remarks
 * Keys with `expiresAt = null` never expire.
 *
 * @example
 * ```typescript
 * const expiredKey: ApiKey = {
 *   expiresAt: new Date('2024-01-01'),
 *   // ...
 * };
 * isApiKeyExpired(expiredKey); // true (if current date is after 2024-01-01)
 *
 * const permanentKey: ApiKey = {
 *   expiresAt: null,
 *   // ...
 * };
 * isApiKeyExpired(permanentKey); // false (never expires)
 * ```
 */
export function isApiKeyExpired(apiKey: ApiKey): boolean {
  if (!apiKey.expiresAt) {
    return false;
  }
  return new Date() > new Date(apiKey.expiresAt);
}

/**
 * Check if API key has a specific permission.
 *
 * @param apiKey - API key to check
 * @param permission - Permission string in format `resource:action`
 * @returns true if key has the permission
 *
 * @remarks
 * Permissions are defined as string array in API key.
 * Common permissions: `config:read`, `config:write`, `cache:invalidate`.
 *
 * @example
 * ```typescript
 * const apiKey: ApiKey = {
 *   permissions: ['config:read', 'config:write'],
 *   // ...
 * };
 * apiKeyHasPermission(apiKey, 'config:read'); // true
 * apiKeyHasPermission(apiKey, 'user:manage'); // false
 * ```
 */
export function apiKeyHasPermission(apiKey: ApiKey, permission: string): boolean {
  return apiKey.permissions.includes(permission);
}
