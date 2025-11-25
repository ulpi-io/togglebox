/**
 * DynamoDB password reset token service with single-table design patterns.
 *
 * @module adapters/dynamodb/passwordResetService
 *
 * @remarks
 * **Single-Table Design Patterns:**
 * - Primary Access: `PK: RESET#<id>`, `SK: RESET#<id>`
 * - User's Tokens: GSI1 with `GSI1PK: USER#<userId>`, `GSI1SK: RESET#<expiresAt>`
 * - Hash Lookup: GSI2 with `GSI2PK: RESET_HASH#<tokenHash>`, `GSI2SK: RESET#<id>`
 *
 * **Data Format:**
 * - Dates stored as ISO 8601 strings
 * - Token hash used for verification (never store plaintext tokens)
 * - Expiration enforced at application level
 *
 * **Multi-Tenancy:**
 * Uses {@link getAuthTableName} for tenant-aware table name resolution.
 * All operations scoped to tenant context from AsyncLocalStorage.
 *
 * **Token Lifecycle:**
 * 1. Created with 1-hour expiration
 * 2. Single-use (deleted after password reset)
 * 3. Expired tokens cleaned up via cron job
 *
 * **Performance Considerations:**
 * - `findById`: Single item get (low latency, strongly consistent)
 * - `findByTokenHash`: GSI2 query (low latency, eventually consistent)
 * - `findValidByUser`: GSI1 query with range condition (efficient)
 * - `deleteExpired`: Full table scan (run during off-peak hours)
 */

import { v4 as uuidv4 } from 'uuid';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  PasswordResetToken,
  CreatePasswordResetTokenData,
} from '../../models/PasswordResetToken';
import { dynamoDBClient, getAuthTableName } from './database';

/**
 * Create a new password reset token in DynamoDB.
 *
 * @param data - Token creation data (userId, tokenHash, expiresAt)
 * @returns Created token with generated ID and timestamp
 * @throws {Error} If token with same ID already exists (rare UUID collision)
 *
 * @remarks
 * **Single-Table Keys:**
 * - `PK: RESET#<id>`, `SK: RESET#<id>` - Primary access
 * - `GSI1PK: USER#<userId>`, `GSI1SK: RESET#<expiresAt>` - User's tokens sorted by expiration
 * - `GSI2PK: RESET_HASH#<tokenHash>`, `GSI2SK: RESET#<id>` - Hash lookup for verification
 *
 * **Condition Expression:**
 * Uses `attribute_not_exists(PK)` to prevent overwrites.
 *
 * **Timestamps:**
 * - `createdAt`: Set to current time
 * - `expiresAt`: Provided by caller (typically 1 hour from now)
 */
export async function createPasswordResetToken(
  data: CreatePasswordResetTokenData
): Promise<PasswordResetToken> {
  const now = new Date();
  const token: PasswordResetToken = {
    id: uuidv4(),
    userId: data.userId,
    tokenHash: data.tokenHash,
    expiresAt: data.expiresAt,
    createdAt: now,
  };

  const params = {
    TableName: getAuthTableName(),
    Item: {
      PK: `RESET#${token.id}`,
      SK: `RESET#${token.id}`,
      GSI1PK: `USER#${token.userId}`,
      GSI1SK: `RESET#${token.expiresAt.toISOString()}`,
      GSI2PK: `RESET_HASH#${token.tokenHash}`,
      GSI2SK: `RESET#${token.id}`,
      ...token,
      createdAt: token.createdAt.toISOString(),
      expiresAt: token.expiresAt.toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return token;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ConditionalCheckFailedException') {
      throw new Error(`Password reset token with ID ${token.id} already exists`);
    }
    throw error;
  }
}

/**
 * Find password reset token by ID.
 *
 * @param id - Token UUID
 * @returns Token if found, null otherwise
 *
 * @remarks
 * **Consistency:**
 * Uses GetItem operation with strong consistency (default for non-GSI reads).
 *
 * **Performance:**
 * Single item lookup - most efficient query pattern (~1-2ms latency).
 */
export async function findPasswordResetTokenById(
  id: string
): Promise<PasswordResetToken | null> {
  const params = {
    TableName: getAuthTableName(),
    Key: {
      PK: `RESET#${id}`,
      SK: `RESET#${id}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToPasswordResetToken(result.Item) : null;
}

/**
 * Find password reset token by hashed token value using GSI2.
 *
 * @param tokenHash - Hashed password reset token (bcrypt)
 * @returns Token if found, null otherwise
 *
 * @remarks
 * **Global Secondary Index:**
 * Uses GSI2 with `GSI2PK: RESET_HASH#<tokenHash>` for token verification.
 *
 * **Consistency:**
 * GSI queries are eventually consistent. Newly created tokens may not be
 * immediately available for verification (typical propagation: <100ms).
 *
 * **Security:**
 * Never log or expose the tokenHash value in responses.
 * Used only for internal token verification.
 */
export async function findPasswordResetTokenByTokenHash(
  tokenHash: string
): Promise<PasswordResetToken | null> {
  const params = {
    TableName: getAuthTableName(),
    IndexName: 'GSI2',
    KeyConditionExpression: 'GSI2PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `RESET_HASH#${tokenHash}`,
    },
    Limit: 1,
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0
    ? mapToPasswordResetToken(result.Items[0])
    : null;
}

/**
 * Find all valid (non-expired) tokens for a user using GSI1.
 *
 * @param userId - User UUID
 * @returns Array of valid tokens (expiresAt > now)
 *
 * @remarks
 * **Global Secondary Index:**
 * Uses GSI1 with `GSI1PK: USER#<userId>` and range condition on `GSI1SK: RESET#<expiresAt>`.
 * Only returns tokens where expiresAt is in the future.
 *
 * **Performance:**
 * Efficient GSI query with range condition - avoids scanning expired tokens.
 *
 * **Use Case:**
 * Invalidate previous tokens when creating new password reset token for same user.
 */
export async function findValidPasswordResetTokensByUser(
  userId: string
): Promise<PasswordResetToken[]> {
  const now = new Date().toISOString();

  const params = {
    TableName: getAuthTableName(),
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND GSI1SK > :now',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
      ':now': `RESET#${now}`,
    },
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items ? result.Items.map(mapToPasswordResetToken) : [];
}

/**
 * Delete password reset token from DynamoDB.
 *
 * @param id - Token UUID
 *
 * @remarks
 * **Single-Use Tokens:**
 * Tokens deleted immediately after successful password reset.
 * Prevents token reuse.
 *
 * **Silent Failure:**
 * DynamoDB DeleteItem is idempotent - no error if item doesn't exist.
 */
export async function deletePasswordResetToken(id: string): Promise<void> {
  const params = {
    TableName: getAuthTableName(),
    Key: {
      PK: `RESET#${id}`,
      SK: `RESET#${id}`,
    },
  };

  await dynamoDBClient.send(new DeleteCommand(params));
}

/**
 * Delete all password reset tokens for a user (cascade delete).
 *
 * @param userId - User UUID
 *
 * @remarks
 * **Manual Cascade:**
 * Queries user's tokens via GSI1, then batch deletes them.
 * Not automatically triggered when user is deleted - must be called explicitly.
 *
 * **Use Cases:**
 * - User account deleted
 * - Invalidate all tokens after successful password reset
 * - Security: Revoke all pending tokens if suspicious activity detected
 */
export async function deletePasswordResetTokensByUser(userId: string): Promise<void> {
  const params = {
    TableName: getAuthTableName(),
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER#${userId}`,
    },
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  const tokens = result.Items ? result.Items.map(mapToPasswordResetToken) : [];

  // Batch delete all tokens
  const deletePromises = tokens.map((token) => deletePasswordResetToken(token.id));
  await Promise.all(deletePromises);
}

/**
 * Delete expired password reset tokens (cleanup job).
 *
 * @returns Count of deleted tokens
 *
 * @remarks
 * **Cleanup Job:**
 * Run periodically via cron (e.g., daily at 3 AM) to remove expired tokens.
 *
 * **Performance Warning:**
 * Uses full table SCAN with filter - expensive for large datasets.
 * RCUs consumed based on all items scanned, not just expired tokens.
 *
 * **Optimization:**
 * Consider DynamoDB TTL feature for automatic expiration instead of manual cleanup.
 * Configure TTL on `expiresAt` attribute for zero-cost automatic deletion.
 *
 * **Batch Delete:**
 * Deletes tokens in parallel using Promise.all.
 * For 1000s of expired tokens, consider batch write API for efficiency.
 */
export async function deleteExpiredPasswordResetTokens(): Promise<number> {
  const now = new Date().toISOString();

  // Scan for expired tokens
  const params: any = {
    TableName: getAuthTableName(),
    FilterExpression: 'begins_with(PK, :pk) AND expiresAt < :now',
    ExpressionAttributeValues: {
      ':pk': 'RESET#',
      ':now': now,
    },
  };

  const result = await dynamoDBClient.send(new ScanCommand(params));
  const expiredTokens = result.Items ? result.Items.map(mapToPasswordResetToken) : [];

  // Batch delete expired tokens
  const deletePromises = expiredTokens.map((token) => deletePasswordResetToken(token.id));
  await Promise.all(deletePromises);

  return expiredTokens.length;
}

/**
 * Map DynamoDB item to PasswordResetToken domain model.
 *
 * @param item - Raw DynamoDB item with PK/SK/GSI keys
 * @returns PasswordResetToken model with typed fields
 *
 * @remarks
 * **Key Removal:**
 * Strips DynamoDB-specific keys (PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK) from result.
 *
 * **Date Parsing:**
 * Converts ISO 8601 strings to JavaScript Date objects.
 *
 * **Type Assertion:**
 * Uses `as PasswordResetToken` - assumes DynamoDB item matches interface.
 */
function mapToPasswordResetToken(item: unknown): PasswordResetToken {
  const data = item as Record<string, unknown>;
  const { PK, SK, GSI1PK, GSI1SK, GSI2PK, GSI2SK, ...tokenData } = data;
  const typedData = tokenData as { createdAt: string; expiresAt: string; [key: string]: unknown };
  return {
    ...tokenData,
    createdAt: new Date(typedData.createdAt),
    expiresAt: new Date(typedData.expiresAt),
  } as PasswordResetToken;
}
