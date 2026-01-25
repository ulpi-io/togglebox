/**
 * DynamoDB adapter for Statistics operations.
 *
 * @remarks
 * Implements `IStatsRepository` from @togglebox/stats package.
 * Uses atomic counters for efficient stat updates.
 */

import { UpdateCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
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

// Type for DynamoDB item
type DynamoItem = Record<string, unknown>;

/**
 * DynamoDB implementation of Stats repository.
 *
 * @remarks
 * Table schema:
 * - PK: `PLATFORM#{platform}#ENV#{env}`
 * - SK: `STATS#{type}#{key}` or `STATS#{type}#{key}#DATE#{date}`
 *
 * Uses atomic UpdateCommand with SET and ADD operations for counters.
 */
export class DynamoDBStatsRepository implements IStatsRepository {
  private getTableName(): string {
    return getStatsTableName();
  }

  private getPK(platform: string, environment: string): string {
    return `PLATFORM#${platform}#ENV#${environment}`;
  }

  // =========================================================================
  // CONFIG STATS
  // =========================================================================

  /**
   * Increment fetch count for a Remote Config.
   */
  async incrementConfigFetch(
    platform: string,
    environment: string,
    configKey: string,
    _clientId?: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);
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
   */
  async getConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<ConfigStats | null> {
    const pk = this.getPK(platform, environment);
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
   */
  async incrementFlagEvaluation(
    platform: string,
    environment: string,
    flagKey: string,
    value: 'A' | 'B',
    _userId: string,
    country?: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);
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

    // Update country stats if provided
    if (country) {
      const countrySK = `STATS#FLAG#${flagKey}#COUNTRY#${country}`;
      const countryUpdateExpression = value === 'A'
        ? 'ADD valueACount :inc SET country = :country'
        : 'ADD valueBCount :inc SET country = :country';

      await dynamoDBClient.send(new UpdateCommand({
        TableName: this.getTableName(),
        Key: { PK: pk, SK: countrySK },
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
   */
  async getFlagStats(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<FlagStats | null> {
    const pk = this.getPK(platform, environment);
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
   */
  async getFlagStatsByCountry(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<FlagStatsByCountry[]> {
    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `STATS#FLAG#${flagKey}#COUNTRY#`,
      },
    }));

    return (result.Items || []).map(item => {
      const dynItem = item as DynamoItem;
      return {
        country: dynItem['country'] as string,
        valueACount: (dynItem['valueACount'] as number) || 0,
        valueBCount: (dynItem['valueBCount'] as number) || 0,
      };
    });
  }

  /**
   * Get daily time series for a Feature Flag.
   */
  async getFlagStatsDaily(
    platform: string,
    environment: string,
    flagKey: string,
    days: number = 30
  ): Promise<FlagStatsDaily[]> {
    const pk = this.getPK(platform, environment);
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
   */
  async recordExperimentExposure(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    _userId: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);
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
    const pk = this.getPK(platform, environment);
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
    let dailyUpdateExpression = 'ADD conversions :inc SET #date = :date';
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
   */
  async getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<ExperimentStats | null> {
    const pk = this.getPK(platform, environment);

    // Query all variation stats
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'attribute_exists(variationKey) AND attribute_not_exists(metricId) AND attribute_not_exists(#date)',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `STATS#EXP#${experimentKey}#VAR#`,
      },
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    const variations = result.Items.map(item => {
      const dynItem = item as DynamoItem;
      return {
        variationKey: dynItem['variationKey'] as string,
        participants: (dynItem['participants'] as number) || 0,
        exposures: (dynItem['exposures'] as number) || 0,
      };
    });

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
   */
  async getExperimentMetricStats(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    metricId: string
  ): Promise<ExperimentMetricStats[]> {
    const pk = this.getPK(platform, environment);

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
   */
  async processBatch(
    platform: string,
    environment: string,
    events: StatsEvent[]
  ): Promise<void> {
    for (const event of events) {
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
      }
    }
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================

  /**
   * Delete all stats for a Remote Config.
   */
  async deleteConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);
    const sk = `STATS#CONFIG#${configKey}`;

    await dynamoDBClient.send(new DeleteCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
    }));
  }

  /**
   * Delete all stats for a Feature Flag.
   */
  async deleteFlagStats(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);

    // Query all flag stats
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `STATS#FLAG#${flagKey}`,
      },
    }));

    // Delete all items
    for (const item of result.Items || []) {
      const dynItem = item as DynamoItem;
      await dynamoDBClient.send(new DeleteCommand({
        TableName: this.getTableName(),
        Key: {
          PK: dynItem['PK'],
          SK: dynItem['SK'],
        },
      }));
    }
  }

  /**
   * Delete all stats for an Experiment.
   */
  async deleteExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<void> {
    const pk = this.getPK(platform, environment);

    // Query all experiment stats
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `STATS#EXP#${experimentKey}`,
      },
    }));

    // Delete all items
    for (const item of result.Items || []) {
      const dynItem = item as DynamoItem;
      await dynamoDBClient.send(new DeleteCommand({
        TableName: this.getTableName(),
        Key: {
          PK: dynItem['PK'],
          SK: dynItem['SK'],
        },
      }));
    }
  }
}
