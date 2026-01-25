import { NetworkError } from './errors'
import type { RetryOptions } from './types'

/**
 * HTTP client with retry logic
 */
export class HttpClient {
  private baseUrl: string
  private fetchImpl: typeof fetch
  private apiKey?: string
  private retryOptions: RetryOptions = {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
  }

  constructor(baseUrl: string, fetchImpl?: typeof fetch, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.fetchImpl = fetchImpl || (typeof fetch !== 'undefined' ? fetch : this.throwFetchError)
    this.apiKey = apiKey
  }

  private throwFetchError(): never {
    throw new Error('fetch is not available. Please provide a fetch implementation.')
  }

  /**
   * Get common headers including API key if configured
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey
    }

    return headers
  }

  /**
   * Make HTTP GET request with retry logic
   */
  async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: this.getHeaders(),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new NetworkError(
            `HTTP ${response.status}: ${errorText || response.statusText}`,
            response.status
          )
        }

        const data = await response.json()
        return data as T
      } catch (error) {
        lastError = error as Error

        // Don't retry on 4xx errors (client errors)
        if (error instanceof NetworkError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error
        }

        // Retry on network errors and 5xx errors
        if (attempt < this.retryOptions.maxRetries) {
          const delay = Math.min(
            this.retryOptions.initialDelay * Math.pow(2, attempt),
            this.retryOptions.maxDelay
          )
          await this.sleep(delay)
          continue
        }
      }
    }

    throw lastError || new NetworkError('Request failed after retries')
  }

  /**
   * Make HTTP POST request with retry logic
   */
  async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryOptions.maxRetries; attempt++) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new NetworkError(
            `HTTP ${response.status}: ${errorText || response.statusText}`,
            response.status
          )
        }

        const data = await response.json()
        return data as T
      } catch (error) {
        lastError = error as Error

        // Don't retry on 4xx errors (client errors)
        if (error instanceof NetworkError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          throw error
        }

        // Retry on network errors and 5xx errors
        if (attempt < this.retryOptions.maxRetries) {
          const delay = Math.min(
            this.retryOptions.initialDelay * Math.pow(2, attempt),
            this.retryOptions.maxDelay
          )
          await this.sleep(delay)
          continue
        }
      }
    }

    throw lastError || new NetworkError('Request failed after retries')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
