/**
 * Mongoose adapter for Experiment operations.
 *
 * @remarks
 * Implements `IExperimentRepository` from @togglebox/experiments package.
 * Experiments support multiple variants with traffic allocation and metrics.
 */

import type {
  Experiment,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
} from '@togglebox/experiments';
import type { IExperimentRepository, ExperimentPage } from '@togglebox/experiments';
import { ExperimentModel, type IExperimentDocument } from './schemas';

/**
 * Mongoose implementation of Experiment repository.
 */
export class MongooseExperimentRepository implements IExperimentRepository {
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

    const doc = new ExperimentModel({
      ...experiment,
      variations: JSON.stringify(experiment.variations),
      trafficAllocation: JSON.stringify(experiment.trafficAllocation),
      targeting: JSON.stringify(experiment.targeting),
      primaryMetric: JSON.stringify(experiment.primaryMetric),
      secondaryMetrics: JSON.stringify(experiment.secondaryMetrics),
    });

    await doc.save();

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

    await ExperimentModel.updateOne(
      {
        platform,
        environment,
        experimentKey,
        version: current.version,
        isActive: true,
      },
      {
        $set: {
          name: updatedExperiment.name,
          description: updatedExperiment.description,
          hypothesis: updatedExperiment.hypothesis,
          variations: JSON.stringify(updatedExperiment.variations),
          controlVariation: updatedExperiment.controlVariation,
          trafficAllocation: JSON.stringify(updatedExperiment.trafficAllocation),
          targeting: JSON.stringify(updatedExperiment.targeting),
          primaryMetric: JSON.stringify(updatedExperiment.primaryMetric),
          secondaryMetrics: JSON.stringify(updatedExperiment.secondaryMetrics),
          confidenceLevel: updatedExperiment.confidenceLevel,
          minimumDetectableEffect: updatedExperiment.minimumDetectableEffect,
          minimumSampleSize: updatedExperiment.minimumSampleSize,
          scheduledStartAt: updatedExperiment.scheduledStartAt,
          scheduledEndAt: updatedExperiment.scheduledEndAt,
          updatedAt: now,
        },
      }
    );

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
    const doc = await ExperimentModel.findOne({
      platform,
      environment,
      experimentKey,
      isActive: true,
    }).sort({ version: -1 });

    if (!doc) {
      return null;
    }

    return this.docToExperiment(doc);
  }

  async list(
    platform: string,
    environment: string,
    status?: ExperimentStatus,
    limit?: number,
    cursor?: string
  ): Promise<ExperimentPage> {
    const pageSize = limit || 100;
    const skip = cursor ? parseInt(Buffer.from(cursor, 'base64').toString(), 10) : 0;

    const filter: Record<string, unknown> = {
      platform,
      environment,
      isActive: true,
    };

    if (status) {
      filter['status'] = status;
    }

    const docs = await ExperimentModel.find(filter)
      .skip(skip)
      .limit(pageSize + 1);

    const hasMore = docs.length > pageSize;
    const items = docs.slice(0, pageSize).map(doc => this.docToExperiment(doc));
    const nextCursor = hasMore
      ? Buffer.from(String(skip + pageSize)).toString('base64')
      : undefined;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async listRunning(
    platform: string,
    environment: string
  ): Promise<Experiment[]> {
    const docs = await ExperimentModel.find({
      platform,
      environment,
      status: 'running',
      isActive: true,
    });

    return docs.map(doc => this.docToExperiment(doc));
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

    await ExperimentModel.deleteMany({
      platform,
      environment,
      experimentKey,
    });
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

    const now = new Date().toISOString();

    await ExperimentModel.updateOne(
      {
        platform,
        environment,
        experimentKey,
        version: current.version,
        isActive: true,
      },
      {
        $set: {
          results: results ? JSON.stringify(results) : undefined,
          updatedAt: now,
        },
      }
    );
  }

  private async updateStatus(
    platform: string,
    environment: string,
    experimentKey: string,
    version: string,
    newStatus: ExperimentStatus,
    additionalFields?: Record<string, unknown>
  ): Promise<Experiment> {
    const now = new Date().toISOString();

    const updateFields: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
      ...additionalFields,
    };

    await ExperimentModel.updateOne(
      {
        platform,
        environment,
        experimentKey,
        version,
        isActive: true,
      },
      { $set: updateFields }
    );

    const updated = await this.get(platform, environment, experimentKey);
    if (!updated) {
      throw new Error('Failed to retrieve updated experiment');
    }
    return updated;
  }

  private docToExperiment(doc: IExperimentDocument): Experiment {
    return {
      platform: doc.platform,
      environment: doc.environment,
      experimentKey: doc.experimentKey,
      name: doc.name,
      description: doc.description,
      hypothesis: doc.hypothesis,
      status: doc.status,
      startedAt: doc.startedAt,
      completedAt: doc.completedAt,
      scheduledStartAt: doc.scheduledStartAt,
      scheduledEndAt: doc.scheduledEndAt,
      variations: JSON.parse(doc.variations),
      controlVariation: doc.controlVariation,
      trafficAllocation: JSON.parse(doc.trafficAllocation),
      targeting: JSON.parse(doc.targeting),
      primaryMetric: JSON.parse(doc.primaryMetric),
      secondaryMetrics: JSON.parse(doc.secondaryMetrics),
      confidenceLevel: doc.confidenceLevel,
      minimumDetectableEffect: doc.minimumDetectableEffect,
      minimumSampleSize: doc.minimumSampleSize,
      results: doc.results ? JSON.parse(doc.results) : undefined,
      winner: doc.winner,
      version: doc.version,
      isActive: doc.isActive,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
