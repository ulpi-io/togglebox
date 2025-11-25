import { cookies } from 'next/headers';

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

async function getAuthToken() {
  try {
    const cookieStore = await cookies();
    return cookieStore.get('auth-token')?.value;
  } catch {
    return null;
  }
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = process.env.API_URL || 'http://localhost:3000';
  const token = await getAuthToken();

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
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
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
          errorMessage = `${errorMessage}: ${text.substring(0, 200)}`;
        } else if (text && text.length >= 500) {
          // Long responses (HTML pages, etc.) - just indicate the type
          errorMessage = `${errorMessage} (${contentType || 'unknown'} response)`;
        }
      }
    } catch (parseError) {
      // Parsing failed - use generic error with status
      errorMessage = `HTTP ${response.status} (failed to parse response)`;
    }

    throw new ApiError(
      response.status,
      errorMessage,
      errorDetails
    );
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return null as T;
  }

  const data = await response.json();
  return data.data as T;
}
