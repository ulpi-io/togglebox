/**
 * Pagination utility for standardizing pagination across all list endpoints
 *
 * @remarks
 * Provides consistent pagination interface with sensible defaults:
 * - Default page size: 20 items
 * - Maximum page size: 100 items
 * - 1-based page numbering (page=1 is first page)
 *
 * Supports two pagination styles:
 * 1. Page-based: ?page=1&perPage=20
 * 2. Offset-based: ?limit=20&offset=0
 */

import { Request } from "express";

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  /** Page number (1-based) */
  page: number;
  /** Items per page */
  perPage: number;
  /** Database offset (0-based) */
  offset: number;
  /** Database limit */
  limit: number;
}

/**
 * Pagination metadata for response
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  perPage: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there's a next page */
  hasNext: boolean;
  /** Whether there's a previous page */
  hasPrev: boolean;
}

/**
 * Default pagination configuration
 */
export const PAGINATION_DEFAULTS = {
  /** Default items per page */
  DEFAULT_PER_PAGE: 20,
  /** Maximum items per page */
  MAX_PER_PAGE: 100,
  /** Minimum items per page */
  MIN_PER_PAGE: 1,
} as const;

/**
 * Safely parse a value to a positive integer with fallback
 *
 * @param value - Value to parse (typically from query string)
 * @param fallback - Default value if parsing fails or result is invalid
 * @returns Parsed integer or fallback value
 */
function toPositiveInt(value: unknown, fallback: number): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  const n = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * Parse and validate pagination parameters from request
 *
 * @param req - Express request object
 * @returns Validated pagination parameters
 *
 * @example
 * ```typescript
 * // Page-based pagination
 * const params = getPaginationParams(req); // ?page=2&perPage=50
 * // Returns: { page: 2, perPage: 50, offset: 50, limit: 50 }
 *
 * // Offset-based pagination
 * const params = getPaginationParams(req); // ?limit=25&offset=100
 * // Returns: { page: 5, perPage: 25, offset: 100, limit: 25 }
 * ```
 */
export function getPaginationParams(req: Request): PaginationParams {
  const { page, perPage, limit, offset } = req.query;

  // Parse parameters with defaults
  let pageNum: number = 1;
  let perPageNum: number = PAGINATION_DEFAULTS.DEFAULT_PER_PAGE;
  let offsetNum: number = 0;

  // Support offset-based pagination (limit + offset)
  if (limit !== undefined || offset !== undefined) {
    const limitNum = toPositiveInt(limit, PAGINATION_DEFAULTS.DEFAULT_PER_PAGE);
    offsetNum = toPositiveInt(offset, 0);

    // Validate limit (clamp to allowed range)
    perPageNum = Math.max(
      PAGINATION_DEFAULTS.MIN_PER_PAGE,
      Math.min(limitNum, PAGINATION_DEFAULTS.MAX_PER_PAGE),
    );

    // Calculate page from offset
    pageNum = Math.floor(offsetNum / perPageNum) + 1;
  }
  // Support page-based pagination (page + perPage)
  else {
    const pageNumRaw = toPositiveInt(page, 1);
    const perPageNumRaw = toPositiveInt(
      perPage,
      PAGINATION_DEFAULTS.DEFAULT_PER_PAGE,
    );

    // Validate page (minimum 1)
    pageNum = Math.max(1, pageNumRaw);

    // Validate perPage (clamp to allowed range)
    perPageNum = Math.max(
      PAGINATION_DEFAULTS.MIN_PER_PAGE,
      Math.min(perPageNumRaw, PAGINATION_DEFAULTS.MAX_PER_PAGE),
    );

    // Calculate offset
    offsetNum = (pageNum - 1) * perPageNum;
  }

  return {
    page: pageNum,
    perPage: perPageNum,
    offset: offsetNum,
    limit: perPageNum,
  };
}

/**
 * Create pagination metadata for response
 *
 * @param page - Current page number (1-based)
 * @param perPage - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 *
 * @example
 * ```typescript
 * const meta = createPaginationMeta(2, 20, 150);
 * // Returns:
 * // {
 * //   page: 2,
 * //   perPage: 20,
 * //   total: 150,
 * //   totalPages: 8,
 * //   hasNext: true,
 * //   hasPrev: true
 * // }
 * ```
 */
export function createPaginationMeta(
  page: number,
  perPage: number,
  total: number,
): PaginationMeta {
  const totalPages = Math.ceil(total / perPage);

  return {
    page,
    perPage,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Convert query parameters to offset-based pagination params
 *
 * @param req - Express request object
 * @returns Offset pagination parameters for SQL/MongoDB databases
 *
 * @example
 * ```typescript
 * const params = getOffsetPaginationParams(req);
 * const result = await repository.listItems(params);
 * ```
 */
export function getOffsetPaginationParams(req: Request): {
  offset: number;
  limit: number;
} {
  const pagination = getPaginationParams(req);
  return {
    offset: pagination.offset,
    limit: pagination.limit,
  };
}

/**
 * Check if pagination was explicitly requested in query params
 *
 * @param req - Express request object
 * @returns true if any pagination param is present, false otherwise
 *
 * @example
 * ```typescript
 * if (isPaginationRequested(req)) {
 *   // Return paginated results
 * } else {
 *   // Return ALL items
 * }
 * ```
 */
export function isPaginationRequested(req: Request): boolean {
  const { page, perPage, limit, offset, nextToken } = req.query;
  return !!(page || perPage || limit || offset || nextToken);
}

/**
 * Convert query parameters to token-based pagination params
 *
 * @param req - Express request object
 * @returns Token pagination parameters for DynamoDB, or undefined if no pagination requested
 *
 * @example
 * ```typescript
 * const params = getTokenPaginationParams(req);
 * if (params) {
 *   // Paginated request
 *   const result = await repository.listItems(params);
 * } else {
 *   // Fetch ALL items
 *   const result = await repository.listAllItems();
 * }
 * ```
 */
export function getTokenPaginationParams(
  req: Request,
): { limit: number; nextToken?: string } | undefined {
  if (!isPaginationRequested(req)) {
    return undefined;
  }

  const pagination = getPaginationParams(req);
  const nextToken = req.query["nextToken"] as string | undefined;

  return {
    limit: pagination.limit,
    nextToken,
  };
}

/**
 * Check if the request uses token-based pagination (nextToken present)
 *
 * @param req - Express request object
 * @returns true if nextToken is present in query params
 */
export function isTokenPagination(req: Request): boolean {
  return typeof req.query["nextToken"] === "string";
}

/**
 * Get pagination parameters appropriate for the backend type
 *
 * @param req - Express request object
 * @returns Object with either offset-based or token-based pagination params
 *
 * @example
 * ```typescript
 * const { isToken, params, page, perPage } = getSmartPaginationParams(req);
 * if (isToken) {
 *   // Use token-based pagination (DynamoDB)
 *   const result = await repository.list({ limit: params.limit, nextToken: params.nextToken });
 * } else {
 *   // Use offset-based pagination (SQL/MongoDB)
 *   const result = await repository.list({ limit: params.limit, offset: params.offset });
 *   const meta = createPaginationMeta(page, perPage, result.total);
 * }
 * ```
 */
export function getSmartPaginationParams(req: Request): {
  isToken: boolean;
  params: { limit: number; offset?: number; nextToken?: string };
  page: number;
  perPage: number;
} {
  const pagination = getPaginationParams(req);
  const nextToken = req.query["nextToken"] as string | undefined;
  const isToken = typeof nextToken === "string";

  return {
    isToken,
    params: {
      limit: pagination.limit,
      offset: isToken ? undefined : pagination.offset,
      nextToken: isToken ? nextToken : undefined,
    },
    page: pagination.page,
    perPage: pagination.perPage,
  };
}
