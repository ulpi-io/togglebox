/**
 * Cloudflare D1 adapter for Statistics operations.
 *
 * @remarks
 * Implements `IStatsRepository` from @togglebox/stats package using D1 SQLite.
 * Uses atomic SQL UPDATE with increment operations for efficient stat updates.
 */

import type {
  ConfigStats,
  FlagStats,
  FlagStatsByCountry,
  FlagStatsDaily,
  ExperimentStats,
  ExperimentMetricStats,
  CustomEventStats,
  StatsEvent,
} from '@togglebox/stats';
import type { IStatsRepository } from '@togglebox/stats';

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

/**
 * D1 implementation of Stats repository.
 *
 * @remarks
 * **Table Schemas:**
 * - config_stats: Remote Config fetch tracking
 * - flag_stats: Feature Flag evaluation totals
 * - flag_stats_daily: Daily time series for flags
 * - flag_stats_country: Country breakdown for flags
 * - experiment_stats: Experiment variation stats
 * - experiment_metric_stats: Metric stats per variation
 *
 * **Atomic Updates:**
 * Uses SQL UPDATE with arithmetic operations for thread-safe increments:
 * ```sql
 * UPDATE table SET count = count + 1 WHERE ...
 * ```
 *
 * **SQLite Booleans:**
 * Uses 0/1 for boolean fields (SQLite has no native boolean type).
 */
export class D1StatsRepository implements IStatsRepository {
  constructor(private db: D1Database) {}

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
    const now = new Date().toISOString();

    // Try to increment existing row
    const updateResult = await this.db
      .prepare(
        `UPDATE config_stats SET fetchCount = fetchCount + 1, lastFetchedAt = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND configKey = ?5`
      )
      .bind(now, now, platform, environment, configKey)
      .run();

    // If no row exists, insert new one
    if (updateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO config_stats (platform, environment, configKey, fetchCount, lastFetchedAt, uniqueClients24h, updatedAt)
          VALUES (?1, ?2, ?3, 1, ?4, 0, ?5)`
        )
        .bind(platform, environment, configKey, now, now)
        .run();
    }
  }

  /**
   * Get stats for a Remote Config.
   */
  async getConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<ConfigStats | null> {
    const result = await this.db
      .prepare(
        `SELECT platform, environment, configKey, fetchCount, lastFetchedAt, uniqueClients24h, updatedAt
        FROM config_stats
        WHERE platform = ?1 AND environment = ?2 AND configKey = ?3`
      )
      .bind(platform, environment, configKey)
      .first<{
        platform: string;
        environment: string;
        configKey: string;
        fetchCount: number;
        lastFetchedAt: string | null;
        uniqueClients24h: number;
        updatedAt: string;
      }>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      configKey: result.configKey,
      fetchCount: result.fetchCount,
      lastFetchedAt: result.lastFetchedAt || undefined,
      uniqueClients24h: result.uniqueClients24h,
      updatedAt: result.updatedAt,
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
    const now = new Date().toISOString();
    const today = now.split('T')[0]; // YYYY-MM-DD

    // Update main stats
    const countColumn = value === 'A' ? 'valueACount' : 'valueBCount';
    const updateResult = await this.db
      .prepare(
        `UPDATE flag_stats SET totalEvaluations = totalEvaluations + 1, ${countColumn} = ${countColumn} + 1, lastEvaluatedAt = ?1, updatedAt = ?2
        WHERE platform = ?3 AND environment = ?4 AND flagKey = ?5`
      )
      .bind(now, now, platform, environment, flagKey)
      .run();

    // If no row exists, insert new one
    if (updateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO flag_stats (platform, environment, flagKey, totalEvaluations, valueACount, valueBCount, uniqueUsersA24h, uniqueUsersB24h, lastEvaluatedAt, updatedAt)
          VALUES (?1, ?2, ?3, 1, ?4, ?5, 0, 0, ?6, ?7)`
        )
        .bind(platform, environment, flagKey, value === 'A' ? 1 : 0, value === 'B' ? 1 : 0, now, now)
        .run();
    }

    // Update daily stats
    const dailyUpdateResult = await this.db
      .prepare(
        `UPDATE flag_stats_daily SET ${countColumn} = ${countColumn} + 1
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND date = ?4`
      )
      .bind(platform, environment, flagKey, today)
      .run();

    if (dailyUpdateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO flag_stats_daily (platform, environment, flagKey, date, valueACount, valueBCount)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
        )
        .bind(platform, environment, flagKey, today, value === 'A' ? 1 : 0, value === 'B' ? 1 : 0)
        .run();
    }

    // Update country stats if provided
    if (country) {
      const countryUpdateResult = await this.db
        .prepare(
          `UPDATE flag_stats_country SET ${countColumn} = ${countColumn} + 1
          WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND country = ?4`
        )
        .bind(platform, environment, flagKey, country)
        .run();

      if (countryUpdateResult.meta.rows_written === 0) {
        await this.db
          .prepare(
            `INSERT INTO flag_stats_country (platform, environment, flagKey, country, valueACount, valueBCount)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
          )
          .bind(platform, environment, flagKey, country, value === 'A' ? 1 : 0, value === 'B' ? 1 : 0)
          .run();
      }
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
    const result = await this.db
      .prepare(
        `SELECT platform, environment, flagKey, totalEvaluations, valueACount, valueBCount, uniqueUsersA24h, uniqueUsersB24h, lastEvaluatedAt, updatedAt
        FROM flag_stats
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3`
      )
      .bind(platform, environment, flagKey)
      .first<{
        platform: string;
        environment: string;
        flagKey: string;
        totalEvaluations: number;
        valueACount: number;
        valueBCount: number;
        uniqueUsersA24h: number;
        uniqueUsersB24h: number;
        lastEvaluatedAt: string | null;
        updatedAt: string;
      }>();

    if (!result) {
      return null;
    }

    return {
      platform: result.platform,
      environment: result.environment,
      flagKey: result.flagKey,
      totalEvaluations: result.totalEvaluations,
      valueACount: result.valueACount,
      valueBCount: result.valueBCount,
      uniqueUsersA24h: result.uniqueUsersA24h,
      uniqueUsersB24h: result.uniqueUsersB24h,
      lastEvaluatedAt: result.lastEvaluatedAt || undefined,
      updatedAt: result.updatedAt,
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
    const result = await this.db
      .prepare(
        `SELECT country, valueACount, valueBCount
        FROM flag_stats_country
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3
        ORDER BY country ASC`
      )
      .bind(platform, environment, flagKey)
      .all<{
        country: string;
        valueACount: number;
        valueBCount: number;
      }>();

    return result.results || [];
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
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];

    const result = await this.db
      .prepare(
        `SELECT date, valueACount, valueBCount
        FROM flag_stats_daily
        WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3 AND date BETWEEN ?4 AND ?5
        ORDER BY date ASC`
      )
      .bind(platform, environment, flagKey, startDateStr, todayStr)
      .all<{
        date: string;
        valueACount: number;
        valueBCount: number;
      }>();

    return result.results || [];
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
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update variation stats
    const updateResult = await this.db
      .prepare(
        `UPDATE experiment_stats SET participants = participants + 1, exposures = exposures + 1, lastExposureAt = ?1
        WHERE platform = ?2 AND environment = ?3 AND experimentKey = ?4 AND variationKey = ?5`
      )
      .bind(now, platform, environment, experimentKey, variationKey)
      .run();

    if (updateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO experiment_stats (platform, environment, experimentKey, variationKey, participants, exposures, lastExposureAt)
          VALUES (?1, ?2, ?3, ?4, 1, 1, ?5)`
        )
        .bind(platform, environment, experimentKey, variationKey, now)
        .run();
    }

    // Update daily stats
    const dailyUpdateResult = await this.db
      .prepare(
        `UPDATE experiment_stats_daily SET participants = participants + 1
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3 AND variationKey = ?4 AND date = ?5`
      )
      .bind(platform, environment, experimentKey, variationKey, today)
      .run();

    if (dailyUpdateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO experiment_stats_daily (platform, environment, experimentKey, variationKey, date, participants)
          VALUES (?1, ?2, ?3, ?4, ?5, 1)`
        )
        .bind(platform, environment, experimentKey, variationKey, today)
        .run();
    }
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
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    // Update metric stats
    let updateQuery = `UPDATE experiment_metric_stats SET conversions = conversions + 1, sampleSize = sampleSize + 1, count = count + 1, lastConversionAt = ?1`;
    const updateParams: unknown[] = [now];

    if (value !== undefined) {
      updateQuery += `, sumValue = sumValue + ?${updateParams.length + 1}`;
      updateParams.push(value);
    }

    updateQuery += ` WHERE platform = ?${updateParams.length + 1} AND environment = ?${updateParams.length + 2} AND experimentKey = ?${updateParams.length + 3} AND variationKey = ?${updateParams.length + 4} AND metricId = ?${updateParams.length + 5}`;
    updateParams.push(platform, environment, experimentKey, variationKey, metricId);

    const updateResult = await this.db
      .prepare(updateQuery)
      .bind(...updateParams)
      .run();

    if (updateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO experiment_metric_stats (platform, environment, experimentKey, variationKey, metricId, conversions, sampleSize, count, sumValue, lastConversionAt)
          VALUES (?1, ?2, ?3, ?4, ?5, 1, 1, 1, ?6, ?7)`
        )
        .bind(platform, environment, experimentKey, variationKey, metricId, value || 0, now)
        .run();
    }

    // Update daily metric stats
    let dailyUpdateQuery = `UPDATE experiment_metric_stats_daily SET conversions = conversions + 1, sampleSize = sampleSize + 1, count = count + 1`;
    const dailyUpdateParams: unknown[] = [];

    if (value !== undefined) {
      dailyUpdateQuery += `, sumValue = sumValue + ?${dailyUpdateParams.length + 1}`;
      dailyUpdateParams.push(value);
    }

    dailyUpdateQuery += ` WHERE platform = ?${dailyUpdateParams.length + 1} AND environment = ?${dailyUpdateParams.length + 2} AND experimentKey = ?${dailyUpdateParams.length + 3} AND variationKey = ?${dailyUpdateParams.length + 4} AND metricId = ?${dailyUpdateParams.length + 5} AND date = ?${dailyUpdateParams.length + 6}`;
    dailyUpdateParams.push(platform, environment, experimentKey, variationKey, metricId, today);

    const dailyUpdateResult = await this.db
      .prepare(dailyUpdateQuery)
      .bind(...dailyUpdateParams)
      .run();

    if (dailyUpdateResult.meta.rows_written === 0) {
      await this.db
        .prepare(
          `INSERT INTO experiment_metric_stats_daily (platform, environment, experimentKey, variationKey, metricId, date, conversions, sampleSize, count, sumValue)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, 1, 1, ?7)`
        )
        .bind(platform, environment, experimentKey, variationKey, metricId, today, value || 0)
        .run();
    }

    // Update daily experiment stats (aggregate conversions for all metrics)
    // This populates the dailyData array in getExperimentStats()
    const dailyExpUpdateResult = await this.db
      .prepare(
        `UPDATE experiment_stats_daily SET conversions = conversions + 1
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3 AND variationKey = ?4 AND date = ?5`
      )
      .bind(platform, environment, experimentKey, variationKey, today)
      .run();

    if (dailyExpUpdateResult.meta.rows_written === 0) {
      // If no record exists yet (user wasn't exposed first), create it with just conversions
      await this.db
        .prepare(
          `INSERT INTO experiment_stats_daily (platform, environment, experimentKey, variationKey, date, participants, conversions)
          VALUES (?1, ?2, ?3, ?4, ?5, 0, 1)`
        )
        .bind(platform, environment, experimentKey, variationKey, today)
        .run();
    }
  }

  /**
   * Get full stats for an Experiment.
   */
  async getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<ExperimentStats | null> {
    const result = await this.db
      .prepare(
        `SELECT variationKey, participants, exposures
        FROM experiment_stats
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3
        ORDER BY variationKey ASC`
      )
      .bind(platform, environment, experimentKey)
      .all<{
        variationKey: string;
        participants: number;
        exposures: number;
      }>();

    if (!result.results || result.results.length === 0) {
      return null;
    }

    // Query daily stats for time series data
    const dailyResult = await this.db
      .prepare(
        `SELECT date, variationKey, participants, conversions
        FROM experiment_stats_daily
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3
        ORDER BY date ASC, variationKey ASC`
      )
      .bind(platform, environment, experimentKey)
      .all<{
        date: string;
        variationKey: string;
        participants: number;
        conversions: number;
      }>();

    const dailyData = dailyResult.results || [];

    return {
      platform,
      environment,
      experimentKey,
      variations: result.results,
      metricResults: [], // Populated separately via getExperimentMetricStats
      dailyData,
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
    const result = await this.db
      .prepare(
        `SELECT date, sampleSize, sumValue, count, conversions
        FROM experiment_metric_stats_daily
        WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3 AND variationKey = ?4 AND metricId = ?5
        ORDER BY date ASC`
      )
      .bind(platform, environment, experimentKey, variationKey, metricId)
      .all<{
        date: string;
        sampleSize: number;
        sumValue: number;
        count: number;
        conversions: number;
      }>();

    return (result.results || []).map(row => ({
      platform,
      environment,
      experimentKey,
      variationKey,
      metricId,
      date: row.date,
      sampleSize: row.sampleSize,
      sum: row.sumValue,
      count: row.count,
      conversions: row.conversions,
    }));
  }

  // =========================================================================
  // CUSTOM EVENT STATS
  // =========================================================================

  /**
   * Record a custom event.
   */
  async recordCustomEvent(
    platform: string,
    environment: string,
    eventName: string,
    userId?: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const now = new Date().toISOString();
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    await this.db
      .prepare(
        `INSERT INTO custom_event_stats (id, platform, environment, eventName, userId, properties, timestamp)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
      )
      .bind(id, platform, environment, eventName, userId || null, properties ? JSON.stringify(properties) : null, now)
      .run();
  }

  /**
   * Get custom events for a platform/environment.
   */
  async getCustomEvents(
    platform: string,
    environment: string,
    eventName?: string,
    limit: number = 100
  ): Promise<CustomEventStats[]> {
    let query = `SELECT platform, environment, eventName, userId, properties, timestamp
      FROM custom_event_stats
      WHERE platform = ?1 AND environment = ?2`;

    const params: unknown[] = [platform, environment];

    if (eventName) {
      query += ` AND eventName = ?3`;
      params.push(eventName);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?${params.length + 1}`;
    params.push(limit);

    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all<{
        platform: string;
        environment: string;
        eventName: string;
        userId: string | null;
        properties: string | null;
        timestamp: string;
      }>();

    return (result.results || []).map(row => ({
      platform: row.platform,
      environment: row.environment,
      eventName: row.eventName,
      userId: row.userId ?? undefined,
      properties: row.properties ? JSON.parse(row.properties) : undefined,
      timestamp: row.timestamp,
    }));
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
              event.metricId,
              event.variationKey,
              event.userId,
              event.value
            );
            break;

          case 'custom_event':
            await this.recordCustomEvent(
              platform,
              environment,
              event.eventName,
              event.userId,
              event.properties
            );
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
   */
  async deleteConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<void> {
    await this.db
      .prepare(
        'DELETE FROM config_stats WHERE platform = ?1 AND environment = ?2 AND configKey = ?3'
      )
      .bind(platform, environment, configKey)
      .run();
  }

  /**
   * Delete all stats for a Feature Flag.
   */
  async deleteFlagStats(
    platform: string,
    environment: string,
    flagKey: string
  ): Promise<void> {
    // Delete main stats
    await this.db
      .prepare(
        'DELETE FROM flag_stats WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3'
      )
      .bind(platform, environment, flagKey)
      .run();

    // Delete daily stats
    await this.db
      .prepare(
        'DELETE FROM flag_stats_daily WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3'
      )
      .bind(platform, environment, flagKey)
      .run();

    // Delete country stats
    await this.db
      .prepare(
        'DELETE FROM flag_stats_country WHERE platform = ?1 AND environment = ?2 AND flagKey = ?3'
      )
      .bind(platform, environment, flagKey)
      .run();
  }

  /**
   * Delete all stats for an Experiment.
   */
  async deleteExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<void> {
    // Delete variation stats
    await this.db
      .prepare(
        'DELETE FROM experiment_stats WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3'
      )
      .bind(platform, environment, experimentKey)
      .run();

    // Delete daily stats
    await this.db
      .prepare(
        'DELETE FROM experiment_stats_daily WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3'
      )
      .bind(platform, environment, experimentKey)
      .run();

    // Delete metric stats
    await this.db
      .prepare(
        'DELETE FROM experiment_metric_stats WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3'
      )
      .bind(platform, environment, experimentKey)
      .run();

    // Delete daily metric stats
    await this.db
      .prepare(
        'DELETE FROM experiment_metric_stats_daily WHERE platform = ?1 AND environment = ?2 AND experimentKey = ?3'
      )
      .bind(platform, environment, experimentKey)
      .run();
  }
}
