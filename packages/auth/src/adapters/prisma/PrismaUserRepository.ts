/**
 * Prisma ORM implementation of user repository.
 *
 * @module adapters/prisma/PrismaUserRepository
 *
 * @remarks
 * Implements {@link IUserRepository} using Prisma ORM.
 *
 * **Database Support:** MySQL, PostgreSQL, SQLite
 *
 * **Features:**
 * - Type-safe queries via Prisma Client
 * - Automatic connection pooling
 * - Prepared statements (SQL injection prevention)
 * - Transaction support via Prisma
 *
 * **Mapping:**
 * Converts between Prisma models and domain models via `mapToUser()`.
 */

import { IUserRepository } from "../../interfaces/IUserRepository";
import {
  User,
  CreateUserData,
  UpdateUserData,
  UserRole,
} from "../../models/User";
import { prisma } from "./database";
import type { User as PrismaUserModel } from ".prisma/client-auth";

/**
 * Prisma user repository implementation.
 *
 * @implements {IUserRepository}
 *
 * @remarks
 * All methods use the shared `prisma` client instance.
 * Cascade deletes handled by Prisma schema (onDelete: Cascade).
 */
export class PrismaUserRepository implements IUserRepository {
  async create(data: CreateUserData): Promise<User> {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
      } as any,
    });

    return this.mapToUser(user as any);
  }

  async findById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapToUser(user as any) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? this.mapToUser(user as any) : null;
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.role && { role: data.role }),
        ...(data.passwordHash && { passwordHash: data.passwordHash }),
      } as any,
    });

    return this.mapToUser(user as any);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({
      where: { id },
    });
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    const where = options?.role ? { role: options.role } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        take: options?.limit || 20,
        skip: options?.offset || 0,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map((user: PrismaUserModel) => this.mapToUser(user as any)),
      total,
    };
  }

  /**
   * Count users by role.
   * SECURITY: Used to prevent demoting the last admin user.
   */
  async countByRole(role: string): Promise<number> {
    return prisma.user.count({
      where: { role },
    });
  }

  /**
   * Map Prisma user to domain User model
   */
  private mapToUser(prismaUser: PrismaUserModel): User {
    const user = prismaUser as any;
    return {
      id: user.id,
      name: user.name ?? undefined,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
