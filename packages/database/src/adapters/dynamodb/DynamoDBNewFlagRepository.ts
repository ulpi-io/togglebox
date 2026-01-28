/**
 * DynamoDB adapter for the Flag model (2-value, country/language targeting).
 *
 * @remarks
 * Implements `IFlagRepository` from @togglebox/flags package.
 * This is the 2-value model with exactly 2 values (A/B).
 */

import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import type {
  Flag,
  CreateFlag,
  UpdateFlag,
  UpdateRollout,
} from "@togglebox/flags";
import type { IFlagRepository, FlagPage } from "@togglebox/flags";
import {
  NotFoundError,
  BadRequestError,
} from "@togglebox/shared";
import { dynamoDBClient, getFlagsTableName } from "../../database";

// Type for DynamoDB item
type DynamoItem = Record<string, unknown>;

/**
 * Safely decode pagination cursor.
 * @throws BadRequestError with user-friendly message if cursor is invalid
 */
function decodeCursor(
  cursor: string | undefined,
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
  } catch {
    throw new BadRequestError("Invalid pagination token");
  }
}

/**
 * DynamoDB implementation of the new Feature Flag repository.
 *
 * @remarks
 * Table schema:
 * - PK: `PLATFORM#{platform}#ENV#{env}`
 * - SK: `FLAG#{flagKey}#V#{version}`
 * - GSI1PK: `PLATFORM#{platform}#ENV#{env}`
 * - GSI1SK: `ACTIVE#FLAG#{flagKey}` (only for active versions)
 */
export class DynamoDBNewFlagRepository implements IFlagRepository {
  private getTableName(): string {
    return getFlagsTableName();
  }

  private getPK(platform: string, environment: string): string {
    return `PLATFORM#${platform}#ENV#${environment}`;
  }

  private getSK(flagKey: string, version: string): string {
    return `FLAG#${flagKey}#V#${version}`;
  }

  private getActiveSK(flagKey: string): string {
    return `ACTIVE#FLAG#${flagKey}`;
  }

  /**
   * Creates a new Feature Flag (version 1.0.0).
   */
  async create(data: CreateFlag): Promise<Flag> {
    const now = new Date().toISOString();
    const version = "1.0.0";

    const flag: Flag = {
      platform: data.platform,
      environment: data.environment,
      flagKey: data.flagKey,
      name: data.name,
      description: data.description,
      enabled: data.enabled ?? false,
      flagType: data.flagType ?? "boolean",
      valueA: data.valueA ?? true,
      valueB: data.valueB ?? false,
      targeting: data.targeting ?? {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      defaultValue: data.defaultValue ?? "B",
      // Percentage rollout (disabled by default)
      rolloutEnabled: data.rolloutEnabled ?? false,
      rolloutPercentageA: data.rolloutPercentageA ?? 100,
      rolloutPercentageB: data.rolloutPercentageB ?? 0,
      version,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const pk = this.getPK(flag.platform, flag.environment);
    const sk = this.getSK(flag.flagKey, version);

    await dynamoDBClient.send(
      new PutCommand({
        TableName: this.getTableName(),
        Item: {
          PK: pk,
          SK: sk,
          GSI1PK: pk,
          GSI1SK: this.getActiveSK(flag.flagKey),
          ...flag,
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );

    return flag;
  }

  /**
   * Updates a Feature Flag by creating a new version.
   */
  async update(
    platform: string,
    environment: string,
    flagKey: string,
    data: UpdateFlag,
  ): Promise<Flag> {
    // Get current active version
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new NotFoundError(`Feature flag not found: ${flagKey}`);
    }

    // Parse current version and increment
    const [major, minor, patch] = current.version.split(".").map(Number);
    const newVersion = `${major}.${minor}.${(patch ?? 0) + 1}`;
    const now = new Date().toISOString();

    const pk = this.getPK(platform, environment);

    // Create new version
    const newFlag: Flag = {
      ...current,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      enabled: data.enabled ?? current.enabled,
      valueA: data.valueA ?? current.valueA,
      valueB: data.valueB ?? current.valueB,
      targeting: data.targeting ?? current.targeting,
      defaultValue: data.defaultValue ?? current.defaultValue,
      // Percentage rollout
      rolloutEnabled: data.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA: data.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB: data.rolloutPercentageB ?? current.rolloutPercentageB,
      version: newVersion,
      isActive: true,
      createdBy: data.createdBy,
      updatedAt: now,
    };

    // Use TransactWrite for atomic update (deactivate old + create new)
    const { TransactWriteCommand } = await import("@aws-sdk/lib-dynamodb");

    await dynamoDBClient.send(
      new TransactWriteCommand({
        TransactItems: [
          // Deactivate old version
          {
            Update: {
              TableName: this.getTableName(),
              Key: {
                PK: pk,
                SK: this.getSK(flagKey, current.version),
              },
              UpdateExpression:
                "SET isActive = :inactive REMOVE GSI1PK, GSI1SK",
              ExpressionAttributeValues: {
                ":inactive": false,
              },
            },
          },
          // Create new version
          {
            Put: {
              TableName: this.getTableName(),
              Item: {
                PK: pk,
                SK: this.getSK(flagKey, newVersion),
                GSI1PK: pk,
                GSI1SK: this.getActiveSK(flagKey),
                ...newFlag,
              },
            },
          },
        ],
      }),
    );

    return newFlag;
  }

  /**
   * Toggle a flag's enabled state (in-place update, no new version).
   */
  async toggle(
    platform: string,
    environment: string,
    flagKey: string,
    enabled: boolean,
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new NotFoundError(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();
    const pk = this.getPK(platform, environment);
    const sk = this.getSK(flagKey, current.version);

    await dynamoDBClient.send(
      new UpdateCommand({
        TableName: this.getTableName(),
        Key: { PK: pk, SK: sk },
        UpdateExpression: "SET enabled = :enabled, updatedAt = :now",
        ExpressionAttributeValues: {
          ":enabled": enabled,
          ":now": now,
        },
      }),
    );

    return {
      ...current,
      enabled,
      updatedAt: now,
    };
  }

  /**
   * Get the active version of a Feature Flag.
   */
  async getActive(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag | null> {
    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(
      new QueryCommand({
        TableName: this.getTableName(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND GSI1SK = :sk",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":sk": this.getActiveSK(flagKey),
        },
        Limit: 1,
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.itemToFlag(result.Items[0] as DynamoItem);
  }

  /**
   * Get a specific version of a Feature Flag.
   */
  async getVersion(
    platform: string,
    environment: string,
    flagKey: string,
    version: string,
  ): Promise<Flag | null> {
    const pk = this.getPK(platform, environment);
    const sk = this.getSK(flagKey, version);

    const result = await dynamoDBClient.send(
      new GetCommand({
        TableName: this.getTableName(),
        Key: { PK: pk, SK: sk },
      }),
    );

    if (!result.Item) {
      return null;
    }

    return this.itemToFlag(result.Item as DynamoItem);
  }

  /**
   * List all active Feature Flags for a platform+environment.
   */
  async listActive(
    platform: string,
    environment: string,
    limit?: number,
    cursor?: string,
  ): Promise<FlagPage> {
    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(
      new QueryCommand({
        TableName: this.getTableName(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk AND begins_with(GSI1SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": "ACTIVE#FLAG#",
        },
        Limit: limit || 100,
        ExclusiveStartKey: decodeCursor(cursor),
      }),
    );

    const items = (result.Items || []).map((item) =>
      this.itemToFlag(item as DynamoItem),
    );
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64")
      : undefined;

    return {
      items,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  /**
   * List all versions of a Feature Flag.
   */
  async listVersions(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<Flag[]> {
    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(
      new QueryCommand({
        TableName: this.getTableName(),
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": pk,
          ":prefix": `FLAG#${flagKey}#V#`,
        },
        ScanIndexForward: false, // Newest first
      }),
    );

    return (result.Items || []).map((item) =>
      this.itemToFlag(item as DynamoItem),
    );
  }

  /**
   * Delete a Feature Flag and all its versions.
   * Uses batch delete for better performance with many versions.
   */
  async delete(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<void> {
    const versions = await this.listVersions(platform, environment, flagKey);
    if (versions.length === 0) {
      throw new NotFoundError(`Feature flag not found: ${flagKey}`);
    }

    const pk = this.getPK(platform, environment);
    const tableName = this.getTableName();

    // Batch delete in chunks of 25 (DynamoDB limit)
    const deleteRequests = versions.map((version) => ({
      DeleteRequest: {
        Key: {
          PK: pk,
          SK: this.getSK(flagKey, version.version),
        },
      },
    }));

    // Process in batches of 25
    for (let i = 0; i < deleteRequests.length; i += 25) {
      const batch = deleteRequests.slice(i, i + 25);

      let itemsToProcess = batch;
      let retryCount = 0;
      const maxRetries = 5;

      while (itemsToProcess.length > 0 && retryCount < maxRetries) {
        const result = await dynamoDBClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: itemsToProcess,
            },
          }),
        );

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

      if (itemsToProcess.length > 0 && retryCount >= maxRetries) {
        console.error(
          `[DynamoDB] Failed to delete ${itemsToProcess.length} flag versions after ${maxRetries} retries`,
        );
      }
    }
  }

  /**
   * Check if a Feature Flag exists.
   */
  async exists(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<boolean> {
    const flag = await this.getActive(platform, environment, flagKey);
    return flag !== null;
  }

  /**
   * Convert DynamoDB item to Flag type.
   * Includes defaults for rollout fields for backward compatibility with old items.
   */
  private itemToFlag(item: DynamoItem): Flag {
    return {
      platform: item["platform"] as string,
      environment: item["environment"] as string,
      flagKey: item["flagKey"] as string,
      name: item["name"] as string,
      description: item["description"] as string | undefined,
      enabled: item["enabled"] as boolean,
      flagType: item["flagType"] as "boolean" | "string" | "number",
      valueA: item["valueA"] as boolean | string | number,
      valueB: item["valueB"] as boolean | string | number,
      targeting: item["targeting"] as Flag["targeting"],
      defaultValue: item["defaultValue"] as "A" | "B",
      // Percentage rollout (defaults for backward compatibility)
      rolloutEnabled: (item["rolloutEnabled"] as boolean) ?? false,
      rolloutPercentageA: (item["rolloutPercentageA"] as number) ?? 100,
      rolloutPercentageB: (item["rolloutPercentageB"] as number) ?? 0,
      version: item["version"] as string,
      isActive: item["isActive"] as boolean,
      createdBy: item["createdBy"] as string,
      createdAt: item["createdAt"] as string,
      updatedAt: item["updatedAt"] as string,
    };
  }

  /**
   * Update rollout settings in-place (no new version created).
   * This allows quick percentage changes without creating a new version.
   */
  async updateRolloutSettings(
    platform: string,
    environment: string,
    flagKey: string,
    settings: UpdateRollout,
  ): Promise<Flag> {
    const current = await this.getActive(platform, environment, flagKey);
    if (!current) {
      throw new NotFoundError(`Feature flag not found: ${flagKey}`);
    }

    const now = new Date().toISOString();
    const pk = this.getPK(platform, environment);
    const sk = this.getSK(flagKey, current.version);

    // Build update expression dynamically based on provided settings
    const updateParts: string[] = ["updatedAt = :now"];
    const expressionValues: Record<string, unknown> = { ":now": now };

    if (settings.rolloutEnabled !== undefined) {
      updateParts.push("rolloutEnabled = :enabled");
      expressionValues[":enabled"] = settings.rolloutEnabled;
    }

    if (settings.rolloutPercentageA !== undefined) {
      updateParts.push("rolloutPercentageA = :pctA");
      expressionValues[":pctA"] = settings.rolloutPercentageA;
    }

    if (settings.rolloutPercentageB !== undefined) {
      updateParts.push("rolloutPercentageB = :pctB");
      expressionValues[":pctB"] = settings.rolloutPercentageB;
    }

    await dynamoDBClient.send(
      new UpdateCommand({
        TableName: this.getTableName(),
        Key: { PK: pk, SK: sk },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeValues: expressionValues,
      }),
    );

    return {
      ...current,
      rolloutEnabled: settings.rolloutEnabled ?? current.rolloutEnabled,
      rolloutPercentageA:
        settings.rolloutPercentageA ?? current.rolloutPercentageA,
      rolloutPercentageB:
        settings.rolloutPercentageB ?? current.rolloutPercentageB,
      updatedAt: now,
    };
  }
}
