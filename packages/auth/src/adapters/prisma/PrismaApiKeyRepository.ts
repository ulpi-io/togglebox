/**
 * Prisma ORM implementation of API key repository.
 *
 * @module adapters/prisma/PrismaApiKeyRepository
 *
 * @remarks
 * Implements {@link IApiKeyRepository} using Prisma ORM.
 *
 * **Database Support:** MySQL, PostgreSQL, SQLite
 *
 * **Permissions Storage:**
 * Permissions array stored as JSON string in database.
 * Serialized on write, deserialized on read.
 *
 * **Mapping:**
 * Converts between Prisma models and domain models via `mapToApiKey()`.
 */

import { IApiKeyRepository, CreateApiKeyRepositoryData } from '../../interfaces/IApiKeyRepository';
import { ApiKey, PublicApiKey } from '../../models/ApiKey';
import { prisma } from './database';
import type { ApiKey as PrismaApiKeyModel } from '.prisma/client-auth';

/**
 * Prisma API key repository implementation.
 *
 * @implements {IApiKeyRepository}
 *
 * @remarks
 * Permissions stored as JSON string (array serialization).
 * Cascade delete configured in Prisma schema when user deleted.
 */
export class PrismaApiKeyRepository implements IApiKeyRepository {
  async create(data: CreateApiKeyRepositoryData): Promise<ApiKey> {
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: data.userId,
        name: data.name,
        keyHash: data.keyHash,
        keyPrefix: data.keyPrefix,
        keyLast4: data.keyLast4,
        permissions: JSON.stringify(data.permissions),
        expiresAt: data.expiresAt,
      },
    });

    return this.mapToApiKey(apiKey);
  }

  async findById(id: string): Promise<ApiKey | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id },
    });

    return apiKey ? this.mapToApiKey(apiKey) : null;
  }

  async findByKeyHash(keyHash: string): Promise<ApiKey | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
    });

    return apiKey ? this.mapToApiKey(apiKey) : null;
  }

  async listByUser(userId: string): Promise<PublicApiKey[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((apiKey: PrismaApiKeyModel) => {
      const { keyHash, userId: _, ...publicKey } = this.mapToApiKey(apiKey);
      return publicKey as PublicApiKey;
    });
  }

  async update(id: string, data: Partial<ApiKey>): Promise<ApiKey> {
    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        ...(data.lastUsedAt && { lastUsedAt: data.lastUsedAt }),
        ...(data.expiresAt !== undefined && { expiresAt: data.expiresAt }),
      },
    });

    return this.mapToApiKey(apiKey);
  }

  async delete(id: string): Promise<void> {
    await prisma.apiKey.delete({
      where: { id },
    });
  }

  async deleteByUser(userId: string): Promise<void> {
    await prisma.apiKey.deleteMany({
      where: { userId },
    });
  }

  /**
   * Map Prisma API key to domain ApiKey model
   */
  private mapToApiKey(prismaApiKey: PrismaApiKeyModel): ApiKey {
    return {
      id: prismaApiKey.id,
      userId: prismaApiKey.userId,
      name: prismaApiKey.name,
      keyHash: prismaApiKey.keyHash,
      keyPrefix: prismaApiKey.keyPrefix,
      keyLast4: prismaApiKey.keyLast4,
      permissions: JSON.parse(prismaApiKey.permissions),
      expiresAt: prismaApiKey.expiresAt,
      lastUsedAt: prismaApiKey.lastUsedAt,
      createdAt: prismaApiKey.createdAt,
    };
  }
}
