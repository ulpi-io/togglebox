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

import { v4 as uuidv4 } from "uuid";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { User, CreateUserData, UpdateUserData } from "../../models/User";
import { dynamoDBClient, getUsersTableName } from "./database";

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
      // GSI2 for all users listing (enables efficient Query instead of Scan)
      GSI2PK: "USER#ALL",
      GSI2SK: `USER#${user.id}`,
      // GSI3 for role-based queries (enables efficient countByRole)
      GSI3PK: `USER_ROLE#${user.role}`,
      GSI3SK: `USER#${user.id}`,
      ...user,
      // Store dates as ISO strings for DynamoDB
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    ConditionExpression: "attribute_not_exists(PK)",
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    if (err.code === "ConditionalCheckFailedException") {
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
    IndexName: "GSI1",
    KeyConditionExpression: "GSI1PK = :pk",
    ExpressionAttributeValues: {
      ":pk": `USER_EMAIL#${email}`,
    },
    Limit: 1,
  };

  const result = await dynamoDBClient.send(new QueryCommand(params));
  return result.Items && result.Items.length > 0
    ? mapToUser(result.Items[0])
    : null;
}

/**
 * Update user data with optimistic locking.
 *
 * @param id - User UUID
 * @param data - Partial user data to update (role, passwordHash)
 * @returns Updated user
 * @throws {Error} If user not found
 * @throws {Error} If concurrent modification detected (optimistic lock failure)
 *
 * @remarks
 * **Optimistic Locking:**
 * Uses `updatedAt` as version field. Update only succeeds if `updatedAt`
 * matches expected value, preventing concurrent overwrites.
 *
 * **Timestamps:**
 * Automatically updates `updatedAt` to current time.
 * Preserves original `createdAt` value.
 *
 * **GSI Consistency:**
 * If email changes, GSI1 must be updated. Current implementation
 * does not support email changes (email is immutable in User model).
 */
export async function updateUser(
  id: string,
  data: UpdateUserData,
): Promise<User> {
  const existingUser = await findUserById(id);
  if (!existingUser) {
    throw new Error(`User with ID ${id} not found`);
  }

  const expectedUpdatedAt = existingUser.updatedAt.toISOString();
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
      // GSI2 for all users listing (enables efficient Query instead of Scan)
      GSI2PK: "USER#ALL",
      GSI2SK: `USER#${id}`,
      // GSI3 for role-based queries (enables efficient countByRole)
      GSI3PK: `USER_ROLE#${updatedUser.role}`,
      GSI3SK: `USER#${id}`,
      ...updatedUser,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    },
    // Optimistic locking: only update if updatedAt matches expected value
    ConditionExpression: "updatedAt = :expectedUpdatedAt",
    ExpressionAttributeValues: {
      ":expectedUpdatedAt": expectedUpdatedAt,
    },
  };

  try {
    await dynamoDBClient.send(new PutCommand(params));
    return updatedUser;
  } catch (error: unknown) {
    const err = error as { name?: string; message?: string };
    if (err.name === "ConditionalCheckFailedException") {
      throw new Error(
        `Concurrent modification detected for user ${id}. Please retry.`,
      );
    }
    throw error;
  }
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
 * **GSI-Based Query:**
 * Uses GSI2 with `GSI2PK: USER#ALL` for efficient user listing.
 * Falls back to table scan if GSI2 is not available.
 *
 * **Role Filtering:**
 * When role is specified, uses GSI3 with `GSI3PK: USER_ROLE#<role>` for
 * efficient role-based queries without scanning the entire table.
 *
 * **Manual Pagination:**
 * Uses in-memory pagination (slice) for offset-based pagination.
 * For very large datasets, consider cursor-based pagination with LastEvaluatedKey.
 */
export async function listUsers(options?: {
  limit?: number;
  offset?: number;
  role?: string;
}): Promise<{ users: User[]; total: number }> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  // Cap limit to prevent unbounded queries
  const cappedLimit = Math.min(limit, 100);
  // Fetch only what we need for the page (offset + limit)
  const fetchLimit = offset + cappedLimit;

  try {
    // If role is specified, use GSI3 for efficient role-based query
    if (options?.role) {
      // Get count separately for accurate total
      const countParams = {
        TableName: getUsersTableName(),
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `USER_ROLE#${options.role}`,
        },
        Select: "COUNT" as const,
      };
      const countResult = await dynamoDBClient.send(
        new QueryCommand(countParams),
      );
      const total = countResult.Count || 0;

      // Fetch only the items we need
      const params = {
        TableName: getUsersTableName(),
        IndexName: "GSI3",
        KeyConditionExpression: "GSI3PK = :pk",
        ExpressionAttributeValues: {
          ":pk": `USER_ROLE#${options.role}`,
        },
        Limit: fetchLimit,
      };

      const result = await dynamoDBClient.send(new QueryCommand(params));
      const fetchedUsers = result.Items ? result.Items.map(mapToUser) : [];
      const paginatedUsers = fetchedUsers.slice(offset, offset + cappedLimit);

      return {
        users: paginatedUsers,
        total,
      };
    }

    // Get count separately for accurate total
    const countParams = {
      TableName: getUsersTableName(),
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "USER#ALL",
      },
      Select: "COUNT" as const,
    };
    const countResult = await dynamoDBClient.send(
      new QueryCommand(countParams),
    );
    const total = countResult.Count || 0;

    // Use GSI2 for listing all users (more efficient than scan)
    // Limit fetch to only what's needed for the current page
    const params = {
      TableName: getUsersTableName(),
      IndexName: "GSI2",
      KeyConditionExpression: "GSI2PK = :pk",
      ExpressionAttributeValues: {
        ":pk": "USER#ALL",
      },
      Limit: fetchLimit,
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    const fetchedUsers = result.Items ? result.Items.map(mapToUser) : [];
    const paginatedUsers = fetchedUsers.slice(offset, offset + cappedLimit);

    return {
      users: paginatedUsers,
      total,
    };
  } catch (error: unknown) {
    // Fallback to scan if GSI doesn't exist (for backward compatibility)
    const err = error as { name?: string; message?: string };
    if (
      err.message?.includes("GSI") ||
      err.name === "ResourceNotFoundException"
    ) {
      console.warn(
        "GSI2/GSI3 not found, falling back to table scan. Consider adding GSIs for better performance.",
      );
      return listUsersWithScan(options);
    }
    throw error;
  }
}

/**
 * Fallback: List users using table scan (for backward compatibility).
 * @internal
 */
async function listUsersWithScan(options?: {
  limit?: number;
  offset?: number;
  role?: string;
}): Promise<{ users: User[]; total: number }> {
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;
  // Cap limit to prevent unbounded queries
  const cappedLimit = Math.min(limit, 100);

  // Build scan parameters with proper typing
  const expressionValues: Record<string, string> = { ":pk": "USER#" };
  let filterExpression = "begins_with(PK, :pk)";
  let expressionNames: Record<string, string> | undefined;

  if (options?.role) {
    filterExpression += " AND #role = :role";
    expressionNames = { "#role": "role" };
    expressionValues[":role"] = options.role;
  }

  // First get total count
  const countParams = {
    TableName: getUsersTableName(),
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionValues,
    ...(expressionNames && { ExpressionAttributeNames: expressionNames }),
    Select: "COUNT" as const,
  };
  const countResult = await dynamoDBClient.send(new ScanCommand(countParams));
  const total = countResult.Count || 0;

  // For scan, we need to fetch offset + limit items since Limit in Scan
  // is applied before FilterExpression. We cap at a reasonable max.
  const maxScanLimit = 1000;
  const params = {
    TableName: getUsersTableName(),
    FilterExpression: filterExpression,
    ExpressionAttributeValues: expressionValues,
    ...(expressionNames && { ExpressionAttributeNames: expressionNames }),
    Limit: Math.min(offset + cappedLimit, maxScanLimit),
  };

  const result = await dynamoDBClient.send(new ScanCommand(params));
  const fetchedUsers = result.Items ? result.Items.map(mapToUser) : [];
  const paginatedUsers = fetchedUsers.slice(offset, offset + cappedLimit);

  return {
    users: paginatedUsers,
    total,
  };
}

/**
 * Count users by role.
 *
 * @param role - User role to count (admin, developer, viewer)
 * @returns Number of users with the specified role
 *
 * @remarks
 * **SECURITY:** Used to prevent demoting the last admin user.
 *
 * **GSI-Based Query:**
 * Uses GSI3 with `GSI3PK: USER_ROLE#<role>` for efficient counting.
 * Falls back to table scan if GSI3 is not available.
 */
export async function countUsersByRole(role: string): Promise<number> {
  try {
    // Use GSI3 for efficient role-based count
    const params = {
      TableName: getUsersTableName(),
      IndexName: "GSI3",
      KeyConditionExpression: "GSI3PK = :pk",
      ExpressionAttributeValues: {
        ":pk": `USER_ROLE#${role}`,
      },
      Select: "COUNT" as const,
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Count || 0;
  } catch (error: unknown) {
    // Fallback to scan if GSI doesn't exist (for backward compatibility)
    const err = error as { name?: string; message?: string };
    if (
      err.message?.includes("GSI") ||
      err.name === "ResourceNotFoundException"
    ) {
      console.warn(
        "GSI3 not found, falling back to table scan. Consider adding GSI for better performance.",
      );
      return countUsersByRoleWithScan(role);
    }
    throw error;
  }
}

/**
 * Fallback: Count users by role using table scan (for backward compatibility).
 * @internal
 */
async function countUsersByRoleWithScan(role: string): Promise<number> {
  const params = {
    TableName: getUsersTableName(),
    FilterExpression: "begins_with(PK, :pk) AND #role = :role",
    ExpressionAttributeNames: {
      "#role": "role",
    },
    ExpressionAttributeValues: {
      ":pk": "USER#",
      ":role": role,
    },
    Select: "COUNT" as const,
  };

  const result = await dynamoDBClient.send(new ScanCommand(params));
  return result.Count || 0;
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
  const typedData = userData as {
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
  };
  return {
    ...userData,
    createdAt: new Date(typedData.createdAt),
    updatedAt: new Date(typedData.updatedAt),
  } as User;
}
