/**
 * Mongoose adapter for config parameter operations (Firebase-style).
 *
 * @remarks
 * Implements `IConfigRepository` for individual versioned config parameters.
 * Each parameter has version history; only one version is active at a time.
 */

import {
  ConfigParameter,
  CreateConfigParameter,
  UpdateConfigParameter,
  parseConfigValue,
} from '@togglebox/configs';
import {
  IConfigRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  PaginatedResult,
} from '../../interfaces';
import { ConfigParameterModel, IConfigParameterDocument } from './schemas';

/**
 * Mongoose implementation of config parameter repository.
 *
 * @remarks
 * Uses MongoDB transactions for atomic version updates (requires replica set).
 * Parameters are versioned - edits create new versions.
 */
export class MongooseConfigRepository implements IConfigRepository {
  // ============================================================================
  // PUBLIC (SDK)
  // ============================================================================

  /**
   * Gets all active parameters as key-value object for SDK consumption.
   */
  async getConfigs(
    platform: string,
    environment: string
  ): Promise<Record<string, unknown>> {
    const params = await ConfigParameterModel.find({
      platform,
      environment,
      isActive: true,
    }).exec();

    const configs: Record<string, unknown> = {};
    for (const param of params) {
      configs[param.parameterKey] = parseConfigValue(
        param.defaultValue,
        param.valueType
      );
    }

    return configs;
  }

  // ============================================================================
  // ADMIN CRUD
  // ============================================================================

  /**
   * Creates a new parameter (version 1).
   */
  async create(param: CreateConfigParameter): Promise<ConfigParameter> {
    const timestamp = new Date().toISOString();
    const version = '1';

    try {
      const doc = await ConfigParameterModel.create({
        platform: param.platform,
        environment: param.environment,
        parameterKey: param.parameterKey,
        version,
        valueType: param.valueType,
        defaultValue: param.defaultValue,
        description: param.description ?? null,
        parameterGroup: param.parameterGroup ?? null,
        isActive: true,
        createdBy: param.createdBy,
        createdAt: timestamp,
      });

      return this.mapToConfigParameter(doc);
    } catch (error: unknown) {
      if ((error as { code?: number }).code === 11000) {
        throw new Error(
          `Parameter ${param.parameterKey} already exists in ${param.platform}/${param.environment}`
        );
      }
      throw error;
    }
  }

  /**
   * Updates a parameter (creates new version, marks it active).
   *
   * @remarks
   * SECURITY: Uses MongoDB transactions for atomic version updates.
   * If transactions are unavailable (no replica set), falls back to
   * non-transactional updates with error recovery.
   */
  async update(
    platform: string,
    environment: string,
    parameterKey: string,
    updates: UpdateConfigParameter
  ): Promise<ConfigParameter> {
    // 1. Get current active version
    const current = await ConfigParameterModel.findOne({
      platform,
      environment,
      parameterKey,
      isActive: true,
    }).exec();

    if (!current) {
      throw new Error(
        `Parameter ${parameterKey} not found in ${platform}/${environment}`
      );
    }

    // 2. Calculate next version
    const nextVersion = String(parseInt(current.version, 10) + 1);
    const timestamp = new Date().toISOString();

    // 3. Try to use transactions for atomicity (requires replica set)
    const session = await ConfigParameterModel.startSession();
    try {
      let created: IConfigParameterDocument | undefined;

      await session.withTransaction(async () => {
        // Deactivate old version
        await ConfigParameterModel.updateOne(
          {
            platform,
            environment,
            parameterKey,
            version: current.version,
          },
          { isActive: false }
        ).session(session);

        // Create new version
        const docs = await ConfigParameterModel.create(
          [
            {
              platform,
              environment,
              parameterKey,
              version: nextVersion,
              valueType: updates.valueType ?? current.valueType,
              defaultValue: updates.defaultValue ?? current.defaultValue,
              description:
                updates.description !== undefined
                  ? (updates.description ?? null)
                  : current.description,
              parameterGroup:
                updates.parameterGroup !== undefined
                  ? (updates.parameterGroup ?? null)
                  : current.parameterGroup,
              isActive: true,
              createdBy: updates.createdBy,
              createdAt: timestamp,
            },
          ],
          { session }
        );
        created = docs[0];
      });

      if (!created) {
        throw new Error('Failed to create new config parameter version');
      }
      return this.mapToConfigParameter(created);
    } catch (error: unknown) {
      // If transactions are not available, fall back to non-transactional update
      const errorCode = (error as { code?: number }).code;
      if (errorCode === 263 || errorCode === 20) {
        // 263: CannotCreateSession (no replica set), 20: IllegalOperation
        // Fall back to non-transactional update
        await ConfigParameterModel.updateOne(
          {
            platform,
            environment,
            parameterKey,
            version: current.version,
          },
          { isActive: false }
        ).exec();

        const created = await ConfigParameterModel.create({
          platform,
          environment,
          parameterKey,
          version: nextVersion,
          valueType: updates.valueType ?? current.valueType,
          defaultValue: updates.defaultValue ?? current.defaultValue,
          description:
            updates.description !== undefined
              ? (updates.description ?? null)
              : current.description,
          parameterGroup:
            updates.parameterGroup !== undefined
              ? (updates.parameterGroup ?? null)
              : current.parameterGroup,
          isActive: true,
          createdBy: updates.createdBy,
          createdAt: timestamp,
        });

        return this.mapToConfigParameter(created);
      }
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Deletes a parameter (all versions).
   */
  async delete(
    platform: string,
    environment: string,
    parameterKey: string
  ): Promise<boolean> {
    const result = await ConfigParameterModel.deleteMany({
      platform,
      environment,
      parameterKey,
    }).exec();

    return result.deletedCount > 0;
  }

  /**
   * Gets the active version of a parameter.
   */
  async getActive(
    platform: string,
    environment: string,
    parameterKey: string
  ): Promise<ConfigParameter | null> {
    const param = await ConfigParameterModel.findOne({
      platform,
      environment,
      parameterKey,
      isActive: true,
    }).exec();

    return param ? this.mapToConfigParameter(param) : null;
  }

  /**
   * Lists all active parameters with metadata.
   */
  async listActive(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams
  ): Promise<PaginatedResult<ConfigParameter>> {
    // Get total count
    const total = await ConfigParameterModel.countDocuments({
      platform,
      environment,
      isActive: true,
    }).exec();

    // Use offset-based pagination for Mongoose
    // Only apply pagination if explicitly provided; otherwise fetch all items
    const offsetPagination = pagination as OffsetPaginationParams | undefined;

    let query = ConfigParameterModel.find({
      platform,
      environment,
      isActive: true,
    }).sort({ parameterKey: 1 });

    if (offsetPagination) {
      query = query.skip(offsetPagination.offset ?? 0).limit(offsetPagination.limit);
    }

    const params = await query.exec();

    return {
      items: params.map((p) => this.mapToConfigParameter(p)),
      total,
    };
  }

  /**
   * Lists all versions of a parameter.
   */
  async listVersions(
    platform: string,
    environment: string,
    parameterKey: string
  ): Promise<ConfigParameter[]> {
    const params = await ConfigParameterModel.find({
      platform,
      environment,
      parameterKey,
    })
      .sort({ version: -1 }) // Newest first (descending by version number as string)
      .exec();

    return params.map((p) => this.mapToConfigParameter(p));
  }

  /**
   * Rolls back to a previous version (marks it active).
   */
  async rollback(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string
  ): Promise<ConfigParameter | null> {
    // 1. Check target version exists
    const targetVersion = await ConfigParameterModel.findOne({
      platform,
      environment,
      parameterKey,
      version,
    }).exec();

    if (!targetVersion) {
      return null;
    }

    // 2. Get current active version
    const currentActive = await ConfigParameterModel.findOne({
      platform,
      environment,
      parameterKey,
      isActive: true,
    }).exec();

    // If target is already active, return it
    if (currentActive?.version === version) {
      return this.mapToConfigParameter(currentActive);
    }

    // 3. Deactivate current version (if exists)
    if (currentActive) {
      await ConfigParameterModel.updateOne(
        {
          platform,
          environment,
          parameterKey,
          version: currentActive.version,
        },
        { isActive: false }
      ).exec();
    }

    // 4. Activate target version
    const updated = await ConfigParameterModel.findOneAndUpdate(
      {
        platform,
        environment,
        parameterKey,
        version,
      },
      { isActive: true },
      { new: true }
    ).exec();

    return updated ? this.mapToConfigParameter(updated) : null;
  }

  /**
   * Counts active parameters in an environment.
   */
  async count(platform: string, environment: string): Promise<number> {
    return ConfigParameterModel.countDocuments({
      platform,
      environment,
      isActive: true,
    }).exec();
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps Mongoose document to ConfigParameter type.
   */
  private mapToConfigParameter(doc: IConfigParameterDocument): ConfigParameter {
    return {
      platform: doc.platform,
      environment: doc.environment,
      parameterKey: doc.parameterKey,
      version: doc.version,
      valueType: doc.valueType,
      defaultValue: doc.defaultValue,
      description: doc.description ?? undefined,
      parameterGroup: doc.parameterGroup ?? undefined,
      isActive: doc.isActive,
      createdBy: doc.createdBy,
      createdAt: doc.createdAt,
    };
  }
}
