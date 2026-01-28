/**
 * Cloudflare D1 adapter for config parameter operations (Firebase-style).
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
} from "@togglebox/configs";
import {
  IConfigRepository,
  OffsetPaginationParams,
  TokenPaginationParams,
  PaginatedResult,
} from "../../interfaces";

/**
 * D1 result row type for config parameters.
 */
interface ConfigParameterRow {
  platform: string;
  environment: string;
  parameterKey: string;
  version: string;
  valueType: string;
  defaultValue: string;
  description: string | null;
  parameterGroup: string | null;
  isActive: number; // SQLite uses 0/1 for boolean
  createdBy: string;
  createdAt: string;
}

/**
 * D1 implementation of config parameter repository.
 *
 * @remarks
 * Uses SQLite transactions for atomic version updates.
 * Parameters are versioned - edits create new versions.
 * **SQLite Booleans:** Uses 0/1 for boolean fields.
 */
export class D1ConfigRepository implements IConfigRepository {
  constructor(private db: D1Database) {}

  // ============================================================================
  // PUBLIC (SDK)
  // ============================================================================

  /**
   * Gets all active parameters as key-value object for SDK consumption.
   */
  async getConfigs(
    platform: string,
    environment: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.db
      .prepare(
        `SELECT parameterKey, defaultValue, valueType
        FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND isActive = 1`,
      )
      .bind(platform, environment)
      .all<{ parameterKey: string; defaultValue: string; valueType: string }>();

    const configs: Record<string, unknown> = {};
    if (result.results) {
      for (const param of result.results) {
        configs[param.parameterKey] = parseConfigValue(
          param.defaultValue,
          param.valueType as "string" | "number" | "boolean" | "json",
        );
      }
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
    const version = "1";

    try {
      await this.db
        .prepare(
          `INSERT INTO config_parameters
          (platform, environment, parameterKey, version, valueType, defaultValue, description, parameterGroup, isActive, createdBy, createdAt)
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10)`,
        )
        .bind(
          param.platform,
          param.environment,
          param.parameterKey,
          version,
          param.valueType,
          param.defaultValue,
          param.description ?? null,
          param.parameterGroup ?? null,
          param.createdBy,
          timestamp,
        )
        .run();

      return {
        platform: param.platform,
        environment: param.environment,
        parameterKey: param.parameterKey,
        version,
        valueType: param.valueType,
        defaultValue: param.defaultValue,
        description: param.description,
        parameterGroup: param.parameterGroup,
        isActive: true,
        createdBy: param.createdBy,
        createdAt: timestamp,
      };
    } catch (error: unknown) {
      const errMessage = (error as Error).message || "";
      if (
        errMessage.includes("UNIQUE constraint failed") ||
        errMessage.includes("PRIMARY KEY")
      ) {
        throw new Error(
          `Parameter ${param.parameterKey} already exists in ${param.platform}/${param.environment}`,
        );
      }
      throw error;
    }
  }

  /**
   * Updates a parameter (creates new version, marks it active).
   *
   * @remarks
   * SECURITY: Uses D1 batch to execute both operations atomically.
   * This ensures we never end up with two active versions or no active version.
   */
  async update(
    platform: string,
    environment: string,
    parameterKey: string,
    updates: UpdateConfigParameter,
  ): Promise<ConfigParameter> {
    // 1. Get current active version
    const current = await this.db
      .prepare(
        `SELECT * FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND isActive = 1`,
      )
      .bind(platform, environment, parameterKey)
      .first<ConfigParameterRow>();

    if (!current) {
      throw new Error(
        `Parameter ${parameterKey} not found in ${platform}/${environment}`,
      );
    }

    // 2. Calculate next version
    const nextVersion = String(parseInt(current.version, 10) + 1);
    const timestamp = new Date().toISOString();

    // 3. Prepare new values
    const newValueType = updates.valueType ?? current.valueType;
    const newDefaultValue = updates.defaultValue ?? current.defaultValue;
    const newDescription =
      updates.description !== undefined
        ? (updates.description ?? null)
        : current.description;
    const newParameterGroup =
      updates.parameterGroup !== undefined
        ? (updates.parameterGroup ?? null)
        : current.parameterGroup;

    // 4. SECURITY: Use batch to execute both operations atomically
    const deactivateStmt = this.db
      .prepare(
        `UPDATE config_parameters SET isActive = 0
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND version = ?4`,
      )
      .bind(platform, environment, parameterKey, current.version);

    const insertStmt = this.db
      .prepare(
        `INSERT INTO config_parameters
        (platform, environment, parameterKey, version, valueType, defaultValue, description, parameterGroup, isActive, createdBy, createdAt)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 1, ?9, ?10)`,
      )
      .bind(
        platform,
        environment,
        parameterKey,
        nextVersion,
        newValueType,
        newDefaultValue,
        newDescription,
        newParameterGroup,
        updates.createdBy,
        timestamp,
      );

    await this.db.batch([deactivateStmt, insertStmt]);

    return {
      platform,
      environment,
      parameterKey,
      version: nextVersion,
      valueType: newValueType as "string" | "number" | "boolean" | "json",
      defaultValue: newDefaultValue,
      description: newDescription ?? undefined,
      parameterGroup: newParameterGroup ?? undefined,
      isActive: true,
      createdBy: updates.createdBy,
      createdAt: timestamp,
    };
  }

  /**
   * Deletes a parameter (all versions).
   */
  async delete(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<boolean> {
    const result = await this.db
      .prepare(
        `DELETE FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3`,
      )
      .bind(platform, environment, parameterKey)
      .run();

    return result.meta.rows_written > 0;
  }

  /**
   * Gets the active version of a parameter.
   */
  async getActive(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter | null> {
    const result = await this.db
      .prepare(
        `SELECT * FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND isActive = 1`,
      )
      .bind(platform, environment, parameterKey)
      .first<ConfigParameterRow>();

    return result ? this.mapToConfigParameter(result) : null;
  }

  /**
   * Lists all active parameters with metadata.
   */
  async listActive(
    platform: string,
    environment: string,
    pagination?: OffsetPaginationParams | TokenPaginationParams,
  ): Promise<PaginatedResult<ConfigParameter>> {
    // Get total count
    const countResult = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND isActive = 1`,
      )
      .bind(platform, environment)
      .first<{ count: number }>();

    const total = countResult?.count || 0;

    // Use offset-based pagination
    // Only apply pagination if explicitly provided; otherwise fetch all items
    const offsetPagination = pagination as OffsetPaginationParams | undefined;

    let result;
    if (offsetPagination) {
      const limit = offsetPagination.limit;
      const offset = offsetPagination.offset ?? 0;

      result = await this.db
        .prepare(
          `SELECT * FROM config_parameters
          WHERE platform = ?1 AND environment = ?2 AND isActive = 1
          ORDER BY parameterKey ASC
          LIMIT ?3 OFFSET ?4`,
        )
        .bind(platform, environment, limit, offset)
        .all<ConfigParameterRow>();
    } else {
      result = await this.db
        .prepare(
          `SELECT * FROM config_parameters
          WHERE platform = ?1 AND environment = ?2 AND isActive = 1
          ORDER BY parameterKey ASC`,
        )
        .bind(platform, environment)
        .all<ConfigParameterRow>();
    }

    const items = result.results
      ? result.results.map((row) => this.mapToConfigParameter(row))
      : [];

    return { items, total };
  }

  /**
   * Lists all versions of a parameter.
   */
  async listVersions(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter[]> {
    const result = await this.db
      .prepare(
        `SELECT * FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3
        ORDER BY CAST(version AS INTEGER) DESC`,
      )
      .bind(platform, environment, parameterKey)
      .all<ConfigParameterRow>();

    return result.results
      ? result.results.map((row) => this.mapToConfigParameter(row))
      : [];
  }

  /**
   * Rolls back to a previous version (marks it active).
   *
   * @remarks
   * SECURITY: Uses D1 batch to execute both operations atomically.
   */
  async rollback(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string,
  ): Promise<ConfigParameter | null> {
    // 1. Check target version exists
    const targetVersion = await this.db
      .prepare(
        `SELECT * FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND version = ?4`,
      )
      .bind(platform, environment, parameterKey, version)
      .first<ConfigParameterRow>();

    if (!targetVersion) {
      return null;
    }

    // 2. Get current active version
    const currentActive = await this.db
      .prepare(
        `SELECT version FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND isActive = 1`,
      )
      .bind(platform, environment, parameterKey)
      .first<{ version: string }>();

    // If target is already active, return it
    if (currentActive?.version === version) {
      return this.mapToConfigParameter(targetVersion);
    }

    // 3. SECURITY: Use batch to execute both operations atomically
    if (currentActive) {
      const deactivateStmt = this.db
        .prepare(
          `UPDATE config_parameters SET isActive = 0
          WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND version = ?4`,
        )
        .bind(platform, environment, parameterKey, currentActive.version);

      const activateStmt = this.db
        .prepare(
          `UPDATE config_parameters SET isActive = 1
          WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND version = ?4`,
        )
        .bind(platform, environment, parameterKey, version);

      await this.db.batch([deactivateStmt, activateStmt]);
    } else {
      // No current active version, just activate target
      await this.db
        .prepare(
          `UPDATE config_parameters SET isActive = 1
          WHERE platform = ?1 AND environment = ?2 AND parameterKey = ?3 AND version = ?4`,
        )
        .bind(platform, environment, parameterKey, version)
        .run();
    }

    return {
      ...this.mapToConfigParameter(targetVersion),
      isActive: true,
    };
  }

  /**
   * Counts active parameters in an environment.
   */
  async count(platform: string, environment: string): Promise<number> {
    const result = await this.db
      .prepare(
        `SELECT COUNT(*) as count FROM config_parameters
        WHERE platform = ?1 AND environment = ?2 AND isActive = 1`,
      )
      .bind(platform, environment)
      .first<{ count: number }>();

    return result?.count || 0;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps D1 row to ConfigParameter type.
   */
  private mapToConfigParameter(row: ConfigParameterRow): ConfigParameter {
    return {
      platform: row.platform,
      environment: row.environment,
      parameterKey: row.parameterKey,
      version: row.version,
      valueType: row.valueType as "string" | "number" | "boolean" | "json",
      defaultValue: row.defaultValue,
      description: row.description ?? undefined,
      parameterGroup: row.parameterGroup ?? undefined,
      isActive: Boolean(row.isActive),
      createdBy: row.createdBy,
      createdAt: row.createdAt,
    };
  }
}
