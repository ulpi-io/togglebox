/**
 * Cloudflare D1 adapter for Experiment operations.
 *
 * @remarks
 * Implements `IExperimentRepository` from @togglebox/experiments package using D1 SQLite.
 * Experiments support multiple variants with traffic allocation and metrics.
 */

import type {
  Experiment,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
  TrafficAllocation,
} from '@togglebox/experiments';
import type { IExperimentRepository, ExperimentPage } from '@togglebox/experiments';

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
 * D1 implementation of Experiment repository.
 *
 * @remarks
 * **Table Schema:**
 * - platform: VARCHAR (indexed)
 * - environment: VARCHAR (indexed)
 * - experimentKey: VARCHAR (indexed)
 * - status: VARCHAR (indexed for filtering)
 * - version: VARCHAR
 * - isActive: INTEGER (0/1, SQLite boolean)
 * - variations, targeting, metrics: TEXT (JSON strings)
 *
 * **Status Transitions:**
 * - draft → running (via start())
 * - running → paused (via pause())
 * - paused → running (via resume())
 * - running/paused → completed (via complete())
 * - completed → archived (via archive())
 *
 * **Pagination:**
 * - Uses offset-based pagination (LIMIT/OFFSET)
 * - nextCursor is stringified offset value
 */
export class D1ExperimentRepository implements IExperimentRepository {
  constructor(private db: D1Database) {}

  /**
   * Creates a new Experiment (draft status, version 1.0.0).
   */
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

    // Serialize JSON fields
    const variationsJson = JSON.stringify(experiment.variations);
    const trafficAllocationJson = JSON.stringify(experiment.trafficAllocation);
    const targetingJson = JSON.stringify(experiment.targeting);
    const primaryMetricJson = JSON.stringify(experiment.primaryMetric);
    const secondaryMetricsJson = JSON.stringify(experiment.secondaryMetrics);

    await this.db
      .prepare(
        `INSERT INTO experiments
        (platform, environment, experimentKey, name, description, hypothesis, status, variations, controlVariation, trafficAllocation, targeting, primaryMetric, secondaryMetrics, confidenceLevel, minimumDetectableEffect, minimumSampleSize, scheduledStartAt, scheduledEndAt, version, isActive, createdBy, createdAt, updatedAt)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23)`
      )
      .bind(
        experiment.platform,
        experiment.environment,
        experiment.experimentKey,
        experiment.name,
        experiment.description || null,
        experiment.hypothesis,
        experiment.status,
        variationsJson,
        experiment.controlVariation,
        trafficAllocationJson,
        targetingJson,
        primaryMetricJson,
        secondaryMetricsJson,
        experiment.confidenceLevel,
        experiment.minimumDetectableEffect || null,
        experiment.minimumSampleSize || null,
        experiment.scheduledStartAt || null,
        experiment.scheduledEndAt || null,
        experiment.version,
        experiment.isActive ? 1 : 0,
        experiment.createdBy,
        experiment.createdAt,
        experiment.updatedAt
      )
      .run();

    return experiment;
  }

  /**
   * Updates an Experiment (only in draft status).
   */
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

    // Serialize JSON fields
    const variationsJson = JSON.stringify(updatedExperiment.variations);
    const trafficAllocationJson = JSON.stringify(updatedExperiment.trafficAllocation);
    const targetingJson = JSON.stringify(updatedExperiment.targeting);
    const primaryMetricJson = JSON.stringify(updatedExperiment.primaryMetric);
    const secondaryMetricsJson = JSON.stringify(updatedExperiment.secondaryMetrics);

    await this.db
      .prepare(
        `UPDATE experiments SET
        name = ?1, description = ?2, hypothesis = ?3, variations = ?4, controlVariation = ?5,
        trafficAllocation = ?6, targeting = ?7, primaryMetric = ?8, secondaryMetrics = ?9,
        confidenceLevel = ?10, minimumDetectableEffect = ?11, minimumSampleSize = ?12,
        scheduledStartAt = ?13, scheduledEndAt = ?14, updatedAt = ?15
        WHERE platform = ?16 AND environment = ?17 AND experimentKey = ?18 AND version = ?19`
      )
      .bind(
        updatedExperiment.name,
        updatedExperiment.description || null,
        updatedExperiment.hypothesis,
        variationsJson,
        updatedExperiment.controlVariation,
        trafficAllocationJson,
        targetingJson,
        primaryMetricJson,
        secondaryMetricsJson,
        updatedExperiment.confidenceLevel,
        updatedExperiment.minimumDetectableEffect || null,
        updatedExperiment.minimumSampleSize || null,
        updatedExperiment.scheduledStartAt || null,
        updatedExperiment.scheduledEndAt || null,
        now,
        platform,
        environment,
        experimentKey,
        current.version
      )
      .run();

    return updatedExperiment;
  }

  /**
   * Start an experiment (draft → running).
   */
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

    await this.db
      .prepare(
        `UPDATE experiments SET status = ?1, startedAt = ?2, startedBy = ?3, updatedAt = ?4
        WHERE platform = ?5 AND environment = ?6 AND experimentKey = ?7 AND version = ?8`
      )
      .bind('running', now, startedBy, now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      status: 'running',
      startedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Pause an experiment (running → paused).
   */
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

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE experiments SET status = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND experimentKey = ?5 AND version = ?6`
      )
      .bind('paused', now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      status: 'paused',
      updatedAt: now,
    };
  }

  /**
   * Resume an experiment (paused → running).
   */
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

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE experiments SET status = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND experimentKey = ?5 AND version = ?6`
      )
      .bind('running', now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      status: 'running',
      updatedAt: now,
    };
  }

  /**
   * Complete an experiment (running/paused → completed).
   */
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

    await this.db
      .prepare(
        `UPDATE experiments SET status = ?1, winner = ?2, completedAt = ?3, completedBy = ?4, updatedAt = ?5
        WHERE platform = ?6 AND environment = ?7 AND experimentKey = ?8 AND version = ?9`
      )
      .bind('completed', winner || null, now, completedBy, now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      status: 'completed',
      winner,
      completedAt: now,
      updatedAt: now,
    };
  }

  /**
   * Archive an experiment (completed → archived).
   */
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

    const now = new Date().toISOString();

    await this.db
      .prepare(
        `UPDATE experiments SET status = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND experimentKey = ?5 AND version = ?6`
      )
      .bind('archived', now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      status: 'archived',
      updatedAt: now,
    };
  }

  /**
   * Get the active experiment.
   */
  async get(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment | null> {
    const result = await this.db
      .prepare(
        `SELECT * FROM experiments
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3 AND isActive = 1
        LIMIT 1`
      )
      .bind(platform, environment, experimentKey)
      .first();

    if (!result) {
      return null;
    }

    return this.rowToExperiment(result as Record<string, unknown>);
  }

  /**
   * List experiments with optional status filter.
   */
  async list(
    platform: string,
    environment: string,
    status?: ExperimentStatus,
    limit: number = 100,
    cursor?: string
  ): Promise<ExperimentPage> {
    const offset = cursor ? parseInt(cursor, 10) : 0;

    let query: string;
    let bindings: unknown[];

    if (status) {
      query = `SELECT * FROM experiments
        WHERE platform = ?1 AND environment = ?2 AND status = ?3 AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT ?4 OFFSET ?5`;
      bindings = [platform, environment, status, limit, offset];
    } else {
      query = `SELECT * FROM experiments
        WHERE platform = ?1 AND environment = ?2 AND isActive = 1
        ORDER BY createdAt DESC
        LIMIT ?3 OFFSET ?4`;
      bindings = [platform, environment, limit, offset];
    }

    const result = await this.db
      .prepare(query)
      .bind(...bindings)
      .all();

    const items = result.results
      ? result.results.map(row => this.rowToExperiment(row as Record<string, unknown>))
      : [];

    const hasMore = items.length === limit;
    const nextCursor = hasMore ? String(offset + limit) : undefined;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  /**
   * List all running experiments.
   */
  async listRunning(
    platform: string,
    environment: string
  ): Promise<Experiment[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM experiments
        WHERE platform = ?1 AND environment = ?2 AND status = ?3 AND isActive = 1
        ORDER BY createdAt DESC`
      )
      .bind(platform, environment, 'running')
      .all();

    return result.results
      ? result.results.map(row => this.rowToExperiment(row as Record<string, unknown>))
      : [];
  }

  /**
   * Delete an experiment (cannot delete running experiments).
   */
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

    await this.db
      .prepare(
        'DELETE FROM experiments WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3'
      )
      .bind(platform, environment, experimentKey)
      .run();
  }

  /**
   * Check if an experiment exists.
   */
  async exists(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<boolean> {
    const experiment = await this.get(platform, environment, experimentKey);
    return experiment !== null;
  }

  /**
   * Update experiment results.
   */
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
    const resultsJson = JSON.stringify(results);

    await this.db
      .prepare(
        `UPDATE experiments SET results = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND experimentKey = ?5 AND version = ?6`
      )
      .bind(resultsJson, now, platform, environment, experimentKey, current.version)
      .run();
  }

  /**
   * Update traffic allocation for a running or paused experiment.
   */
  async updateTrafficAllocation(
    platform: string,
    environment: string,
    experimentKey: string,
    trafficAllocation: TrafficAllocation[]
  ): Promise<Experiment> {
    const current = await this.get(platform, environment, experimentKey);
    if (!current) {
      throw new Error(`Experiment not found: ${experimentKey}`);
    }

    // Only allow updating traffic allocation for draft, running, or paused experiments
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

    const now = new Date().toISOString();
    const trafficAllocationJson = JSON.stringify(trafficAllocation);

    await this.db
      .prepare(
        `UPDATE experiments SET trafficAllocation = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND experimentKey = ?5 AND version = ?6`
      )
      .bind(trafficAllocationJson, now, platform, environment, experimentKey, current.version)
      .run();

    return {
      ...current,
      trafficAllocation,
      updatedAt: now,
    };
  }

  /**
   * Convert D1 row to Experiment type.
   */
  private rowToExperiment(row: Record<string, unknown>): Experiment {
    return {
      platform: row['platform'] as string,
      environment: row['environment'] as string,
      experimentKey: row['experimentKey'] as string,
      name: row['name'] as string,
      description: row['description'] as string | undefined,
      hypothesis: row['hypothesis'] as string,
      status: row['status'] as ExperimentStatus,
      startedAt: row['startedAt'] as string | undefined,
      completedAt: row['completedAt'] as string | undefined,
      scheduledStartAt: row['scheduledStartAt'] as string | undefined,
      scheduledEndAt: row['scheduledEndAt'] as string | undefined,
      variations: safeParse(row['variations'] as string, []),
      controlVariation: row['controlVariation'] as string,
      trafficAllocation: safeParse(row['trafficAllocation'] as string, []),
      targeting: safeParse(row['targeting'] as string, { countries: [], forceIncludeUsers: [], forceExcludeUsers: [] }),
      primaryMetric: safeParse(row['primaryMetric'] as string, { id: '', name: '', eventName: '', metricType: 'conversion', successDirection: 'increase' }),
      secondaryMetrics: safeParse(row['secondaryMetrics'] as string, undefined),
      confidenceLevel: row['confidenceLevel'] as number,
      minimumDetectableEffect: row['minimumDetectableEffect'] as number | undefined,
      minimumSampleSize: row['minimumSampleSize'] as number | undefined,
      results: safeParse(row['results'] as string, undefined),
      winner: row['winner'] as string | undefined,
      version: row['version'] as string,
      isActive: Boolean(row['isActive']),
      createdBy: row['createdBy'] as string,
      createdAt: row['createdAt'] as string,
      updatedAt: row['updatedAt'] as string,
    };
  }
}
