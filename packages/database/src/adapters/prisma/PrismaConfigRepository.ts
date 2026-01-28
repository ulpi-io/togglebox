/**
 * Prisma adapter for config parameter operations (Firebase-style).
 *
 * @remarks
 * Implements `IConfigRepository` for individual versioned config parameters.
 * Each parameter has version history; only one version is active at a time.
 */

import { PrismaClient } from ".prisma/client-database";
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
 * Prisma implementation of config parameter repository.
 *
 * @remarks
 * Uses transactions for atomic version updates.
 * Parameters are versioned - edits create new versions.
 */
export class PrismaConfigRepository implements IConfigRepository {
  constructor(private prisma: PrismaClient) {}

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
    const params = await this.prisma.configParameter.findMany({
      where: {
        platform,
        environment,
        isActive: true,
      },
    });

    const configs: Record<string, unknown> = {};
    for (const param of params) {
      configs[param.parameterKey] = parseConfigValue(
        param.defaultValue,
        param.valueType as "string" | "number" | "boolean" | "json",
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
    const version = "1";

    try {
      const created = await this.prisma.configParameter.create({
        data: {
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
        },
      });

      return this.mapToConfigParameter(created);
    } catch (error: unknown) {
      if ((error as { code?: string }).code === "P2002") {
        throw new Error(
          `Parameter ${param.parameterKey} already exists in ${param.platform}/${param.environment}`,
        );
      }
      throw error;
    }
  }

  /**
   * Updates a parameter (creates new version, marks it active).
   */
  async update(
    platform: string,
    environment: string,
    parameterKey: string,
    updates: UpdateConfigParameter,
  ): Promise<ConfigParameter> {
    // Use transaction for atomicity
    return this.prisma.$transaction(async (tx) => {
      // 1. Get current active version
      const current = await tx.configParameter.findFirst({
        where: {
          platform,
          environment,
          parameterKey,
          isActive: true,
        },
      });

      if (!current) {
        throw new Error(
          `Parameter ${parameterKey} not found in ${platform}/${environment}`,
        );
      }

      // 2. Calculate next version
      const nextVersion = String(parseInt(current.version, 10) + 1);
      const timestamp = new Date().toISOString();

      // 3. Deactivate old version
      await tx.configParameter.update({
        where: {
          platform_environment_parameterKey_version: {
            platform,
            environment,
            parameterKey,
            version: current.version,
          },
        },
        data: { isActive: false },
      });

      // 4. Create new version
      const created = await tx.configParameter.create({
        data: {
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
      });

      return this.mapToConfigParameter(created);
    });
  }

  /**
   * Deletes a parameter (all versions).
   */
  async delete(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<boolean> {
    const result = await this.prisma.configParameter.deleteMany({
      where: {
        platform,
        environment,
        parameterKey,
      },
    });

    return result.count > 0;
  }

  /**
   * Gets the active version of a parameter.
   */
  async getActive(
    platform: string,
    environment: string,
    parameterKey: string,
  ): Promise<ConfigParameter | null> {
    const param = await this.prisma.configParameter.findFirst({
      where: {
        platform,
        environment,
        parameterKey,
        isActive: true,
      },
    });

    return param ? this.mapToConfigParameter(param) : null;
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
    const total = await this.prisma.configParameter.count({
      where: {
        platform,
        environment,
        isActive: true,
      },
    });

    // Use offset-based pagination for Prisma
    // Only apply pagination if explicitly provided; otherwise fetch all items
    const offsetPagination = pagination as OffsetPaginationParams | undefined;

    const params = await this.prisma.configParameter.findMany({
      where: {
        platform,
        environment,
        isActive: true,
      },
      orderBy: { parameterKey: "asc" },
      ...(offsetPagination
        ? {
            skip: offsetPagination.offset ?? 0,
            take: offsetPagination.limit,
          }
        : {}),
    });

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
    parameterKey: string,
  ): Promise<ConfigParameter[]> {
    const params = await this.prisma.configParameter.findMany({
      where: {
        platform,
        environment,
        parameterKey,
      },
      orderBy: { version: "desc" },
    });

    return params.map((p) => this.mapToConfigParameter(p));
  }

  /**
   * Rolls back to a previous version (marks it active).
   */
  async rollback(
    platform: string,
    environment: string,
    parameterKey: string,
    version: string,
  ): Promise<ConfigParameter | null> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Check target version exists
      const targetVersion = await tx.configParameter.findUnique({
        where: {
          platform_environment_parameterKey_version: {
            platform,
            environment,
            parameterKey,
            version,
          },
        },
      });

      if (!targetVersion) {
        return null;
      }

      // 2. Get current active version
      const currentActive = await tx.configParameter.findFirst({
        where: {
          platform,
          environment,
          parameterKey,
          isActive: true,
        },
      });

      // If target is already active, return it
      if (currentActive?.version === version) {
        return this.mapToConfigParameter(currentActive);
      }

      // 3. Deactivate current version (if exists)
      if (currentActive) {
        await tx.configParameter.update({
          where: {
            platform_environment_parameterKey_version: {
              platform,
              environment,
              parameterKey,
              version: currentActive.version,
            },
          },
          data: { isActive: false },
        });
      }

      // 4. Activate target version
      const updated = await tx.configParameter.update({
        where: {
          platform_environment_parameterKey_version: {
            platform,
            environment,
            parameterKey,
            version,
          },
        },
        data: { isActive: true },
      });

      return this.mapToConfigParameter(updated);
    });
  }

  /**
   * Counts active parameters in an environment.
   */
  async count(platform: string, environment: string): Promise<number> {
    return this.prisma.configParameter.count({
      where: {
        platform,
        environment,
        isActive: true,
      },
    });
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Maps Prisma model to ConfigParameter type.
   */
  private mapToConfigParameter(param: {
    platform: string;
    environment: string;
    parameterKey: string;
    version: string;
    valueType: string;
    defaultValue: string;
    description: string | null;
    parameterGroup: string | null;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
  }): ConfigParameter {
    return {
      platform: param.platform,
      environment: param.environment,
      parameterKey: param.parameterKey,
      version: param.version,
      valueType: param.valueType as "string" | "number" | "boolean" | "json",
      defaultValue: param.defaultValue,
      description: param.description ?? undefined,
      parameterGroup: param.parameterGroup ?? undefined,
      isActive: param.isActive,
      createdBy: param.createdBy,
      createdAt: param.createdAt,
    };
  }
}
