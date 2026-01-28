/**
 * DynamoDB adapter for Statistics operations.
 *
 * @remarks
 * Implements `IStatsRepository` from @togglebox/stats package.
 * Uses atomic counters for efficient stat updates.
 *
 * **Sharding Strategy:**
 * To prevent hot partition issues at scale, stats are sharded across multiple
 * partition keys using consistent hashing. This distributes write load across
 * DynamoDB partitions, allowing for higher throughput.
 *
 * - Write operations: Use sharded PK based on hash of flag/experiment key
 * - Read operations: Aggregate across all shards for complete stats
 */

import { UpdateCommand, GetCommand, QueryCommand, DeleteCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type {
  ConfigStats,
  FlagStats,
  FlagStatsByCountry,
  FlagStatsDaily,
  ExperimentStats,
  ExperimentMetricStats,
  StatsEvent,
} from '@togglebox/stats';
import type { IStatsRepository } from '@togglebox/stats';
import { dynamoDBClient, getStatsTableName } from '../../database';

/**
 * Simple concurrency limiter for batch processing.
 * Limits the number of concurrent promises to avoid overwhelming the database.
 */
function pLimit(concurrency: number): <T>(fn: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: (() => void)[] = [];

  const next = (): void => {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  };

  return <T>(fn: () => Promise<T>): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      const run = async (): Promise<void> => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          active--;
          next();
        }
      };

      if (active < concurrency) {
        active++;
        run();
      } else {
        queue.push(() => run());
      }
    });
  };
}

// Type for DynamoDB item
type DynamoItem = Record<string, unknown>;

/**
 * Number of shards for distributing stats writes.
 * With 10 shards, we can handle ~35,000 WCU before hitting partition limits.
 */
const STATS_SHARD_COUNT = 10;

/**
 * Hash a string using djb2 algorithm for consistent shard assignment.
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0; // Convert to unsigned 32-bit integer
}

/**
 * DynamoDB implementation of Stats repository.
 *
 * @remarks
 * Table schema (sharded for high throughput):
 * - PK: `STATS#${platform}#${env}#SHARD#${shard}` (for writes)
 * - SK: `STATS#{type}#{key}` or `STATS#{type}#{key}#DATE#{date}`
 *
 * Uses atomic UpdateCommand with SET and ADD operations for counters.
 * Sharding prevents hot partitions at scale (>3,500 WCU per partition).
 */
export class DynamoDBStatsRepository implements IStatsRepository {
  private getTableName(): string {
    return getStatsTableName();
  }

  /**
   * Get a sharded partition key for write operations.
   * The shard is determined by hashing the item key (flag/config/experiment key).
   */
  private getShardedPK(platform: string, environment: string, itemKey: string): string {
    const shard = hashString(itemKey) % STATS_SHARD_COUNT;
    return `STATS#${platform}#${environment}#SHARD#${shard}`;
  }

  /**
   * Get all shard PKs for read aggregation.
   */
  private getAllShardPKs(platform: string, environment: string): string[] {
    const pks: string[] = [];
    for (let shard = 0; shard < STATS_SHARD_COUNT; shard++) {
      pks.push(`STATS#${platform}#${environment}#SHARD#${shard}`);
    }
    return pks;
  }

  // =========================================================================
  // CONFIG STATS
  // =========================================================================

  /**
   * Increment fetch count for a Remote Config.
   * Uses sharded PK to distribute writes across partitions.
   */
  async incrementConfigFetch(
    platform: string,
    environment: string,
    configKey: string,
    _clientId?: string
  ): Promise<void> {
    const pk = this.getShardedPK(platform, environment, configKey);
    const sk = `STATS#CONFIG#${configKey}`;
    const now = new Date().toISOString();

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'ADD fetchCount :inc SET lastFetchedAt = :now, platform = :platform, environment = :env, configKey = :key',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': now,
        ':platform': platform,
        ':env': environment,
        ':key': configKey,
      },
    }));
  }

  /**
   * Get stats for a Remote Config.
   * Reads from the specific shard where this config's stats are stored.
   */
  async getConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<ConfigStats | null> {
    const pk = this.getShardedPK(platform, environment, configKey);
    const sk = `STATS#CONFIG#${configKey}`;

    const result = await dynamoDBClient.send(new GetCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
    }));

    if (!result.Item) {
      return null;
    }

    const item = result.Item as DynamoItem;

    return {
      platform: item['platform'] as string,
      environment: item['environment'] as string,
      configKey: item['configKey'] as string,
      fetchCount: (item['fetchCount'] as number) || 0,
      lastFetchedAt: item['lastFetchedAt'] as string | undefined,
      uniqueClients24h: (item['uniqueClients24h'] as number) || 0,
      updatedAt: (item['lastFetchedAt'] as string) || new Date().toISOString(),
    };
  }

  // =========================================================================
  // FLAG STATS
  // =========================================================================

  /**
   * Increment evaluation count for a Feature Flag.
   * Uses sharded PK to distribute writes across partitions.
   */
  async incrementFlagEvaluation(
    platform: string,
    environment: string,
    flagKey: string,
    value: 'A' | 'B',
    _userId: string,
    country?: string
  ): Promise<void> {
    const pk = this.getShardedPK(platform, environment, flagKey);
    const sk = `STATS#FLAG#${flagKey}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD

    // Update main stats
    const updateExpression = value === 'A'
      ? 'ADD totalEvaluations :inc, valueACount :inc SET lastEvaluatedAt = :now, platform = :platform, environment = :env, flagKey = :key'
      : 'ADD totalEvaluations :inc, valueBCount :inc SET lastEvaluatedAt = :now, platform = :platform, environment = :env, flagKey = :key';

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': now,
        ':platform': platform,
        ':env': environment,
        ':key': flagKey,
      },
    }));

    // Update daily stats
    const dailySK = `STATS#FLAG#${flagKey}#DATE#${today}`;
    const dailyUpdateExpression = value === 'A'
      ? 'ADD valueACount :inc SET #date = :date'
      : 'ADD valueBCount :inc SET #date = :date';

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: dailySK },
      UpdateExpression: dailyUpdateExpression,
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: {
        ':inc': 1,
        ':date': today,
      },
    }));

    // Update country stats if provided (use country-specific shard key)
    if (country) {
      const countryShardKey = `${flagKey}#${country}`;
      const countryPK = this.getShardedPK(platform, environment, countryShardKey);
      const countrySK = `STATS#FLAG#${flagKey}#COUNTRY#${country}`;
      const countryUpdateExpression = value === 'A'
        ? 'ADD valueACount :inc SET country = :country'
        : 'ADD valueBCount :inc SET country = :country';

      await dynamoDBClient.send(new UpdateCommand({
        TableName: this.getTableName(),
        Key: { PK: countryPK, SK: countrySK },
        UpdateExpression: countryUpdateExpression,
        ExpressionAttributeValues: {
          ':inc': 1,
          ':country': country,
        },
      }));
    }
  }

  /**
   * Get stats for a Feature Flag.
   * Reads from the specific shard where this flag's stats are stored.
   */
  async getFlagStats(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<FlagStats | null> {
    const pk = this.getShardedPK(platform, environment, flagKey);
    const sk = `STATS#FLAG#${flagKey}`;

    const result = await dynamoDBClient.send(new GetCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
    }));

    if (!result.Item) {
      return null;
    }

    const item = result.Item as DynamoItem;

    return {
      platform: item['platform'] as string,
      environment: item['environment'] as string,
      flagKey: item['flagKey'] as string,
      totalEvaluations: (item['totalEvaluations'] as number) || 0,
      valueACount: (item['valueACount'] as number) || 0,
      valueBCount: (item['valueBCount'] as number) || 0,
      uniqueUsersA24h: (item['uniqueUsersA24h'] as number) || 0,
      uniqueUsersB24h: (item['uniqueUsersB24h'] as number) || 0,
      lastEvaluatedAt: item['lastEvaluatedAt'] as string | undefined,
      updatedAt: (item['lastEvaluatedAt'] as string) || new Date().toISOString(),
    };
  }

  /**
   * Get country breakdown for a Feature Flag.
   * Aggregates across all shards since country stats are distributed.
   */
  async getFlagStatsByCountry(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<FlagStatsByCountry[]> {
    const allShardPKs = this.getAllShardPKs(platform, environment);
    const countryStatsMap = new Map<string, FlagStatsByCountry>();

    // Query all shards in parallel
    const queries = allShardPKs.map(pk =>
      dynamoDBClient.send(new QueryCommand({
        TableName: this.getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': `STATS#FLAG#${flagKey}#COUNTRY#`,
        },
      }))
    );

    const results = await Promise.all(queries);

    // Aggregate results from all shards
    for (const result of results) {
      for (const item of result.Items || []) {
        const dynItem = item as DynamoItem;
        const country = dynItem['country'] as string;
        const existing = countryStatsMap.get(country);

        if (existing) {
          existing.valueACount += (dynItem['valueACount'] as number) || 0;
          existing.valueBCount += (dynItem['valueBCount'] as number) || 0;
        } else {
          countryStatsMap.set(country, {
            country,
            valueACount: (dynItem['valueACount'] as number) || 0,
            valueBCount: (dynItem['valueBCount'] as number) || 0,
          });
        }
      }
    }

    return Array.from(countryStatsMap.values());
  }

  /**
   * Get daily time series for a Feature Flag.
   * Reads from the specific shard where this flag's stats are stored.
   */
  async getFlagStatsDaily(
    platform: string,
    environment: string,
    flagKey: string,
    days: number = 30
  ): Promise<FlagStatsDaily[]> {
    const pk = this.getShardedPK(platform, environment, flagKey);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :start AND :end',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':start': `STATS#FLAG#${flagKey}#DATE#${startDateStr}`,
        ':end': `STATS#FLAG#${flagKey}#DATE#${today.toISOString().split('T')[0]}`,
      },
    }));

    return (result.Items || []).map(item => {
      const dynItem = item as DynamoItem;
      return {
        date: dynItem['date'] as string,
        valueACount: (dynItem['valueACount'] as number) || 0,
        valueBCount: (dynItem['valueBCount'] as number) || 0,
      };
    });
  }

  // =========================================================================
  // EXPERIMENT STATS
  // =========================================================================

  /**
   * Record an experiment exposure.
   * Uses sharded PK to distribute writes across partitions.
   */
  async recordExperimentExposure(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    _userId: string
  ): Promise<void> {
    // Shard by experiment+variation for even distribution
    const shardKey = `${experimentKey}#${variationKey}`;
    const pk = this.getShardedPK(platform, environment, shardKey);
    const sk = `STATS#EXP#${experimentKey}#VAR#${variationKey}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update variation stats
    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'ADD participants :inc, exposures :inc SET lastExposureAt = :now, experimentKey = :expKey, variationKey = :varKey',
      ExpressionAttributeValues: {
        ':inc': 1,
        ':now': now,
        ':expKey': experimentKey,
        ':varKey': variationKey,
      },
    }));

    // Update daily variation stats
    const dailySK = `STATS#EXP#${experimentKey}#VAR#${variationKey}#DATE#${today}`;
    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: dailySK },
      UpdateExpression: 'ADD participants :inc SET #date = :date, variationKey = :varKey',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: {
        ':inc': 1,
        ':date': today,
        ':varKey': variationKey,
      },
    }));
  }

  /**
   * Record a conversion event.
   * Uses sharded PK to distribute writes across partitions.
   */
  async recordConversion(
    platform: string,
    environment: string,
    experimentKey: string,
    metricId: string,
    variationKey: string,
    _userId: string,
    value?: number
  ): Promise<void> {
    // Shard by experiment+variation+metric for even distribution
    const shardKey = `${experimentKey}#${variationKey}#${metricId}`;
    const pk = this.getShardedPK(platform, environment, shardKey);
    const sk = `STATS#EXP#${experimentKey}#VAR#${variationKey}#METRIC#${metricId}`;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update metric stats
    let updateExpression = 'ADD conversions :inc, sampleSize :inc SET lastConversionAt = :now, experimentKey = :expKey, variationKey = :varKey, metricId = :metricId';
    const expressionAttributeValues: Record<string, unknown> = {
      ':inc': 1,
      ':now': now,
      ':expKey': experimentKey,
      ':varKey': variationKey,
      ':metricId': metricId,
    };

    if (value !== undefined) {
      updateExpression += ' ADD sumValue :value';
      expressionAttributeValues[':value'] = value;
    }

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    // Update daily metric stats
    const dailySK = `STATS#EXP#${experimentKey}#VAR#${variationKey}#METRIC#${metricId}#DATE#${today}`;
    let dailyUpdateExpression = 'ADD conversions :inc, sampleSize :inc SET #date = :date';
    const dailyExpressionAttributeValues: Record<string, unknown> = {
      ':inc': 1,
      ':date': today,
    };

    if (value !== undefined) {
      dailyUpdateExpression += ' ADD sumValue :value';
      dailyExpressionAttributeValues[':value'] = value;
    }

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: dailySK },
      UpdateExpression: dailyUpdateExpression,
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: dailyExpressionAttributeValues,
    }));
  }

  /**
   * Get full stats for an Experiment.
   * Aggregates across all shards since variation stats are distributed.
   */
  async getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<ExperimentStats | null> {
    const allShardPKs = this.getAllShardPKs(platform, environment);
    const variationStatsMap = new Map<string, { variationKey: string; participants: number; exposures: number }>();

    // Query all shards in parallel
    const queries = allShardPKs.map(pk =>
      dynamoDBClient.send(new QueryCommand({
        TableName: this.getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'attribute_exists(variationKey) AND attribute_not_exists(metricId) AND attribute_not_exists(#date)',
        ExpressionAttributeNames: { '#date': 'date' },
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': `STATS#EXP#${experimentKey}#VAR#`,
        },
      }))
    );

    const results = await Promise.all(queries);

    // Aggregate results from all shards
    for (const result of results) {
      for (const item of result.Items || []) {
        const dynItem = item as DynamoItem;
        const variationKey = dynItem['variationKey'] as string;
        const existing = variationStatsMap.get(variationKey);

        if (existing) {
          existing.participants += (dynItem['participants'] as number) || 0;
          existing.exposures += (dynItem['exposures'] as number) || 0;
        } else {
          variationStatsMap.set(variationKey, {
            variationKey,
            participants: (dynItem['participants'] as number) || 0,
            exposures: (dynItem['exposures'] as number) || 0,
          });
        }
      }
    }

    if (variationStatsMap.size === 0) {
      return null;
    }

    const variations = Array.from(variationStatsMap.values());

    return {
      platform,
      environment,
      experimentKey,
      variations,
      metricResults: [], // Populated separately via getExperimentMetricStats
      dailyData: [],     // Populated separately via time-series queries
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get metric stats for a specific variation and metric.
   * Reads from the specific shard where this metric's stats are stored.
   */
  async getExperimentMetricStats(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    metricId: string
  ): Promise<ExperimentMetricStats[]> {
    // Use same shard key as recordConversion
    const shardKey = `${experimentKey}#${variationKey}#${metricId}`;
    const pk = this.getShardedPK(platform, environment, shardKey);

    // Query daily metric stats
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `STATS#EXP#${experimentKey}#VAR#${variationKey}#METRIC#${metricId}#DATE#`,
      },
    }));

    return (result.Items || []).map(item => {
      const dynItem = item as DynamoItem;
      return {
        platform,
        environment,
        experimentKey,
        variationKey,
        metricId,
        date: dynItem['date'] as string,
        sampleSize: (dynItem['sampleSize'] as number) || 0,
        sum: (dynItem['sumValue'] as number) || 0,
        count: (dynItem['count'] as number) || 0,
        conversions: (dynItem['conversions'] as number) || 0,
      };
    });
  }

  // =========================================================================
  // BATCH PROCESSING
  // =========================================================================

  /**
   * Process a batch of events from SDK.
   * Uses parallel processing with concurrency limit for better performance.
   */
  async processBatch(
    platform: string,
    environment: string,
    events: StatsEvent[]
  ): Promise<void> {
    // Limit concurrency to avoid overwhelming the database
    const limit = pLimit(25);

    const processEvent = async (event: StatsEvent): Promise<void> => {
      try {
        switch (event.type) {
          case 'config_fetch':
            await this.incrementConfigFetch(platform, environment, event.key, event.clientId);
            break;

          case 'flag_evaluation':
            await this.incrementFlagEvaluation(
              platform,
              environment,
              event.flagKey,
              event.value,
              event.userId,
              event.country
            );
            break;

          case 'experiment_exposure':
            await this.recordExperimentExposure(
              platform,
              environment,
              event.experimentKey,
              event.variationKey,
              event.userId
            );
            break;

          case 'conversion':
            await this.recordConversion(
              platform,
              environment,
              event.experimentKey,
              event.metricName, // metricName in the event maps to metricId in the repository
              event.variationKey,
              event.userId,
              event.value
            );
            break;

          case 'custom_event':
            // Custom events are accepted but not persisted to database yet.
            // Log for visibility instead of silently dropping.
            console.log(`[stats] Custom event received: ${event.eventName} (userId: ${event.userId ?? 'anonymous'})`);
            break;
        }
      } catch (error) {
        // Log error but don't fail the entire batch
        console.error(`Failed to process ${event.type} event:`, error);
      }
    };

    await Promise.all(events.map((event) => limit(() => processEvent(event))));
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Delete all stats for a Remote Config.
   * Deletes from the specific shard where this config's stats are stored.
   */
  async deleteConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<void> {
    const pk = this.getShardedPK(platform, environment, configKey);
    const sk = `STATS#CONFIG#${configKey}`;

    await dynamoDBClient.send(new DeleteCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
    }));
  }

  /**
   * Delete all stats for a Feature Flag.
   * Queries all shards to find and delete all related stats.
   * SECURITY: Uses batch operations with pagination to avoid OOM and DynamoDB limits.
   */
  async deleteFlagStats(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<void> {
    const allShardPKs = this.getAllShardPKs(platform, environment);
    const tableName = this.getTableName();

    // Query all shards in parallel with limit to prevent large result sets
    const queries = allShardPKs.map(pk =>
      dynamoDBClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': `STATS#FLAG#${flagKey}`,
        },
        Limit: 1000, // Limit results per query
      }))
    );

    const results = await Promise.all(queries);

    // Collect all items to delete
    const itemsToDelete: { PK: string; SK: string }[] = [];
    for (const result of results) {
      for (const item of result.Items || []) {
        const dynItem = item as DynamoItem;
        itemsToDelete.push({
          PK: dynItem['PK'] as string,
          SK: dynItem['SK'] as string,
        });
      }
    }

    // Delete in batches of 25 (DynamoDB BatchWriteItem limit)
    for (let i = 0; i < itemsToDelete.length; i += 25) {
      const batch = itemsToDelete.slice(i, i + 25);
      await dynamoDBClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map(key => ({
            DeleteRequest: { Key: key },
          })),
        },
      }));
    }
  }

  /**
   * Delete all stats for an Experiment.
   * Queries all shards to find and delete all related stats.
   * SECURITY: Uses batch operations with pagination to avoid OOM and DynamoDB limits.
   */
  async deleteExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<void> {
    const allShardPKs = this.getAllShardPKs(platform, environment);
    const tableName = this.getTableName();

    // Query all shards in parallel with limit to prevent large result sets
    const queries = allShardPKs.map(pk =>
      dynamoDBClient.send(new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': `STATS#EXP#${experimentKey}`,
        },
        Limit: 1000, // Limit results per query
      }))
    );

    const results = await Promise.all(queries);

    // Collect all items to delete
    const itemsToDelete: { PK: string; SK: string }[] = [];
    for (const result of results) {
      for (const item of result.Items || []) {
        const dynItem = item as DynamoItem;
        itemsToDelete.push({
          PK: dynItem['PK'] as string,
          SK: dynItem['SK'] as string,
        });
      }
    }

    // Delete in batches of 25 (DynamoDB BatchWriteItem limit)
    for (let i = 0; i < itemsToDelete.length; i += 25) {
      const batch = itemsToDelete.slice(i, i + 25);
      await dynamoDBClient.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map(key => ({
            DeleteRequest: { Key: key },
          })),
        },
      }));
    }
  }
}
