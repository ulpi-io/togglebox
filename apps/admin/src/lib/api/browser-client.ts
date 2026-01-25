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
    public details?: string[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get auth token from cookie (client-side).
 *
 * @returns JWT token or null if not found
 */
function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    console.warn('[browserApiClient] Running on server - no document.cookie available');
    return null;
  }

  const match = document.cookie.match(/(?:^|; )auth-token=([^;]*)/);
  const token = match ? decodeURIComponent(match[1]) : null;

  if (!token) {
    console.warn('[browserApiClient] No auth-token cookie found. Cookies:', document.cookie.slice(0, 100));
  }

  return token;
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
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const token = getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add existing headers from options
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[browserApiClient] Adding auth token to request');
  } else {
    console.warn('[browserApiClient] No auth token - request will be unauthenticated');
  }

  console.log(`[browserApiClient] ${options.method || 'GET'} ${baseUrl}${endpoint}`);

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
    // Bypass browser cache to ensure fresh data
    cache: 'no-store',
  });

  if (!response.ok) {
    // Check Content-Type to determine how to parse the error
    const contentType = response.headers.get('content-type') || '';
    let errorMessage = `HTTP ${response.status}`;
    let errorDetails: string[] = [];

    try {
      if (contentType.includes('application/json')) {
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
          errorMessage = `${errorMessage} (${contentType || 'unknown'} response)`;
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
