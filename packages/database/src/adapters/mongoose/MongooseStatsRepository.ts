/**
 * Mongoose adapter for Statistics operations.
 *
 * @remarks
 * Implements `IStatsRepository` from @togglebox/stats package.
 * Uses atomic increment operations for efficient stat updates.
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
} from "@togglebox/stats";
import type { IStatsRepository } from "@togglebox/stats";
import { StatsModel, CustomEventModel } from "./schemas";

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
 * Mongoose implementation of Stats repository.
 *
 * @remarks
 * Schema uses statsType discriminator for different stat types:
 * - 'config': Remote Config stats
 * - 'flag': Feature Flag main stats
 * - 'flag_country': Flag stats by country
 * - 'flag_daily': Flag stats by date
 * - 'exp_var': Experiment variation stats
 * - 'exp_metric': Experiment metric stats
 */
export class MongooseStatsRepository implements IStatsRepository {
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
    _clientId?: string,
  ): Promise<void> {
    const now = new Date().toISOString();

    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "config",
        key: configKey,
      },
      {
        $inc: { fetchCount: 1 },
        $set: { lastFetchedAt: now, updatedAt: now },
      },
      { upsert: true },
    );
  }

  /**
   * Get stats for a Remote Config.
   */
  async getConfigStats(
    platform: string,
    environment: string,
    configKey: string,
  ): Promise<ConfigStats | null> {
    const doc = await StatsModel.findOne({
      platform,
      environment,
      statsType: "config",
      key: configKey,
    });

    if (!doc) {
      return null;
    }

    return {
      platform: doc.platform,
      environment: doc.environment,
      configKey: doc.key,
      fetchCount: doc.fetchCount ?? 0,
      lastFetchedAt: doc.lastFetchedAt,
      uniqueClients24h: doc.uniqueClients24h ?? 0,
      updatedAt: doc.updatedAt,
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
    value: "A" | "B",
    _userId: string,
    country?: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const today = now.split("T")[0]; // YYYY-MM-DD

    // Update main stats
    const incField = value === "A" ? "valueACount" : "valueBCount";
    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "flag",
        key: flagKey,
      },
      {
        $inc: {
          totalEvaluations: 1,
          [incField]: 1,
        },
        $set: { lastEvaluatedAt: now, updatedAt: now },
      },
      { upsert: true },
    );

    // Update daily stats
    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "flag_daily",
        key: flagKey,
        subKey: today,
      },
      {
        $inc: { [incField]: 1 },
        $set: { date: today, updatedAt: now },
      },
      { upsert: true },
    );

    // Update country stats if provided
    if (country) {
      await StatsModel.updateOne(
        {
          platform,
          environment,
          statsType: "flag_country",
          key: flagKey,
          subKey: country,
        },
        {
          $inc: { [incField]: 1 },
          $set: { country, updatedAt: now },
        },
        { upsert: true },
      );
    }
  }

  /**
   * Get stats for a Feature Flag.
   */
  async getFlagStats(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<FlagStats | null> {
    const doc = await StatsModel.findOne({
      platform,
      environment,
      statsType: "flag",
      key: flagKey,
    });

    if (!doc) {
      return null;
    }

    return {
      platform: doc.platform,
      environment: doc.environment,
      flagKey: doc.key,
      totalEvaluations: doc.totalEvaluations ?? 0,
      valueACount: doc.valueACount ?? 0,
      valueBCount: doc.valueBCount ?? 0,
      uniqueUsersA24h: doc.uniqueUsersA24h ?? 0,
      uniqueUsersB24h: doc.uniqueUsersB24h ?? 0,
      lastEvaluatedAt: doc.lastEvaluatedAt,
      updatedAt: doc.updatedAt,
    };
  }

  /**
   * Get country breakdown for a Feature Flag.
   */
  async getFlagStatsByCountry(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<FlagStatsByCountry[]> {
    const docs = await StatsModel.find({
      platform,
      environment,
      statsType: "flag_country",
      key: flagKey,
    });

    return docs.map((doc) => ({
      country: doc.country ?? "",
      valueACount: doc.valueACount ?? 0,
      valueBCount: doc.valueBCount ?? 0,
    }));
  }

  /**
   * Get daily time series for a Feature Flag.
   */
  async getFlagStatsDaily(
    platform: string,
    environment: string,
    flagKey: string,
    days: number = 30,
  ): Promise<FlagStatsDaily[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split("T")[0];
    const todayStr = today.toISOString().split("T")[0];

    const docs = await StatsModel.find({
      platform,
      environment,
      statsType: "flag_daily",
      key: flagKey,
      subKey: { $gte: startDateStr, $lte: todayStr },
    }).sort({ subKey: 1 });

    return docs.map((doc) => ({
      date: doc.date ?? "",
      valueACount: doc.valueACount ?? 0,
      valueBCount: doc.valueBCount ?? 0,
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
    _userId: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Update variation stats
    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "exp_var",
        key: experimentKey,
        subKey: variationKey,
      },
      {
        $inc: {
          participants: 1,
          exposures: 1,
        },
        $set: {
          variationKey,
          lastExposureAt: now,
          updatedAt: now,
        },
      },
      { upsert: true },
    );

    // Update daily variation stats
    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "exp_var",
        key: experimentKey,
        subKey: `${variationKey}#${today}`,
      },
      {
        $inc: { participants: 1 },
        $set: {
          variationKey,
          date: today,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
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
    value?: number,
  ): Promise<void> {
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Update metric stats
    const incFields: Record<string, number> = {
      conversions: 1,
      sampleSize: 1,
      count: 1,
    };

    if (value !== undefined) {
      incFields["sumValue"] = value;
    }

    const updateFields = {
      $inc: incFields,
      $set: {
        variationKey,
        metricId,
        lastConversionAt: now,
        updatedAt: now,
      },
    };

    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "exp_metric",
        key: experimentKey,
        subKey: `${variationKey}#${metricId}`,
      },
      updateFields,
      { upsert: true },
    );

    // Update daily metric stats
    const dailyIncFields: Record<string, number> = {
      conversions: 1,
      sampleSize: 1,
      count: 1,
    };

    if (value !== undefined) {
      dailyIncFields["sumValue"] = value;
    }

    const dailyUpdateFields = {
      $inc: dailyIncFields,
      $set: {
        variationKey,
        metricId,
        date: today,
        updatedAt: now,
      },
    };

    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "exp_metric",
        key: experimentKey,
        subKey: `${variationKey}#${metricId}#${today}`,
      },
      dailyUpdateFields,
      { upsert: true },
    );

    // Update daily experiment stats (aggregate conversions for all metrics)
    // This populates the dailyData array in getExperimentStats()
    await StatsModel.updateOne(
      {
        platform,
        environment,
        statsType: "exp_var",
        key: experimentKey,
        subKey: `${variationKey}#${today}`,
      },
      {
        $inc: { conversions: 1 },
        $set: {
          variationKey,
          date: today,
          updatedAt: now,
        },
      },
      { upsert: true },
    );
  }

  /**
   * Get full stats for an Experiment.
   */
  async getExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<ExperimentStats | null> {
    // Query all variation stats (excluding daily stats)
    const docs = await StatsModel.find({
      platform,
      environment,
      statsType: "exp_var",
      key: experimentKey,
      subKey: { $not: /#/ }, // Exclude daily stats (subKey doesn't contain #)
    });

    if (docs.length === 0) {
      return null;
    }

    const variations = docs.map((doc) => ({
      variationKey: doc.variationKey ?? "",
      participants: doc.participants ?? 0,
      views: doc.participants ?? 0,
      users: 0, // Mongoose adapter does not track unique users yet
      exposures: doc.exposures ?? 0,
    }));

    // Query daily variation stats (subKey contains #date pattern)
    const dailyDocs = await StatsModel.find({
      platform,
      environment,
      statsType: "exp_var",
      key: experimentKey,
      subKey: /#/, // Only daily stats (subKey contains #)
    }).sort({ date: 1, variationKey: 1 });

    // Aggregate conversions from daily metric stats for each variation+date
    const conversionMap = new Map<string, number>();
    const metricDocs = await StatsModel.find({
      platform,
      environment,
      statsType: "exp_metric",
      key: experimentKey,
      date: { $exists: true }, // Only daily metric stats
    });

    for (const doc of metricDocs) {
      if (doc.date && doc.variationKey) {
        const mapKey = `${doc.date}#${doc.variationKey}`;
        conversionMap.set(
          mapKey,
          (conversionMap.get(mapKey) ?? 0) + (doc.conversions ?? 0),
        );
      }
    }

    const dailyData = dailyDocs.map((doc) => {
      const mapKey = `${doc.date}#${doc.variationKey}`;
      return {
        date: doc.date ?? "",
        variationKey: doc.variationKey ?? "",
        participants: doc.participants ?? 0,
        conversions: conversionMap.get(mapKey) ?? 0,
      };
    });

    return {
      platform,
      environment,
      experimentKey,
      variations,
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
    metricId: string,
  ): Promise<ExperimentMetricStats[]> {
    // Query daily metric stats
    const docs = await StatsModel.find({
      platform,
      environment,
      statsType: "exp_metric",
      key: experimentKey,
      subKey: new RegExp(`^${variationKey}#${metricId}#\\d{4}-\\d{2}-\\d{2}$`),
    }).sort({ subKey: 1 });

    return docs.map((doc) => ({
      platform,
      environment,
      experimentKey,
      variationKey,
      metricId,
      date: doc.date ?? "",
      sampleSize: doc.sampleSize ?? 0,
      sum: doc.sumValue ?? 0,
      count: doc.count ?? 0,
      conversions: doc.conversions ?? 0,
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
    properties?: Record<string, unknown>,
  ): Promise<void> {
    const now = new Date().toISOString();

    await CustomEventModel.create({
      platform,
      environment,
      eventName,
      userId,
      properties,
      timestamp: now,
    });
  }

  /**
   * Get custom events for a platform/environment.
   */
  async getCustomEvents(
    platform: string,
    environment: string,
    eventName?: string,
    limit: number = 100,
  ): Promise<CustomEventStats[]> {
    const query: Record<string, unknown> = { platform, environment };
    if (eventName) {
      query["eventName"] = eventName;
    }

    const docs = await CustomEventModel.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);

    return docs.map((doc) => ({
      platform: doc.platform,
      environment: doc.environment,
      eventName: doc.eventName,
      userId: doc.userId,
      properties: doc.properties,
      timestamp: doc.timestamp,
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
    events: StatsEvent[],
  ): Promise<void> {
    // Limit concurrency to avoid overwhelming the database
    const limit = pLimit(25);

    const processEvent = async (event: StatsEvent): Promise<void> => {
      try {
        switch (event.type) {
          case "config_fetch":
            await this.incrementConfigFetch(
              platform,
              environment,
              event.key,
              event.clientId,
            );
            break;

          case "flag_evaluation":
            await this.incrementFlagEvaluation(
              platform,
              environment,
              event.flagKey,
              event.value,
              event.userId,
              event.country,
            );
            break;

          case "experiment_exposure":
            await this.recordExperimentExposure(
              platform,
              environment,
              event.experimentKey,
              event.variationKey,
              event.userId,
            );
            break;

          case "conversion":
            await this.recordConversion(
              platform,
              environment,
              event.experimentKey,
              event.metricId,
              event.variationKey,
              event.userId,
              event.value,
            );
            break;

          case "custom_event":
            await this.recordCustomEvent(
              platform,
              environment,
              event.eventName,
              event.userId,
              event.properties,
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
    configKey: string,
  ): Promise<void> {
    await StatsModel.deleteMany({
      platform,
      environment,
      statsType: "config",
      key: configKey,
    });
  }

  /**
   * Delete all stats for a Feature Flag.
   */
  async deleteFlagStats(
    platform: string,
    environment: string,
    flagKey: string,
  ): Promise<void> {
    await StatsModel.deleteMany({
      platform,
      environment,
      statsType: { $in: ["flag", "flag_country", "flag_daily"] },
      key: flagKey,
    });
  }

  /**
   * Delete all stats for an Experiment.
   */
  async deleteExperimentStats(
    platform: string,
    environment: string,
    experimentKey: string,
  ): Promise<void> {
    await StatsModel.deleteMany({
      platform,
      environment,
      statsType: { $in: ["exp_var", "exp_metric"] },
      key: experimentKey,
    });
  }
}
