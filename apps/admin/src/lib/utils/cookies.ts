/**
 * Cookie utility functions for consistent cookie management across the application.
 *
 * @module lib/utils/cookies
 */

/**
 * Set a cookie with consistent attributes.
 *
 * @param name - Cookie name
 * @param value - Cookie value (will be URL-encoded)
 * @param days - Number of days until expiration (default: 7)
 */
export function setCookie(name: string, value: string, days: number = 7): void {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  const maxAge = days * 86400; // Convert days to seconds
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; max-age=${maxAge}; path=/; SameSite=Lax`;
}

/**
 * Delete a cookie by setting it to expire immediately.
 * Tries multiple domain combinations to ensure removal.
 *
 * @param name - Cookie name to delete
 */
export function deleteCookie(name: string): void {
  // Delete cookie with multiple combinations to ensure removal
  // This handles cases where the cookie might have been set with different domain attributes
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0; domain=${window.location.hostname}`;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; max-age=0; domain=.${window.location.hostname}`;
}

/**
 * Get a cookie value by name.
 *
 * @param name - Cookie name
 * @returns Cookie value (URL-decoded) or null if not found
 */
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
