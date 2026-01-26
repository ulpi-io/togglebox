/**
 * DynamoDB user service with single-table design patterns.
 *
 * @module adapters/dynamodb/userService
 *
 * @remarks
 * **Single-Table Design Patterns:**
 * - Primary Access: `PK: USER#<id>`, `SK: USER#<id>`
 * - Email Lookup: GSI1 with `GSI1PK: USER_EMAIL#<email>`, `GSI1SK: USER#<id>`
 *
 * **Data Format:**
 * - Dates stored as ISO 8601 strings
 * - User model mapped to/from DynamoDB format
 * - GSI keys included for alternate access patterns
 *
 * **Multi-Tenancy:**
 * Uses {@link getAuthTableName} for tenant-aware table name resolution.
 * All operations scoped to tenant context from AsyncLocalStorage.
 *
 * **Performance Considerations:**
 * - `findById`: Single item get (low latency, strongly consistent)
 * - `findByEmail`: GSI query (low latency, eventually consistent)
 * - `listUsers`: Full table scan (high latency, avoid for large datasets)
 */

import { v4 as uuidv4 } from 'uuid';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { User, CreateUserData, UpdateUserData } from '../../models/User';
import { dynamoDBClient, getUsersTableName } from './database';

/**
 * Create a new user in DynamoDB.
 *
 * @param data - User creation data (email, passwordHash, role)
 * @returns Created user with generated ID and timestamps
 * @throws {Error} If user with same ID already exists (rare UUID collision)
 *
 * @remarks
 * **Single-Table Keys:**
 * - `PK: USER#<id>`, `SK: USER#<id>` - Primary access pattern
 * - `GSI1PK: USER_EMAIL#<email>`, `GSI1SK: USER#<id>` - Email lookup
 *
 * **Condition Expression:**
 * Uses `attribute_not_exists(PK)` to prevent overwrites.
 * Throws ConditionalCheckFailedException if user already exists.
 *
 * **Timestamps:**
 * - `createdAt`: Set to current time
 * - `updatedAt`: Set to current time
 * - Both stored as ISO 8601 strings in DynamoDB
 */
export async function createUser(data: CreateUserData): Promise<User> {
  const now = new Date();
  const user: User = {
    id: uuidv4(),
    name: data.name,
    email: data.email,
    passwordHash: data.passwordHash,
    role: data.role,
    createdAt: now,
    updatedAt: now,
  };

  const params = {
    TableName: getUsersTableName(),
    Item: {
      PK: `USER#${user.id}`,
      SK: `USER#${user.id}`,
      GSI1PK: `USER_EMAIL#${user.email}`,
      GSI1SK: `USER#${user.id}`,
      ...user,
      // Store dates as ISO strings for DynamoDB
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    ConditionExpression: 'attribute_not_exists(PK)',
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === 'ConditionalCheckFailedException') {
      throw new Error(`User with ID ${user.id} already exists`);
    }
    throw error;
  }
}

/**
 * Find user by ID.
 *
 * @param id - User UUID
 * @returns User if found, null otherwise
 *
 * @remarks
 * **Consistency:**
 * Uses GetItem operation with strong consistency (default for non-GSI reads).
 *
 * **Performance:**
 * Single item lookup - most efficient query pattern (~1-2ms latency).
 */
export async function findUserById(id: string): Promise<User | null> {
  const params = {
    TableName: getUsersTableName(),
    Key: {
      PK: `USER#${id}`,
      SK: `USER#${id}`,
    },
  };

  const result = await dynamoDBClient.send(new GetCommand(params));
  return result.Item ? mapToUser(result.Item) : null;
}

/**
 * Find user by email using GSI1.
 *
 * @param email - User email address
 * @returns User if found, null otherwise
 *
 * @remarks
 * **Global Secondary Index:**
 * Uses GSI1 with `GSI1PK: USER_EMAIL#<email>` for efficient email lookups.
 *
 * **Consistency:**
 * GSI queries are eventually consistent. If user just created, may not be
 * immediately available via email lookup (typical propagation: <100ms).
 *
 * **Performance:**
 * Single GSI query - efficient (~2-5ms latency including GSI propagation).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const params = {
    TableName: getUsersTableName(),
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': `USER_EMAIL#${email}`,
    },
    Limit: 1,
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0 ? mapToUser(result.Items[0]) : null;
}

/**
 * Update user data.
 *
 * @param id - User UUID
 * @param data - Partial user data to update (role, passwordHash)
 * @returns Updated user
 * @throws {Error} If user not found
 *
 * @remarks
 * **Read-Modify-Write:**
 * Fetches existing user, merges updates, writes back entire item.
 * Not atomic - use optimistic locking for concurrent updates if needed.
 *
 * **Timestamps:**
 * Automatically updates `updatedAt` to current time.
 * Preserves original `createdAt` value.
 *
 * **GSI Consistency:**
 * If email changes, GSI1 must be updated. Current implementation
 * does not support email changes (email is immutable in User model).
 */
export async function updateUser(id: string, data: UpdateUserData): Promise<User> {
  const existingUser = await findUserById(id);
  if (!existingUser) {
    throw new Error(`User with ID ${id} not found`);
  }

  const updatedUser: User = {
    ...existingUser,
    ...data,
    updatedAt: new Date(),
  };

  const params = {
    TableName: getUsersTableName(),
    Item: {
      PK: `USER#${id}`,
      SK: `USER#${id}`,
      GSI1PK: `USER_EMAIL#${updatedUser.email}`,
      GSI1SK: `USER#${id}`,
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    },
  };

  await dynamoDBClient.send(new PutCommand(params));
  return updatedUser;
}

/**
 * Delete user from DynamoDB.
 *
 * @param id - User UUID
 *
 * @remarks
 * **No Cascade:**
 * Does NOT automatically delete related API keys or password reset tokens.
 * Application must handle cascade deletion manually via:
 * - `apiKeyService.deleteApiKeysByUser(userId)`
 * - `passwordResetService.deletePasswordResetTokensByUser(userId)`
 *
 * **Silent Failure:**
 * DynamoDB DeleteItem is idempotent - no error if item doesn't exist.
 */
export async function deleteUser(id: string): Promise<void> {
  const params = {
    TableName: getUsersTableName(),
    Key: {
      PK: `USER#${id}`,
      SK: `USER#${id}`,
    },
  };

  await dynamoDBClient.send(new DeleteCommand(params));
}

/**
 * List all users with pagination and optional role filtering.
 *
 * @param options - Pagination and filter options
 * @param options.limit - Max users to return (default: 20)
 * @param options.offset - Number of users to skip (default: 0)
 * @param options.role - Filter by role (optional)
 * @returns Paginated user list with total count
 *
 * @remarks
 * **Performance Warning:**
 * Uses table SCAN operation - inefficient for large datasets.
 * For production with >10K users, consider:
 * 1. GSI with fixed partition key for all users
 * 2. Cursor-based pagination instead of offset
 * 3. Caching user list
 *
 * **Filter Expression:**
 * Filters applied AFTER scan (not before) - always scans entire table.
 * RCUs consumed based on scanned items, not filtered results.
 *
 * **Manual Pagination:**
 * Uses in-memory pagination (slice) after fetching all users.
 * Not suitable for large datasets - consider DynamoDB pagination (LastEvaluatedKey).
 */
export async function listUsers(options?: {
  limit?: number;
  offset?: number;
  role?: string;
}): Promise<{ users: User[]; total: number }> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  // Query for all users using a scan on PK pattern
  // In production, consider using GSI with a fixed partition key for all users
  const params: any = {
    TableName: getUsersTableName(),
    FilterExpression: 'begins_with(PK, :pk)',
    ExpressionAttributeValues: {
      ':pk': 'USER#',
    },
  };

  // Add role filter if provided
  if (options?.role) {
    params.FilterExpression += ' AND #role = :role';
    params.ExpressionAttributeNames = {
      '#role': 'role',
    };
    params.ExpressionAttributeValues![':role'] = options.role;
  }

  const result = await dynamoDBClient.send(new ScanCommand(params));
  const allUsers = result.Items ? result.Items.map(mapToUser) : [];

  // Manual pagination (DynamoDB pagination is different, but this works for MVP)
  const paginatedUsers = allUsers.slice(offset, offset + limit);

  return {
    users: paginatedUsers,
    total: allUsers.length,
  };
}

/**
 * Map DynamoDB item to User domain model.
 *
 * @param item - Raw DynamoDB item with PK/SK keys
 * @returns User model with typed fields
 *
 * @remarks
 * **Key Removal:**
 * Strips DynamoDB-specific keys (PK, SK, GSI1PK, GSI1SK) from result.
 *
 * **Date Parsing:**
 * Converts ISO 8601 strings to JavaScript Date objects.
 *
 * **Type Assertion:**
 * Uses `as User` - assumes DynamoDB item matches User interface.
 * Consider runtime validation with Zod for production safety.
 */
function mapToUser(item: unknown): User {
  const data = item as Record<string, unknown>;
  const { PK, SK, GSI1PK, GSI1SK, ...userData } = data;
  const typedData = userData as { createdAt: string; updatedAt: string; [key: string]: unknown };
  return {
    ...userData,
    createdAt: new Date(typedData.createdAt),
    updatedAt: new Date(typedData.updatedAt),
  } as User;
}
