/**
 * @togglebox/experiments - Repository Interface
 *
 * Defines the contract for Experiment storage operations.
 * Implementations exist for Prisma, DynamoDB, Mongoose, and D1.
 */

import type {
  Experiment,
  CreateExperiment,
  UpdateExperiment,
  ExperimentStatus,
  TrafficAllocation,
} from './schemas';

/**
 * Pagination result for Experiments.
 */
export interface ExperimentPage {
  items: Experiment[];
  nextCursor?: string;
  hasMore: boolean;
}

/**
 * Repository interface for Experiment operations.
 *
 * @remarks
 * Experiments have a lifecycle (draft → running → completed/archived).
 * Only running experiments can be evaluated for variant assignment.
 */
export interface IExperimentRepository {
  /**
   * Create a new Experiment (starts in draft status).
   * @throws Error if experiment with same key already exists
   */
  create(data: CreateExperiment): Promise<Experiment>;

  /**
   * Update an Experiment (only allowed in draft status).
   * @throws Error if experiment doesn't exist or is not in draft
   */
  update(
    platform: string,
    environment: string,
    experimentKey: string,
    data: UpdateExperiment
  ): Promise<Experiment>;

  /**
   * Start an Experiment (draft → running).
   * @throws Error if experiment is not in draft status
   */
  start(
    platform: string,
    environment: string,
    experimentKey: string,
    startedBy: string
  ): Promise<Experiment>;

  /**
   * Pause an Experiment (running → paused).
   * @throws Error if experiment is not running
   */
  pause(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment>;

  /**
   * Resume an Experiment (paused → running).
   * @throws Error if experiment is not paused
   */
  resume(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment>;

  /**
   * Complete an Experiment with optional winner.
   * @throws Error if experiment is not running or paused
   */
  complete(
    platform: string,
    environment: string,
    experimentKey: string,
    winner: string | undefined,
    completedBy: string
  ): Promise<Experiment>;

  /**
   * Archive an Experiment.
   * @throws Error if experiment is not completed
   */
  archive(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment>;

  /**
   * Get an Experiment by key.
   * @returns The experiment or null if not found
   */
  get(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<Experiment | null>;

  /**
   * List Experiments by status.
   * @param status - Filter by status (optional, returns all if not specified)
   */
  list(
    platform: string,
    environment: string,
    status?: ExperimentStatus,
    limit?: number,
    cursor?: string
  ): Promise<ExperimentPage>;

  /**
   * List all running Experiments (for SDK).
   */
  listRunning(
    platform: string,
    environment: string
  ): Promise<Experiment[]>;

  /**
   * Delete an Experiment.
   * @throws Error if experiment is running (must complete or archive first)
   */
  delete(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<void>;

  /**
   * Check if an Experiment exists.
   */
  exists(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<boolean>;

  /**
   * Update experiment results (called by stats aggregation).
   * This is an internal method for updating computed results.
   */
  updateResults(
    platform: string,
    environment: string,
    experimentKey: string,
    results: Experiment['results']
  ): Promise<void>;

  /**
   * Update traffic allocation for a running or paused experiment.
   * This allows adjusting rollout percentages without stopping the experiment.
   * @throws Error if experiment is not running or paused
   */
  updateTrafficAllocation(
    platform: string,
    environment: string,
    experimentKey: string,
    trafficAllocation: TrafficAllocation[]
  ): Promise<Experiment>;
}
