/**
 * DynamoDB adapter for Experiment operations.
 *
 * @remarks
 * Implements `IExperimentRepository` from @togglebox/experiments package.
 * Experiments support multiple variants with traffic allocation and metrics.
 */

import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type {
  Experiment,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
} from '@togglebox/experiments';
import type { IExperimentRepository, ExperimentPage } from '@togglebox/experiments';
import { dynamoDBClient, getExperimentsTableName } from '../../database';

// Type for DynamoDB item
type DynamoItem = Record<string, unknown>;

/**
 * DynamoDB implementation of Experiment repository.
 */
export class DynamoDBExperimentRepository implements IExperimentRepository {
  private getTableName(): string {
    return getExperimentsTableName();
  }

  private getPK(platform: string, environment: string): string {
    return `PLATFORM#${platform}#ENV#${environment}`;
  }

  private getSK(experimentKey: string, version: string): string {
    return `EXP#${experimentKey}#V#${version}`;
  }

  private getStatusPK(platform: string, environment: string, status: ExperimentStatus): string {
    return `PLATFORM#${platform}#ENV#${environment}#STATUS#${status}`;
  }

  async create(data: CreateExperiment): Promise<Experiment> {
    const now = new Date().toISOString();
    const version = '1.0.0';
    const status: ExperimentStatus = 'draft';

    const experiment: Experiment = {
      platform: data.platform,
      environment: data.environment,
      experimentKey: data.experimentKey,
      name: data.name,
      description: data.description,
      hypothesis: data.hypothesis,
      status,
      variations: data.variations,
      controlVariation: data.controlVariation,
      trafficAllocation: data.trafficAllocation,
      targeting: data.targeting ?? {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      },
      primaryMetric: data.primaryMetric,
      secondaryMetrics: data.secondaryMetrics,
      confidenceLevel: data.confidenceLevel ?? 0.95,
      minimumDetectableEffect: data.minimumDetectableEffect,
      minimumSampleSize: data.minimumSampleSize,
      scheduledStartAt: data.scheduledStartAt,
      scheduledEndAt: data.scheduledEndAt,
      version,
      isActive: true,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const pk = this.getPK(experiment.platform, experiment.environment);
    const sk = this.getSK(experiment.experimentKey, version);

    await dynamoDBClient.send(new PutCommand({
      TableName: this.getTableName(),
      Item: {
        PK: pk,
        SK: sk,
        GSI1PK: this.getStatusPK(experiment.platform, experiment.environment, status),
        GSI1SK: `EXP#${experiment.experimentKey}`,
        ...experiment,
      },
      ConditionExpression: 'attribute_not_exists(PK)',
    }));

    return experiment;
  }

  async update(
    platform: string,
    environment: string,
    experimentKey: string,
    data: UpdateExperiment
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'draft') {
      throw new Error(`Cannot update experiment in ${current.status} status`);
    }

    const now = new Date().toISOString();
    const pk = this.getPK(platform, environment);
    const sk = this.getSK(experimentKey, current.version);

    const updatedExperiment: Experiment = {
      ...current,
      name: data.name ?? current.name,
      description: data.description ?? current.description,
      hypothesis: data.hypothesis ?? current.hypothesis,
      variations: data.variations ?? current.variations,
      controlVariation: data.controlVariation ?? current.controlVariation,
      trafficAllocation: data.trafficAllocation ?? current.trafficAllocation,
      targeting: data.targeting ?? current.targeting,
      primaryMetric: data.primaryMetric ?? current.primaryMetric,
      secondaryMetrics: data.secondaryMetrics ?? current.secondaryMetrics,
      confidenceLevel: data.confidenceLevel ?? current.confidenceLevel,
      minimumDetectableEffect: data.minimumDetectableEffect ?? current.minimumDetectableEffect,
      minimumSampleSize: data.minimumSampleSize ?? current.minimumSampleSize,
      scheduledStartAt: data.scheduledStartAt ?? current.scheduledStartAt,
      scheduledEndAt: data.scheduledEndAt ?? current.scheduledEndAt,
      updatedAt: now,
    };

    await dynamoDBClient.send(new PutCommand({
      TableName: this.getTableName(),
      Item: {
        PK: pk,
        SK: sk,
        GSI1PK: this.getStatusPK(platform, environment, current.status),
        GSI1SK: `EXP#${experimentKey}`,
        ...updatedExperiment,
      },
    }));

    return updatedExperiment;
  }

  async start(
    platform: string,
    environment: string,
    experimentKey: string,
    startedBy: string
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'draft') {
      throw new Error(`Cannot start experiment in ${current.status} status`);
    }

    const now = new Date().toISOString();
    return this.updateStatus(platform, environment, experimentKey, current.version, 'running', {
      startedAt: now,
      startedBy,
    });
  }

  async pause(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'running') {
      throw new Error(`Cannot pause experiment in ${current.status} status`);
    }

    return this.updateStatus(platform, environment, experimentKey, current.version, 'paused');
  }

  async resume(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'paused') {
      throw new Error(`Cannot resume experiment in ${current.status} status`);
    }

    return this.updateStatus(platform, environment, experimentKey, current.version, 'running');
  }

  async complete(
    platform: string,
    environment: string,
    experimentKey: string,
    winner: string | undefined,
    completedBy: string
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'running' && current.status !== 'paused') {
      throw new Error(`Cannot complete experiment in ${current.status} status`);
    }

    const now = new Date().toISOString();
    return this.updateStatus(platform, environment, experimentKey, current.version, 'completed', {
      winner,
      completedAt: now,
      completedBy,
    });
  }

  async archive(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== 'completed') {
      throw new Error(`Cannot archive experiment in ${current.status} status`);
    }

    return this.updateStatus(platform, environment, experimentKey, current.version, 'archived');
  }

  async get(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment | null> {
    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'isActive = :active',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `EXP#${experimentKey}#V#`,
        ':active': true,
      },
      ScanIndexForward: false,
      Limit: 1,
    }));

    if (!result.Items || result.Items.length === 0) {
      return null;
    }

    return this.itemToExperiment(result.Items[0] as DynamoItem);
  }

  async list(
    platform: string,
    environment: string,
    status?: ExperimentStatus,
    limit?: number,
    cursor?: string
  ): Promise<ExperimentPage> {
    let result;

    if (status) {
      result = await dynamoDBClient.send(new QueryCommand({
        TableName: this.getTableName(),
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :pk',
        ExpressionAttributeValues: {
          ':pk': this.getStatusPK(platform, environment, status),
        },
        Limit: limit || 100,
        ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      }));
    } else {
      const pk = this.getPK(platform, environment);
      result = await dynamoDBClient.send(new QueryCommand({
        TableName: this.getTableName(),
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        FilterExpression: 'isActive = :active',
        ExpressionAttributeValues: {
          ':pk': pk,
          ':prefix': 'EXP#',
          ':active': true,
        },
        Limit: limit || 100,
        ExclusiveStartKey: cursor ? JSON.parse(Buffer.from(cursor, 'base64').toString()) : undefined,
      }));
    }

    const items = (result.Items || []).map(item => this.itemToExperiment(item as DynamoItem));
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return {
      items,
      nextCursor,
      hasMore: !!result.LastEvaluatedKey,
    };
  }

  async listRunning(
    platform: string,
    environment: string
  ): Promise<Experiment[]> {
    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': this.getStatusPK(platform, environment, 'running'),
      },
    }));

    return (result.Items || []).map(item => this.itemToExperiment(item as DynamoItem));
  }

  async delete(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<void> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status === 'running') {
      throw new Error('Cannot delete running experiment');
    }

    const pk = this.getPK(platform, environment);

    const result = await dynamoDBClient.send(new QueryCommand({
      TableName: this.getTableName(),
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': pk,
        ':prefix': `EXP#${experimentKey}#V#`,
      },
    }));

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

  async exists(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<boolean> {
    const experiment = await this.get(platform, environment, experimentKey);
    return experiment !== null;
  }

  async updateResults(
    platform: string,
    environment: string,
    experimentKey: string,
    results: Experiment['results']
  ): Promise<void> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    const pk = this.getPK(platform, environment);
    const sk = this.getSK(experimentKey, current.version);
    const now = new Date().toISOString();

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET results = :results, updatedAt = :now',
      ExpressionAttributeValues: {
        ':results': results,
        ':now': now,
      },
    }));
  }

  async updateTrafficAllocation(
    platform: string,
    environment: string,
    experimentKey: string,
    trafficAllocation: Experiment['trafficAllocation']
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    // Only allow updating traffic allocation for running or paused experiments
    if (current.status !== 'running' && current.status !== 'paused' && current.status !== 'draft') {
      throw new Error(`Cannot update traffic allocation for experiment in ${current.status} status`);
    }

    // Validate traffic allocation sums to 100%
    const totalPercentage = trafficAllocation.reduce((sum, t) => sum + t.percentage, 0);
    if (totalPercentage !== 100) {
      throw new Error(`Traffic allocation must sum to 100%, got ${totalPercentage}%`);
    }

    // Validate all variation keys exist
    const variationKeys = new Set(current.variations.map(v => v.key));
    for (const allocation of trafficAllocation) {
      if (!variationKeys.has(allocation.variationKey)) {
        throw new Error(`Unknown variation key: ${allocation.variationKey}`);
      }
    }

    const pk = this.getPK(platform, environment);
    const sk = this.getSK(experimentKey, current.version);
    const now = new Date().toISOString();

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: 'SET trafficAllocation = :trafficAllocation, updatedAt = :now',
      ExpressionAttributeValues: {
        ':trafficAllocation': trafficAllocation,
        ':now': now,
      },
    }));

    const updated = await this.get(platform, environment, experimentKey);
    if (!updated) {
      throw new Error('Failed to retrieve updated experiment');
    }
    return updated;
  }

  private async updateStatus(
    platform: string,
    environment: string,
    experimentKey: string,
    version: string,
    newStatus: ExperimentStatus,
    additionalFields?: Record<string, unknown>
  ): Promise<Experiment> {
    const pk = this.getPK(platform, environment);
    const sk = this.getSK(experimentKey, version);
    const now = new Date().toISOString();

    let updateExpression = 'SET #status = :status, GSI1PK = :gsi1pk, updatedAt = :now';
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
    };
    const expressionAttributeValues: Record<string, unknown> = {
      ':status': newStatus,
      ':gsi1pk': this.getStatusPK(platform, environment, newStatus),
      ':now': now,
    };

    if (additionalFields) {
      for (const [key, value] of Object.entries(additionalFields)) {
        updateExpression += `, ${key} = :${key}`;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    await dynamoDBClient.send(new UpdateCommand({
      TableName: this.getTableName(),
      Key: { PK: pk, SK: sk },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }));

    const updated = await this.get(platform, environment, experimentKey);
    if (!updated) {
      throw new Error('Failed to retrieve updated experiment');
    }
    return updated;
  }

  private itemToExperiment(item: DynamoItem): Experiment {
    return {
      platform: item['platform'] as string,
      environment: item['environment'] as string,
      experimentKey: item['experimentKey'] as string,
      name: item['name'] as string,
      description: item['description'] as string | undefined,
      hypothesis: item['hypothesis'] as string,
      status: item['status'] as ExperimentStatus,
      startedAt: item['startedAt'] as string | undefined,
      completedAt: item['completedAt'] as string | undefined,
      scheduledStartAt: item['scheduledStartAt'] as string | undefined,
      scheduledEndAt: item['scheduledEndAt'] as string | undefined,
      variations: item['variations'] as Experiment['variations'],
      controlVariation: item['controlVariation'] as string,
      trafficAllocation: item['trafficAllocation'] as Experiment['trafficAllocation'],
      targeting: item['targeting'] as Experiment['targeting'],
      primaryMetric: item['primaryMetric'] as Experiment['primaryMetric'],
      secondaryMetrics: item['secondaryMetrics'] as Experiment['secondaryMetrics'],
      confidenceLevel: item['confidenceLevel'] as number,
      minimumDetectableEffect: item['minimumDetectableEffect'] as number | undefined,
      minimumSampleSize: item['minimumSampleSize'] as number | undefined,
      results: item['results'] as Experiment['results'],
      winner: item['winner'] as string | undefined,
      version: item['version'] as string,
      isActive: item['isActive'] as boolean,
      createdBy: item['createdBy'] as string,
      createdAt: item['createdAt'] as string,
      updatedAt: item['updatedAt'] as string,
    };
  }
}
