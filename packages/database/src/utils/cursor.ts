/**
 * Cursor utilities for pagination in database adapters.
 *
 * @module cursor
 *
 * @remarks
 * Provides safe parsing and encoding of pagination cursors.
 * Cursors are base64-encoded offsets used for cursor-based pagination.
 */

/**
 * Safely parse a base64-encoded cursor to an offset number.
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Parsed offset (0 if cursor is undefined/invalid)
 * @throws Error if cursor is malformed (invalid base64 or non-numeric value)
 *
 * @example
 * ```typescript
 * const offset = parseCursor('MTAw'); // Returns 100
 * const offset = parseCursor(undefined); // Returns 0
 * parseCursor('invalid!!!'); // Throws Error: Invalid cursor
 * ```
 */
export function parseCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const n = Number(decoded);

    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error("Invalid cursor");
    }

    return n;
  } catch {
    throw new Error("Invalid cursor");
  }
}

/**
 * Encode an offset number as a base64 cursor.
 *
 * @param offset - Numeric offset to encode
 * @returns Base64-encoded cursor string
 *
 * @example
 * ```typescript
 * const cursor = encodeCursor(100); // Returns 'MTAw'
 * ```
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64");
}

/**
 * Safely parse a cursor, returning 0 for any invalid value.
 * Use this when you want to silently handle invalid cursors.
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Parsed offset (0 if cursor is undefined/invalid)
 *
 * @example
 * ```typescript
 * const offset = parseCursorSafe('MTAw'); // Returns 100
 * const offset = parseCursorSafe('invalid'); // Returns 0
 * ```
 */
export function parseCursorSafe(cursor?: string): number {
  try {
    return parseCursor(cursor);
  } catch {
    return 0;
  }
}
