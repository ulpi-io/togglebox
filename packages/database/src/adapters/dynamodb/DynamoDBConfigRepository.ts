/**
 * DynamoDB adapter for config parameter operations (Firebase-style).
 *
 * @remarks
 * Implements `IConfigRepository` for individual versioned config parameters.
 * Each parameter has version history; only one version is active at a time.
 *
 * **DynamoDB Key Design:**
 * - PK: `CONFIG#{platform}#{environment}` - Partition key
 * - SK: `PARAM#{parameterKey}#V#{version}` - Sort key with version
 *
 * **GSI1 (Active Parameters):**
 * - GSI1PK: `CONFIG#{platform}#{environment}#ACTIVE` - Only active versions
 * - GSI1SK: `PARAM#{parameterKey}` - For efficient active parameter queries
 * - Condition: Only items where isActive = true (sparse index)
 */

import {
  ConfigParameter,
  CreateConfigParameter,
  UpdateConfigParameter,
  parseConfigValue,
} from "@togglebox/configs";
import {
  IConfigRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  PaginatedResult,
} from "../../interfaces";
import { dynamoDBClient, getRemoteConfigsTableName } from "../../database";
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  QueryCommandInput,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "@togglebox/shared";

/**
 * Type guard for DynamoDB errors with a name property.
 */
function isDynamoDBError(error: unknown): error is Error & { name: string } {
  return error instanceof Error && typeof error.name === "string";
}

/**
 * DynamoDB implementation of config parameter repository.
 *
 * @remarks
 * Uses sparse GSI for efficient active parameter queries.
 * Parameters are versioned - edits create new versions.
 */
export class DynamoDBConfigRepository implements IConfigRepository {
  // ============================================================================
  // PUBLIC (SDK)
  // ============================================================================

  /**
   * Gets all active parameters as key-value object for SDK consumption.
   */
  async getConfigs(
    platform: string,
    environment: string,
  ): Promise<Record<string, unknown>> {
    const params: QueryCommandInput = {
      TableName: getRemoteConfigsTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsiPk",
      ExpressionAttributeValues: {
        ":gsiPk": `CONFIG#${platform}#${environment}#ACTIVE`,
      },
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    const configs: Record<string, unknown> = {};

    if (result.Items) {
      for (const item of result.Items) {
        const param = this.mapToConfigParameter(
          item as Record<string, unknown>,
        );
        // Parse the value based on its type
        configs[param.parameterKey] = parseConfigValue(
          param.defaultValue,
          param.valueType,
        );
      }
    }

    return configs;
  }

  // ============================================================================
  // ADMIN CRUD
  // ============================================================================

  /**
   * Creates a new parameter (version 1).
   */
  async create(param: CreateConfigParameter): Promise<ConfigParameter> {
    const timestamp = new Date().toISOString();
    const version = "1";

    const configParam: ConfigParameter = {
      ...param,
      version,
      isActive: true,
      createdAt: timestamp,
    };

    // Build DynamoDB item with keys
    const item: Record<string, unknown> = {
      PK: `CONFIG#${param.platform}#${param.environment}`,
      SK: `PARAM#${param.parameterKey}#V#${version}`,
      // GSI1 for active parameter lookup (sparse index)
      GSI1PK: `CONFIG#${param.platform}#${param.environment}#ACTIVE`,
      GSI1SK: `PARAM#${param.parameterKey}`,
      ...configParam,
    };

    const command = new PutCommand({
      TableName: getRemoteConfigsTableName(),
      Item: item,
      ConditionExpression:
        "attribute_not_exists(PK) AND attribute_not_exists(SK)",
    });

    try {
      await dynamoDBClient.send(command);
      return configParam;
    } catch (error: unknown) {
      if (
        isDynamoDBError(error) &&
        error.name === "ConditionalCheckFailedException"
      ) {
        throw new ConflictError(
          `Parameter ${param.parameterKey} already exists in ${param.platform}/${param.environment}`,
        );
      }
      throw error;
    }
  }

  /**
   * Updates a parameter (creates new version, marks it active).
   */
  async update(
    platform: string,
    environment: string,
    parameterKey: string,
    updates: UpdateConfigParameter,
  ): Promise<ConfigParameter> {
    // 1. Get current active version
    const current = await this.getActive(platform, environment, parameterKey);
    if (!current) {
      throw new NotFoundError(
        `Parameter ${parameterKey} not found in ${platform}/${environment}`,
      );
    }

    // 2. Calculate next version
    const nextVersion = String(parseInt(current.version, 10) + 1);
    const timestamp = new Date().toISOString();

    // 3. Create new version with merged data
    const newParam: ConfigParameter = {
      platform,
      environment,
      parameterKey,
      version: nextVersion,
      valueType: updates.valueType ?? current.valueType,
      defaultValue: updates.defaultValue ?? current.defaultValue,
      description:
        updates.description !== undefined
          ? (updates.description ?? undefined)
          : current.description,
      parameterGroup:
        updates.parameterGroup !== undefined
          ? (updates.parameterGroup ?? undefined)
          : current.parameterGroup,
      isActive: true,
      createdBy: updates.createdBy,
      createdAt: timestamp,
    };

    // 4. Deactivate old version (remove GSI attributes) and create new version
    // Use TransactWrite for atomicity
    const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");

    const transactCommand = new TransactWriteCommand({
      TransactItems: [
        // Deactivate old version
        {
          Update: {
            TableName: getRemoteConfigsTableName(),
            Key: {
              PK: `CONFIG#${platform}#${environment}`,
              SK: `PARAM#${parameterKey}#V#${current.version}`,
            },
            UpdateExpression: "SET isActive = :false REMOVE GSI1PK, GSI1SK",
            ExpressionAttributeValues: {
              ":false": false,
            },
          },
        },
        // Create new version
        {
          Put: {
            TableName: getRemoteConfigsTableName(),
            Item: {
              PK: `CONFIG#${platform}#${environment}`,
              SK: `PARAM#${parameterKey}#V#${nextVersion}`,
              GSI1PK: `CONFIG#${platform}#${environment}#ACTIVE`,
              GSI1SK: `PARAM#${parameterKey}`,
              ...newParam,
            },
          },
        },
      ],
    });

    await dynamoDBClient.send(transactCommand);
    return newParam;
  }

  /**
   * Deletes a parameter (all versions).
   */
  async delete(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<boolean> {
    // 1. Get all versions
    const versions = await this.listVersions(
      platform,
      environment,
      parameterKey,
    );
    if (versions.length === 0) {
      return false;
    }

    // 2. Delete all versions in batches of 25 (DynamoDB limit)
    const batches: { DeleteRequest: { Key: Record<string, string> } }[][] = [];
    let currentBatch: { DeleteRequest: { Key: Record<string, string> } }[] = [];

    for (const version of versions) {
      currentBatch.push({
        DeleteRequest: {
          Key: {
            PK: `CONFIG#${platform}#${environment}`,
            SK: `PARAM#${parameterKey}#V#${version.version}`,
          },
        },
      });

      if (currentBatch.length === 25) {
        batches.push(currentBatch);
        currentBatch = [];
      }
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    // Execute batch deletes with retry for unprocessed items
    const tableName = getRemoteConfigsTableName();
    for (const batch of batches) {
      let itemsToProcess = batch;
      let retryCount = 0;
      const maxRetries = 5;

      while (itemsToProcess.length > 0 && retryCount < maxRetries) {
        const command = new BatchWriteCommand({
          RequestItems: {
            [tableName]: itemsToProcess,
          },
        });

        const result = await dynamoDBClient.send(command);

        // Check for unprocessed items
        const unprocessed = result.UnprocessedItems?.[tableName];
        if (unprocessed && unprocessed.length > 0) {
          // Exponential backoff before retry
          const delay = Math.min(100 * Math.pow(2, retryCount), 3000);
          await new Promise((resolve) => setTimeout(resolve, delay));
          itemsToProcess = unprocessed as typeof batch;
          retryCount++;
        } else {
          break; // All items processed
        }
      }

      // If there are still unprocessed items after max retries, return false
      if (itemsToProcess.length > 0 && retryCount >= maxRetries) {
        console.error(
          `[DynamoDB] Failed to delete ${itemsToProcess.length} items after ${maxRetries} retries for ${platform}/${environment}/${parameterKey}`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Gets the active version of a parameter.
   */
  async getActive(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter | null> {
    // Query GSI1 for active parameter
    const params: QueryCommandInput = {
      TableName: getRemoteConfigsTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsiPk AND GSI1SK = :gsiSk",
      ExpressionAttributeValues: {
        ":gsiPk": `CONFIG#${platform}#${environment}#ACTIVE`,
        ":gsiSk": `PARAM#${parameterKey}`,
      },
      Limit: 1,
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    if (result.Items && result.Items.length > 0) {
      return this.mapToConfigParameter(
        result.Items[0] as Record<string, unknown>,
      );
    }

    return null;
  }

  /**
   * Lists all active parameters with metadata.
   */
  async listActive(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<PaginatedResult<ConfigParameter>> {
    // Use token-based pagination for DynamoDB
    const tokenPagination = pagination as TokenPaginationParams | undefined;

    const params: QueryCommandInput = {
      TableName: getRemoteConfigsTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsiPk",
      ExpressionAttributeValues: {
        ":gsiPk": `CONFIG#${platform}#${environment}#ACTIVE`,
      },
      Limit: tokenPagination?.limit || 100,
    };

    // Add ExclusiveStartKey for pagination
    if (tokenPagination?.nextToken) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          Buffer.from(tokenPagination.nextToken, "base64").toString("utf-8"),
        );
      } catch {
        throw new BadRequestError("Invalid pagination token");
      }
    }

    const result = await dynamoDBClient.send(new QueryCommand(params));
    const items = result.Items
      ? result.Items.map((item) =>
          this.mapToConfigParameter(item as Record<string, unknown>),
        )
      : [];

    // Encode LastEvaluatedKey as base64 token
    const nextToken = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : undefined;

    return {
      items,
      nextToken,
      total: undefined, // DynamoDB doesn't provide total count efficiently
    };
  }

  /**
   * Lists all versions of a parameter.
   */
  async listVersions(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter[]> {
    const params: QueryCommandInput = {
      TableName: getRemoteConfigsTableName(),
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `CONFIG#${platform}#${environment}`,
        ":sk": `PARAM#${parameterKey}#V#`,
      },
      ScanIndexForward: false, // Descending order (newest first)
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Items
      ? result.Items.map((item) =>
          this.mapToConfigParameter(item as Record<string, unknown>),
        )
      : [];
  }

  /**
   * Rolls back to a previous version (marks it active).
   */
  async rollback(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string,
  ): Promise<ConfigParameter | null> {
    // 1. Get the version to rollback to
    const targetVersion = await this.getVersion(
      platform,
      environment,
      parameterKey,
      version,
    );
    if (!targetVersion) {
      return null;
    }

    // 2. Get current active version
    const currentActive = await this.getActive(
      platform,
      environment,
      parameterKey,
    );
    if (!currentActive) {
      return null;
    }

    // If already active, no-op
    if (currentActive.version === version) {
      return currentActive;
    }

    // 3. Swap active status using TransactWrite
    const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");

    const transactCommand = new TransactWriteCommand({
      TransactItems: [
        // Deactivate current
        {
          Update: {
            TableName: getRemoteConfigsTableName(),
            Key: {
              PK: `CONFIG#${platform}#${environment}`,
              SK: `PARAM#${parameterKey}#V#${currentActive.version}`,
            },
            UpdateExpression: "SET isActive = :false REMOVE GSI1PK, GSI1SK",
            ExpressionAttributeValues: {
              ":false": false,
            },
          },
        },
        // Activate target
        {
          Update: {
            TableName: getRemoteConfigsTableName(),
            Key: {
              PK: `CONFIG#${platform}#${environment}`,
              SK: `PARAM#${parameterKey}#V#${version}`,
            },
            UpdateExpression:
              "SET isActive = :true, GSI1PK = :gsiPk, GSI1SK = :gsiSk",
            ExpressionAttributeValues: {
              ":true": true,
              ":gsiPk": `CONFIG#${platform}#${environment}#ACTIVE`,
              ":gsiSk": `PARAM#${parameterKey}`,
            },
          },
        },
      ],
    });

    await dynamoDBClient.send(transactCommand);

    // Return the now-active version
    return {
      ...targetVersion,
      isActive: true,
    };
  }

  /**
   * Counts active parameters in an environment.
   */
  async count(platform: string, environment: string): Promise<number> {
    const params: QueryCommandInput = {
      TableName: getRemoteConfigsTableName(),
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1PK = :gsiPk",
      ExpressionAttributeValues: {
        ":gsiPk": `CONFIG#${platform}#${environment}#ACTIVE`,
      },
      Select: "COUNT",
    };

    const result = await dynamoDBClient.send(new QueryCommand(params));
    return result.Count || 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Gets a specific version of a parameter.
   */
  private async getVersion(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string,
  ): Promise<ConfigParameter | null> {
    const params = {
      TableName: getRemoteConfigsTableName(),
      Key: {
        PK: `CONFIG#${platform}#${environment}`,
        SK: `PARAM#${parameterKey}#V#${version}`,
      },
    };

    const result = await dynamoDBClient.send(new GetCommand(params));
    return result.Item
      ? this.mapToConfigParameter(result.Item as Record<string, unknown>)
      : null;
  }

  /**
   * Maps DynamoDB item to ConfigParameter by removing DynamoDB-specific fields.
   */
  private mapToConfigParameter(item: Record<string, unknown>): ConfigParameter {
    const { PK, SK, GSI1PK, GSI1SK, ...paramData } = item;
    return paramData as ConfigParameter;
  }
}
