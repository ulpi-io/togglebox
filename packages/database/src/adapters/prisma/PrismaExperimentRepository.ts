/**
 * Prisma adapter for Experiment operations.
 *
 * @remarks
 * Implements `IExperimentRepository` from @togglebox/experiments package.
 * Experiments support multiple variants with traffic allocation and metrics.
 */

import { PrismaClient } from ".prisma/client-database";
import type {
  Experiment,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
  TrafficAllocation,
} from "@togglebox/experiments";
import type {
  IExperimentRepository,
  ExperimentPage,
} from "@togglebox/experiments";
import { parseCursor, encodeCursor } from "../../utils/cursor";

/**
 * Safely parse JSON with fallback for malformed data.
 */
function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Prisma implementation of Experiment repository.
 *
 * @remarks
 * Database schema:
 * - Composite unique index: (platform, environment, experimentKey, version)
 * - Index on (platform, environment, status) for status-based queries
 * - JSON fields stored as strings (variations, targeting, metrics, results)
 */
export class PrismaExperimentRepository implements IExperimentRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: CreateExperiment): Promise<Experiment> {
    const now = new Date().toISOString();
    const version = "1.0.0";
    const status: ExperimentStatus = "draft";

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

    await this.prisma.experiment.create({
      data: {
        platform: experiment.platform,
        environment: experiment.environment,
        experimentKey: experiment.experimentKey,
        name: experiment.name,
        description: experiment.description,
        hypothesis: experiment.hypothesis,
        status: experiment.status,
        startedAt: experiment.startedAt,
        completedAt: experiment.completedAt,
        scheduledStartAt: experiment.scheduledStartAt,
        scheduledEndAt: experiment.scheduledEndAt,
        variations: JSON.stringify(experiment.variations),
        controlVariation: experiment.controlVariation,
        trafficAllocation: JSON.stringify(experiment.trafficAllocation),
        targeting: JSON.stringify(experiment.targeting),
        primaryMetric: JSON.stringify(experiment.primaryMetric),
        secondaryMetrics: JSON.stringify(experiment.secondaryMetrics),
        confidenceLevel: experiment.confidenceLevel,
        minimumDetectableEffect: experiment.minimumDetectableEffect,
        minimumSampleSize: experiment.minimumSampleSize,
        results: experiment.results ? JSON.stringify(experiment.results) : null,
        winner: experiment.winner,
        version: experiment.version,
        isActive: experiment.isActive,
        createdBy: experiment.createdBy,
        createdAt: experiment.createdAt,
        updatedAt: experiment.updatedAt,
      },
    });

    return experiment;
  }

  async update(
    platform: string,
    environment: string,
    experimentKey: string,
    data: UpdateExperiment,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "draft") {
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
      minimumDetectableEffect:
        data.minimumDetectableEffect ?? current.minimumDetectableEffect,
      minimumSampleSize: data.minimumSampleSize ?? current.minimumSampleSize,
      scheduledStartAt: data.scheduledStartAt ?? current.scheduledStartAt,
      scheduledEndAt: data.scheduledEndAt ?? current.scheduledEndAt,
      updatedAt: now,
    };

    await this.prisma.experiment.update({
      where: {
        platform_environment_experimentKey_version: {
          platform,
          environment,
          experimentKey,
          version: current.version,
        },
      },
      data: {
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
    });

    return updatedExperiment;
  }

  async start(
    platform: string,
    environment: string,
    experimentKey: string,
    startedBy: string,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "draft") {
      throw new Error(`Cannot start experiment in ${current.status} status`);
    }

    const now = new Date().toISOString();
    return this.updateStatus(
      platform,
      environment,
      experimentKey,
      current.version,
      "running",
      {
        startedAt: now,
        startedBy,
      },
    );
  }

  async pause(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "running") {
      throw new Error(`Cannot pause experiment in ${current.status} status`);
    }

    return this.updateStatus(
      platform,
      environment,
      experimentKey,
      current.version,
      "paused",
    );
  }

  async resume(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "paused") {
      throw new Error(`Cannot resume experiment in ${current.status} status`);
    }

    return this.updateStatus(
      platform,
      environment,
      experimentKey,
      current.version,
      "running",
    );
  }

  async complete(
    platform: string,
    environment: string,
    experimentKey: string,
    winner: string | undefined,
    completedBy: string,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "running" && current.status !== "paused") {
      throw new Error(`Cannot complete experiment in ${current.status} status`);
    }

    const now = new Date().toISOString();
    return this.updateStatus(
      platform,
      environment,
      experimentKey,
      current.version,
      "completed",
      {
        winner,
        completedAt: now,
        completedBy,
      },
    );
  }

  async archive(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status !== "completed") {
      throw new Error(`Cannot archive experiment in ${current.status} status`);
    }

    return this.updateStatus(
      platform,
      environment,
      experimentKey,
      current.version,
      "archived",
    );
  }

  async get(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<Experiment | null> {
    const experiment = await this.prisma.experiment.findFirst({
      where: {
        platform,
        environment,
        experimentKey,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    if (!experiment) {
      return null;
    }

    return this.dbToExperiment(experiment);
  }

  async list(
    platform: string,
    environment: string,
    status?: ExperimentStatus,
    limit: number = 100,
    cursor?: string,
  ): Promise<ExperimentPage> {
    // Parse cursor as offset (validates and throws on malformed cursors)
    const offset = parseCursor(cursor);

    const where: {
      platform: string;
      environment: string;
      isActive: boolean;
      status?: ExperimentStatus;
    } = {
      platform,
      environment,
      isActive: true,
    };

    if (status) {
      where.status = status;
    }

    const experiments = await this.prisma.experiment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const items = experiments.map((e) => this.dbToExperiment(e));
    const nextCursor =
      experiments.length === limit ? encodeCursor(offset + limit) : undefined;

    return {
      items,
      nextCursor,
      hasMore: experiments.length === limit,
    };
  }

  async listRunning(
    platform: string,
    environment: string,
  ): Promise<Experiment[]> {
    const experiments = await this.prisma.experiment.findMany({
      where: {
        platform,
        environment,
        status: "running",
        isActive: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return experiments.map((e) => this.dbToExperiment(e));
  }

  async delete(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<void> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    if (current.status === "running") {
      throw new Error("Cannot delete running experiment");
    }

    await this.prisma.experiment.deleteMany({
      where: {
        platform,
        environment,
        experimentKey,
      },
    });
  }

  async exists(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<boolean> {
    const experiment = await this.get(platform, environment, experimentKey);
    return experiment !== null;
  }

  async updateResults(
    platform: string,
    environment: string,
    experimentKey: string,
    results: Experiment["results"],
  ): Promise<void> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    const now = new Date().toISOString();

    await this.prisma.experiment.update({
      where: {
        platform_environment_experimentKey_version: {
          platform,
          environment,
          experimentKey,
          version: current.version,
        },
      },
      data: {
        results: JSON.stringify(results),
        updatedAt: now,
      },
    });
  }

  async updateTrafficAllocation(
    platform: string,
    environment: string,
    experimentKey: string,
    trafficAllocation: TrafficAllocation[],
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    // Only allow updating traffic allocation for draft, running, or paused experiments
    if (
      current.status !== "running" &&
      current.status !== "paused" &&
      current.status !== "draft"
    ) {
      throw new Error(
        `Cannot update traffic allocation for experiment in ${current.status} status`,
      );
    }

    // Validate traffic allocation sums to 100%
    const totalPercentage = trafficAllocation.reduce(
      (sum, t) => sum + t.percentage,
      0,
    );
    if (totalPercentage !== 100) {
      throw new Error(
        `Traffic allocation must sum to 100%, got ${totalPercentage}%`,
      );
    }

    // Validate all variation keys exist
    const variationKeys = new Set(current.variations.map((v) => v.key));
    for (const allocation of trafficAllocation) {
      if (!variationKeys.has(allocation.variationKey)) {
        throw new Error(`Unknown variation key: ${allocation.variationKey}`);
      }
    }

    const now = new Date().toISOString();

    await this.prisma.experiment.update({
      where: {
        platform_environment_experimentKey_version: {
          platform,
          environment,
          experimentKey,
          version: current.version,
        },
      },
      data: {
        trafficAllocation: JSON.stringify(trafficAllocation),
        updatedAt: now,
      },
    });

    return {
      ...current,
      trafficAllocation,
      updatedAt: now,
    };
  }

  private async updateStatus(
    platform: string,
    environment: string,
    experimentKey: string,
    version: string,
    newStatus: ExperimentStatus,
    additionalFields?: Record<string, unknown>,
  ): Promise<Experiment> {
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      status: newStatus,
      updatedAt: now,
      ...additionalFields,
    };

    await this.prisma.experiment.update({
      where: {
        platform_environment_experimentKey_version: {
          platform,
          environment,
          experimentKey,
          version,
        },
      },
      data: updateData,
    });

    const updated = await this.get(platform, environment, experimentKey);
    if (!updated) {
      throw new Error("Failed to retrieve updated experiment");
    }
    return updated;
  }

  private dbToExperiment(row: {
    platform: string;
    environment: string;
    experimentKey: string;
    name: string;
    description: string | null;
    hypothesis: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    scheduledStartAt: string | null;
    scheduledEndAt: string | null;
    variations: string;
    controlVariation: string;
    trafficAllocation: string;
    targeting: string;
    primaryMetric: string;
    secondaryMetrics: string | null;
    confidenceLevel: number;
    minimumDetectableEffect: number | null;
    minimumSampleSize: number | null;
    results: string | null;
    winner: string | null;
    version: string;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
  }): Experiment {
    return {
      platform: row.platform,
      environment: row.environment,
      experimentKey: row.experimentKey,
      name: row.name,
      description: row.description || undefined,
      hypothesis: row.hypothesis,
      status: row.status as ExperimentStatus,
      startedAt: row.startedAt || undefined,
      completedAt: row.completedAt || undefined,
      scheduledStartAt: row.scheduledStartAt || undefined,
      scheduledEndAt: row.scheduledEndAt || undefined,
      variations: safeParse(row.variations, []),
      controlVariation: row.controlVariation,
      trafficAllocation: safeParse(row.trafficAllocation, []),
      targeting: safeParse(row.targeting, {
        countries: [],
        forceIncludeUsers: [],
        forceExcludeUsers: [],
      }),
      primaryMetric: safeParse(row.primaryMetric, {
        id: "",
        name: "",
        eventName: "",
        metricType: "conversion",
        successDirection: "increase",
      }),
      secondaryMetrics: safeParse(row.secondaryMetrics, undefined),
      confidenceLevel: row.confidenceLevel,
      minimumDetectableEffect: row.minimumDetectableEffect || undefined,
      minimumSampleSize: row.minimumSampleSize || undefined,
      results: safeParse(row.results, undefined),
      winner: row.winner || undefined,
      version: row.version,
      isActive: row.isActive,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
