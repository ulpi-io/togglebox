/**
 * Browser-side API client for making authenticated requests from client components.
 *
 * @module lib/api/browser-client
 *
 * @remarks
 * **Client-Side Only:** This module reads cookies from document.cookie and can be used in client components.
 *
 * For server-side API calls (Server Components, Server Actions), use `@/lib/api/client` instead.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: string[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Get auth token from cookie (client-side).
 *
 * @returns JWT token or null if not found
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const match = document.cookie.match(/(?:^|; )auth-token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Clear auth token and redirect to login page.
 * Called when API returns 401 Unauthorized.
 */
function handleUnauthorized(): void {
  if (typeof window === "undefined") {
    return;
  }

  // Clear the auth token cookie
  document.cookie =
    "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  // Redirect to login page (avoid redirect loop if already on login)
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}

/**
 * Browser-side API client for making authenticated requests.
 *
 * @template T - Expected response data type
 * @param endpoint - API endpoint path (e.g., '/api/v1/platforms')
 * @param options - Fetch options (method, headers, body, etc.)
 * @returns Promise resolving to typed response data
 *
 * @throws {@link ApiError} If request fails or returns non-2xx status
 *
 * @example
 * ```typescript
 * 'use client';
 *
 * import { browserApiClient } from '@/lib/api/browser-client';
 *
 * // GET request
 * const platforms = await browserApiClient<Platform[]>('/api/v1/platforms');
 *
 * // POST request
 * const platform = await browserApiClient<Platform>('/api/v1/internal/platforms', {
 *   method: 'POST',
 *   body: JSON.stringify({ name: 'web', description: 'Web platform' })
 * });
 * ```
 */
export async function browserApiClient<T>(
  endpoint: string,
  options: RequestInit & { signal?: AbortSignal } = {},
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;

  // Fail fast in production if API URL is not configured
  if (!baseUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new ApiError(500, "NEXT_PUBLIC_API_URL is required in production");
    }
    // Fall back to localhost only in development
  }

  const apiUrl = baseUrl || "http://localhost:3000";
  const token = getAuthToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Add existing headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === "string") {
        headers[key] = value;
      }
    });
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${apiUrl}${endpoint}`, {
    ...options,
    headers,
    // Bypass browser cache to ensure fresh data
    cache: "no-store",
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - immediately log out and redirect to login
    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiError(401, "Session expired. Redirecting to login...");
    }

    // Check Content-Type to determine how to parse the error
    const contentType = response.headers.get("content-type") || "";
    let errorMessage = `HTTP ${response.status}`;
    let errorDetails: string[] = [];

    try {
      if (contentType.includes("application/json")) {
        // JSON response - parse structured error
        const error = await response.json();
        errorMessage = error.error || error.message || errorMessage;
        errorDetails = error.details || [];
      } else {
        // Non-JSON response (plain text, HTML, etc.) - extract text for debugging
        const text = await response.text();
        if (text && text.length > 0 && text.length < 500) {
          // Include short error messages (< 500 chars) for debugging
          errorMessage = `${errorMessage}: ${text.slice(0, 200)}`;
        } else if (text && text.length >= 500) {
          // Long responses (HTML pages, etc.) - just indicate the type
          errorMessage = `${errorMessage} (${contentType || "unknown"} response)`;
        }
      }
    } catch (parseError) {
      // Parsing failed - use generic error with status
      errorMessage = `HTTP ${response.status} (failed to parse response)`;
    }

    throw new ApiError(response.status, errorMessage, errorDetails);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json();
  return data.data as T;
}
