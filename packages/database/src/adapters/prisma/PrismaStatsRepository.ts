/**
 * Prisma adapter for Statistics operations.
 *
 * @remarks
 * Implements `IStatsRepository` from @togglebox/stats package.
 * Uses database-level atomic operations for efficient stat updates.
 */

import { PrismaClient } from '.prisma/client-database';
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
 * Prisma implementation of Stats repository.
 *
 * @remarks
 * Database schema:
 * - ConfigStats: Composite unique (platform, environment, configKey)
 * - FlagStats: Composite unique (platform, environment, flagKey)
 * - FlagStatsByCountry: Composite unique (platform, environment, flagKey, country)
 * - FlagStatsDaily: Composite unique (platform, environment, flagKey, date)
 * - ExperimentStats: Composite unique (platform, environment, experimentKey, variationKey)
 * - ExperimentMetricStats: Composite unique (platform, environment, experimentKey, variationKey, metricId, date)
 *
 * Uses upsert operations for atomic counter increments.
 */
export class PrismaStatsRepository implements IStatsRepository {
  constructor(private prisma: PrismaClient) {}

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

    await this.prisma.configStats.upsert({
      where: {
        platform_environment_configKey: { platform, environment, configKey },
      },
      create: {
        platform,
        environment,
        configKey,
        fetchCount: 1,
        lastFetchedAt: now,
        uniqueClients24h: 0,
        updatedAt: now,
      },
      update: {
        fetchCount: { increment: 1 },
        lastFetchedAt: now,
        updatedAt: now,
      },
    });
  }

  /**
   * Get stats for a Remote Config.
   */
  async getConfigStats(
    platform: string,
    environment: string,
    configKey: string
  ): Promise<ConfigStats | null> {
    const stats = await this.prisma.configStats.findUnique({
      where: {
        platform_environment_configKey: { platform, environment, configKey },
      },
    });

    if (!stats) {
      return null;
    }

    return {
      platform: stats.platform,
      environment: stats.environment,
      configKey: stats.configKey,
      fetchCount: stats.fetchCount,
      lastFetchedAt: stats.lastFetchedAt || undefined,
      uniqueClients24h: stats.uniqueClients24h,
      updatedAt: stats.updatedAt,
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
    const today = now.split('T')[0] as string; // YYYY-MM-DD

    // Update main stats
    await this.prisma.flagStats.upsert({
      where: {
        platform_environment_flagKey: { platform, environment, flagKey },
      },
      create: {
        platform,
        environment,
        flagKey,
        totalEvaluations: 1,
        valueACount: value === 'A' ? 1 : 0,
        valueBCount: value === 'B' ? 1 : 0,
        uniqueUsersA24h: 0,
        uniqueUsersB24h: 0,
        lastEvaluatedAt: now,
        updatedAt: now,
      },
      update: {
        totalEvaluations: { increment: 1 },
        valueACount: value === 'A' ? { increment: 1 } : undefined,
        valueBCount: value === 'B' ? { increment: 1 } : undefined,
        lastEvaluatedAt: now,
        updatedAt: now,
      },
    });

    // Update daily stats
    await this.prisma.flagStatsDaily.upsert({
      where: {
        platform_environment_flagKey_date: { platform, environment, flagKey, date: today },
      },
      create: {
        platform,
        environment,
        flagKey,
        date: today,
        valueACount: value === 'A' ? 1 : 0,
        valueBCount: value === 'B' ? 1 : 0,
      },
      update: {
        valueACount: value === 'A' ? { increment: 1 } : undefined,
        valueBCount: value === 'B' ? { increment: 1 } : undefined,
      },
    });

    // Update country stats if provided
    if (country) {
      await this.prisma.flagStatsByCountry.upsert({
        where: {
          platform_environment_flagKey_country: { platform, environment, flagKey, country },
        },
        create: {
          platform,
          environment,
          flagKey,
          country,
          valueACount: value === 'A' ? 1 : 0,
          valueBCount: value === 'B' ? 1 : 0,
        },
        update: {
          valueACount: value === 'A' ? { increment: 1 } : undefined,
          valueBCount: value === 'B' ? { increment: 1 } : undefined,
        },
      });
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
    const stats = await this.prisma.flagStats.findUnique({
      where: {
        platform_environment_flagKey: { platform, environment, flagKey },
      },
    });

    if (!stats) {
      return null;
    }

    return {
      platform: stats.platform,
      environment: stats.environment,
      flagKey: stats.flagKey,
      totalEvaluations: stats.totalEvaluations,
      valueACount: stats.valueACount,
      valueBCount: stats.valueBCount,
      uniqueUsersA24h: stats.uniqueUsersA24h,
      uniqueUsersB24h: stats.uniqueUsersB24h,
      lastEvaluatedAt: stats.lastEvaluatedAt || undefined,
      updatedAt: stats.updatedAt,
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
    const stats = await this.prisma.flagStatsByCountry.findMany({
      where: {
        platform,
        environment,
        flagKey,
      },
      orderBy: { country: 'asc' },
    });

    return stats.map(s => ({
      country: s.country,
      valueACount: s.valueACount,
      valueBCount: s.valueBCount,
    }));
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
    const endDateStr = today.toISOString().split('T')[0];

    const stats = await this.prisma.flagStatsDaily.findMany({
      where: {
        platform,
        environment,
        flagKey,
        date: {
          gte: startDateStr,
          lte: endDateStr,
        },
      },
      orderBy: { date: 'asc' },
    });

    return stats.map(s => ({
      date: s.date,
      valueACount: s.valueACount,
      valueBCount: s.valueBCount,
    }));
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
    const today = now.split('T')[0] as string;

    // Update variation stats
    await this.prisma.experimentVariationStats.upsert({
      where: {
        platform_environment_experimentKey_variationKey: {
          platform,
          environment,
          experimentKey,
          variationKey,
        },
      },
      create: {
        platform,
        environment,
        experimentKey,
        variationKey,
        participants: 1,
        exposures: 1,
        lastExposureAt: now,
        updatedAt: now,
      },
      update: {
        participants: { increment: 1 },
        exposures: { increment: 1 },
        lastExposureAt: now,
        updatedAt: now,
      },
    });

    // Update daily variation stats
    await this.prisma.experimentStatsDaily.upsert({
      where: {
        platform_environment_experimentKey_variationKey_date: {
          platform,
          environment,
          experimentKey,
          variationKey,
          date: today,
        },
      },
      create: {
        platform,
        environment,
        experimentKey,
        variationKey,
        date: today,
        participants: 1,
      },
      update: {
        participants: { increment: 1 },
      },
    });
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
    const today = now.split('T')[0] as string;

    // Update aggregate metric stats (no date)
    await this.prisma.experimentMetricStats.upsert({
      where: {
        platform_environment_experimentKey_variationKey_metricId: {
          platform,
          environment,
          experimentKey,
          variationKey,
          metricId,
        },
      },
      create: {
        platform,
        environment,
        experimentKey,
        variationKey,
        metricId,
        sampleSize: 1,
        sumValue: value || 0,
        count: 1,
        conversions: 1,
        lastConversionAt: now,
        updatedAt: now,
      },
      update: {
        sampleSize: { increment: 1 },
        sumValue: value !== undefined ? { increment: value } : undefined,
        count: { increment: 1 },
        conversions: { increment: 1 },
        lastConversionAt: now,
        updatedAt: now,
      },
    });

    // Update daily metric stats
    await this.prisma.experimentMetricStatsDaily.upsert({
      where: {
        platform_environment_experimentKey_variationKey_metricId_date: {
          platform,
          environment,
          experimentKey,
          variationKey,
          metricId,
          date: today,
        },
      },
      create: {
        platform,
        environment,
        experimentKey,
        variationKey,
        metricId,
        date: today,
        sampleSize: 1,
        sumValue: value || 0,
        count: 1,
        conversions: 1,
      },
      update: {
        sampleSize: { increment: 1 },
        sumValue: value !== undefined ? { increment: value } : undefined,
        count: { increment: 1 },
        conversions: { increment: 1 },
      },
    });
  }

  /**
   * Get full stats for an Experiment.
   */
  async getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string
  ): Promise<ExperimentStats | null> {
    const variationStats = await this.prisma.experimentVariationStats.findMany({
      where: {
        platform,
        environment,
        experimentKey,
      },
      orderBy: { variationKey: 'asc' },
    });

    if (variationStats.length === 0) {
      return null;
    }

    const variations = variationStats.map(v => ({
      variationKey: v.variationKey,
      participants: v.participants,
      exposures: v.exposures,
    }));

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
   * Get metric stats for a specific variation and metric (time series data).
   */
  async getExperimentMetricStats(
    platform: string,
    environment: string,
    experimentKey: string,
    variationKey: string,
    metricId: string
  ): Promise<ExperimentMetricStats[]> {
    // Query daily stats for time series data
    const stats = await this.prisma.experimentMetricStatsDaily.findMany({
      where: {
        platform,
        environment,
        experimentKey,
        variationKey,
        metricId,
      },
      orderBy: { date: 'asc' },
    });

    return stats.map(s => ({
      platform: s.platform,
      environment: s.environment,
      experimentKey: s.experimentKey,
      variationKey: s.variationKey,
      metricId: s.metricId,
      date: s.date,
      sampleSize: s.sampleSize,
      sum: s.sumValue,
      count: s.count,
      conversions: s.conversions,
    }));
  }

  // =========================================================================
  // BATCH PROCESSING
  // =========================================================================

  /**
   * Process a batch of events from SDK.
   *
   * @remarks
   * Events are processed in parallel for performance.
   * Individual event failures are logged but don't fail the entire batch.
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
        // Log individual event failures but don't fail the batch
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
    await this.prisma.configStats.delete({
      where: {
        platform_environment_configKey: { platform, environment, configKey },
      },
    }).catch(() => {
      // Ignore if not found
    });
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
    await this.prisma.flagStats.delete({
      where: {
        platform_environment_flagKey: { platform, environment, flagKey },
      },
    }).catch(() => {
      // Ignore if not found
    });

    // Delete daily stats
    await this.prisma.flagStatsDaily.deleteMany({
      where: { platform, environment, flagKey },
    });

    // Delete country stats
    await this.prisma.flagStatsByCountry.deleteMany({
      where: { platform, environment, flagKey },
    });
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
    await this.prisma.experimentVariationStats.deleteMany({
      where: { platform, environment, experimentKey },
    });

    // Delete daily stats
    await this.prisma.experimentStatsDaily.deleteMany({
      where: { platform, environment, experimentKey },
    });

    // Delete metric stats
    await this.prisma.experimentMetricStats.deleteMany({
      where: { platform, environment, experimentKey },
    });
  }
}
