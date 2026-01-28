/**
 * Pagination interfaces for multi-database pagination strategies.
 *
 * @module IPagination
 *
 * @remarks
 * This module provides two pagination strategies to support different database types:
 *
 * **Offset-Based Pagination:**
 * Traditional pagination using offset and limit (SQL databases, MongoDB).
 * - **Pros**: Total count available, can jump to any page, familiar pattern
 * - **Cons**: Performance degrades with large offsets, inconsistent if data changes
 * - **Use with**: MySQL, PostgreSQL, SQLite (via Prisma), MongoDB (via Mongoose)
 *
 * **Token-Based Pagination:**
 * Cursor-based pagination using continuation tokens (DynamoDB, modern APIs).
 * - **Pros**: Consistent performance, works with large datasets, handles concurrent updates
 * - **Cons**: Can't jump to arbitrary page, no total count (expensive to calculate)
 * - **Use with**: DynamoDB, Cloudflare D1 (optional), modern REST APIs
 *
 * **Database-Specific Behavior:**
 * - **SQL (Prisma)**: Uses offset/limit with LIMIT and OFFSET clauses
 * - **MongoDB (Mongoose)**: Uses skip/limit with .skip() and .limit()
 * - **DynamoDB**: Uses ExclusiveStartKey/LastEvaluatedKey (token-based)
 * - **Cloudflare D1**: Supports both offset and token (depending on use case)
 *
 * @example
 * ```ts
 * // Offset-based pagination (SQL, MongoDB)
 * const offsetParams: OffsetPaginationParams = {
 *   offset: 0,  // Skip 0 records (first page)
 *   limit: 20,  // Return up to 20 records
 * };
 * const offsetResult: OffsetPaginatedResult<Platform> = await prismaRepo.listPlatforms(offsetParams);
 * console.log(offsetResult.total); // Total count for calculating pages
 * console.log(offsetResult.items.length); // Up to 20 items
 *
 * // Token-based pagination (DynamoDB)
 * const tokenParams: TokenPaginationParams = {
 *   limit: 20,
 *   nextToken: undefined, // First page
 * };
 * const tokenResult: TokenPaginatedResult<Platform> = await dynamoRepo.listPlatforms(tokenParams);
 * console.log(tokenResult.nextToken); // Token for next page (or undefined)
 * console.log(tokenResult.total); // May be undefined (expensive for DynamoDB)
 * ```
 */

/**
 * Pagination parameters for offset-based databases (SQL, MongoDB).
 *
 * @remarks
 * **Offset-Based Pagination:**
 * Traditional pagination where you specify how many records to skip (`offset`)
 * and how many to return (`limit`). Similar to SQL's `LIMIT` and `OFFSET`.
 *
 * **Calculation:**
 * - Page 1: `offset = 0, limit = 20` (skip 0, return 20)
 * - Page 2: `offset = 20, limit = 20` (skip 20, return next 20)
 * - Page N: `offset = (page - 1) * limit, limit = 20`
 *
 * **Performance Considerations:**
 * - Small offsets (< 1000): Fast, efficient
 * - Large offsets (> 10,000): Slow, database must scan and skip many rows
 * - Very large offsets (> 100,000): Consider token-based pagination instead
 *
 * **Consistency Issues:**
 * If data changes between page requests, users may see duplicates or miss items.
 * For example, if a record is deleted after page 1, all subsequent offsets shift.
 *
 * @example
 * ```ts
 * // First page (20 items)
 * const page1: OffsetPaginationParams = { offset: 0, limit: 20 };
 * const result1 = await repo.listPlatforms(page1);
 *
 * // Second page (next 20 items)
 * const page2: OffsetPaginationParams = { offset: 20, limit: 20 };
 * const result2 = await repo.listPlatforms(page2);
 *
 * // Calculate total pages
 * const totalPages = Math.ceil(result1.total / 20);
 * console.log(`Total pages: ${totalPages}`);
 *
 * // Jump to specific page
 * const pageNumber = 5;
 * const page5: OffsetPaginationParams = {
 *   offset: (pageNumber - 1) * 20,
 *   limit: 20,
 * };
 * const result5 = await repo.listPlatforms(page5);
 * ```
 */
export interface OffsetPaginationParams {
  /** Number of records to skip (0-based, page 1 = 0, page 2 = limit, etc.) */
  offset: number;
  /** Maximum number of records to return (typically 10-100) */
  limit: number;
}

/**
 * Pagination parameters for token-based databases (DynamoDB, modern APIs).
 *
 * @remarks
 * **Token-Based Pagination (Cursor Pagination):**
 * Modern pagination where you use an opaque continuation token to fetch the next page.
 * No concept of offset or page number - only "next page" via token.
 *
 * **How It Works:**
 * 1. First request: No token (or `nextToken: undefined`)
 * 2. Response includes a `nextToken` if more pages exist
 * 3. Subsequent requests: Pass the `nextToken` from the previous response
 * 4. Repeat until `nextToken` is undefined (no more pages)
 *
 * **Benefits:**
 * - **Consistent**: Each token represents an exact position, unaffected by concurrent updates
 * - **Performance**: Same speed regardless of position (no large offset scan)
 * - **Scalable**: Works efficiently with millions/billions of records
 *
 * **Limitations:**
 * - **No random access**: Can't jump to page 5 directly, must paginate sequentially
 * - **No total count**: Total is expensive to calculate (requires separate query)
 * - **Opaque tokens**: Tokens are base64-encoded internal state, not user-friendly
 *
 * **DynamoDB Implementation:**
 * Token is base64-encoded JSON of DynamoDB's `LastEvaluatedKey`.
 * Contains the primary key and sort key of the last item on the page.
 *
 * @example
 * ```ts
 * // First page (no token)
 * const page1: TokenPaginationParams = {
 *   limit: 20,
 *   nextToken: undefined, // Or omit this field
 * };
 * const result1 = await repo.listPlatforms(page1);
 * console.log(result1.items.length); // Up to 20 items
 * console.log(result1.nextToken); // "eyJQSyI6..." or undefined
 *
 * // Second page (use token from page 1)
 * if (result1.nextToken) {
 *   const page2: TokenPaginationParams = {
 *     limit: 20,
 *     nextToken: result1.nextToken,
 *   };
 *   const result2 = await repo.listPlatforms(page2);
 *   console.log(result2.items.length); // Next 20 items
 * }
 *
 * // Paginate through all items
 * const allItems: Platform[] = [];
 * let nextToken: string | undefined;
 *
 * do {
 *   const params: TokenPaginationParams = { limit: 100, nextToken };
 *   const result = await repo.listPlatforms(params);
 *   allItems.push(...result.items);
 *   nextToken = result.nextToken;
 * } while (nextToken);
 *
 * console.log(`Total items: ${allItems.length}`);
 * ```
 */
export interface TokenPaginationParams {
  /** Maximum number of records to return (typically 10-100, max varies by database) */
  limit: number;
  /**
   * Continuation token from previous page (optional for first page).
   * Base64-encoded opaque string - do not parse or modify.
   */
  nextToken?: string;
}

/**
 * Paginated result for offset-based pagination (SQL, MongoDB).
 *
 * @remarks
 * **Offset-Based Result:**
 * Includes total count, enabling calculation of total pages and showing
 * "Page 1 of 10" UI elements.
 *
 * **Total Count:**
 * Total count represents ALL records matching the query (not just current page).
 * Enables pagination UI with page numbers, "previous/next" buttons, and progress indicators.
 *
 * **Performance:**
 * Calculating total count requires a separate `COUNT(*)` query, which can be
 * expensive for large tables. Consider caching the count or updating periodically.
 *
 * **Empty Pages:**
 * If offset exceeds total count, `items` will be empty array but `total` remains accurate.
 *
 * @example
 * ```ts
 * const result: OffsetPaginatedResult<Platform> = {
 *   items: [
 *     { id: '1', name: 'web', description: 'Web app' },
 *     { id: '2', name: 'mobile', description: 'Mobile app' },
 *   ],
 *   total: 42, // Total platforms in database
 * };
 *
 * // Calculate pagination metadata
 * const perPage = 20;
 * const totalPages = Math.ceil(result.total / perPage);
 * const currentPage = Math.floor(offset / perPage) + 1;
 * const hasNextPage = currentPage < totalPages;
 * const hasPrevPage = currentPage > 1;
 *
 * console.log(`Page ${currentPage} of ${totalPages}`);
 * console.log(`Showing ${result.items.length} of ${result.total} total`);
 * ```
 */
export interface OffsetPaginatedResult<T> {
  /** Array of items for current page */
  items: T[];
  /** Total count of items matching query (for calculating total pages) */
  total: number;
}

/**
 * Paginated result for token-based pagination (DynamoDB, modern APIs).
 *
 * @remarks
 * **Token-Based Result:**
 * Uses continuation token instead of page numbers. Clients pass `nextToken`
 * from previous response to fetch the next page.
 *
 * **Next Token:**
 * - Present if more pages exist
 * - Undefined if this is the last page
 * - Opaque base64-encoded string (do not parse or modify)
 *
 * **Total Count:**
 * Optional because calculating total is expensive for token-based databases:
 * - **DynamoDB**: Requires separate scan of entire table (slow, expensive)
 * - **Cloudflare D1**: Can calculate but may be slow for large tables
 * - **Best practice**: Leave `total` undefined unless specifically needed
 *
 * **End of Results:**
 * When `nextToken` is undefined, all results have been fetched.
 * `items.length` may be less than `limit` on the last page.
 *
 * @example
 * ```ts
 * const result: TokenPaginatedResult<Platform> = {
 *   items: [
 *     { id: '1', name: 'web', description: 'Web app' },
 *     { id: '2', name: 'mobile', description: 'Mobile app' },
 *   ],
 *   nextToken: 'eyJQSyI6IlBMQVRGT1JNI3dlYiIsIlNLIjoiTUVUQURBVEEifQ==',
 *   total: undefined, // Not calculated (expensive for DynamoDB)
 * };
 *
 * // Check for more pages
 * if (result.nextToken) {
 *   console.log('More pages available');
 *   // Fetch next page with result.nextToken
 * } else {
 *   console.log('No more pages (end of results)');
 * }
 *
 * // API response format
 * const apiResponse = {
 *   data: result.items,
 *   meta: {
 *     limit: 20,
 *     nextToken: result.nextToken,
 *     // Omit total if undefined (common for DynamoDB)
 *   },
 * };
 *
 * // Fetch all pages programmatically
 * async function fetchAllPlatforms(): Promise<Platform[]> {
 *   const allPlatforms: Platform[] = [];
 *   let nextToken: string | undefined;
 *
 *   do {
 *     const result = await repo.listPlatforms({ limit: 100, nextToken });
 *     allPlatforms.push(...result.items);
 *     nextToken = result.nextToken;
 *   } while (nextToken);
 *
 *   return allPlatforms;
 * }
 * ```
 */
export interface TokenPaginatedResult<T> {
  /** Array of items for current page */
  items: T[];
  /**
   * Token for fetching next page (undefined if no more pages).
   * Pass this to the next request's `nextToken` parameter.
   */
  nextToken?: string;
  /**
   * Total count (optional - expensive for DynamoDB, may be undefined).
   * Only include if total count is explicitly requested and acceptable performance cost.
   */
  total?: number;
}

/**
 * Union type for all pagination results.
 *
 * @remarks
 * Can be either offset-based (SQL, MongoDB) or token-based (DynamoDB).
 * Use type guards to discriminate between the two:
 * - Check `'total' in result` for offset-based pagination
 * - Check `'nextToken' in result` for token-based pagination
 *
 * @example
 * ```ts
 * const result = await repo.listPlatforms(params);
 *
 * if ('total' in result) {
 *   // Offset-based: has total count
 *   console.log(`Total: ${result.total}`);
 * } else {
 *   // Token-based: has nextToken
 *   console.log(`Next: ${result.nextToken || 'end'}`);
 * }
 * ```
 */
export type PaginatedResult<T> =
  | OffsetPaginatedResult<T>
  | TokenPaginatedResult<T>;
