/**
 * Prisma ORM implementation of password reset repository.
 *
 * @module adapters/prisma/PrismaPasswordResetRepository
 *
 * @remarks
 * Implements {@link IPasswordResetRepository} using Prisma ORM.
 *
 * **Database Support:** MySQL, PostgreSQL, SQLite
 *
 * **Expiration Handling:**
 * Uses database-level date comparisons for expired token queries.
 * `findValidByUser()` filters by `expiresAt > now()`.
 * `deleteExpired()` deletes where `expiresAt < now()`.
 *
 * **Mapping:**
 * Converts between Prisma models and domain models via `mapToPasswordResetToken()`.
 */

import { IPasswordResetRepository } from '../../interfaces/IPasswordResetRepository';
import {
  PasswordResetToken,
  CreatePasswordResetTokenData,
} from '../../models/PasswordResetToken';
import { prisma } from './database';
import type { PasswordResetToken as PrismaPasswordResetTokenModel } from '.prisma/client-auth';

/**
 * Prisma password reset repository implementation.
 *
 * @implements {IPasswordResetRepository}
 *
 * @remarks
 * Token expiration enforced at query time (database-level filtering).
 * Cascade delete configured when user deleted.
 */
export class PrismaPasswordResetRepository implements IPasswordResetRepository {
  async create(data: CreatePasswordResetTokenData): Promise<PasswordResetToken> {
    const token = await prisma.passwordResetToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });

    return this.mapToPasswordResetToken(token);
  }

  async findById(id: string): Promise<PasswordResetToken | null> {
    const token = await prisma.passwordResetToken.findUnique({
      where: { id },
    });

    return token ? this.mapToPasswordResetToken(token) : null;
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    const token = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    return token ? this.mapToPasswordResetToken(token) : null;
  }

  async findValidByUser(userId: string): Promise<PasswordResetToken[]> {
    const now = new Date();
    const tokens = await prisma.passwordResetToken.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token: PrismaPasswordResetTokenModel) => this.mapToPasswordResetToken(token));
  }

  async delete(id: string): Promise<void> {
    await prisma.passwordResetToken.delete({
      where: { id },
    });
  }

  async deleteByUser(userId: string): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpired(): Promise<number> {
    const now = new Date();
    const result = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    return result.count;
  }

  /**
   * Map Prisma password reset token to domain PasswordResetToken model
   */
  private mapToPasswordResetToken(prismaToken: PrismaPasswordResetTokenModel): PasswordResetToken {
    return {
      id: prismaToken.id,
      userId: prismaToken.userId,
      tokenHash: prismaToken.tokenHash,
      expiresAt: prismaToken.expiresAt,
      createdAt: prismaToken.createdAt,
    };
  }
}
