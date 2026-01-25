/**
 * @togglebox/core - Hash Utilities
 *
 * Provides deterministic hashing for consistent user assignment
 * in feature flags and experiments.
 *
 * @remarks
 * The hash function uses a DJB2 algorithm with mixing steps
 * to ensure good distribution across the 0-100% range.
 */

/**
 * Hash a string using DJB2 algorithm with mixing.
 *
 * @param str - The string to hash
 * @returns An unsigned 32-bit integer hash value
 *
 * @remarks
 * This algorithm provides:
 * - Deterministic output (same input = same output)
 * - Good distribution across hash space
 * - Fast computation
 */
export function hashString(str: string): number {
  let hash = 5381;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }

  // Final mixing step for better distribution
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;

  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * Get a percentage (0.00-99.99) from a hash of key + userId.
 *
 * @param key - The flag key or experiment key
 * @param userId - The user identifier
 * @returns A percentage value between 0.00 and 99.99
 *
 * @remarks
 * The combination of key and userId ensures:
 * - Same user always gets same percentage for a given key
 * - Different keys have independent assignments
 * - Percentage is deterministic and reproducible
 *
 * @example
 * ```ts
 * const pct = getPercentage('dark-mode', 'user-123');
 * // Always returns the same value for this combination
 * ```
 */
export function getPercentage(key: string, userId: string): number {
  const combinedKey = `${key}:${userId}`;
  const hash = hashString(combinedKey);
  return (hash % 10000) / 100; // 0.00 to 99.99
}
