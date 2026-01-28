import { IUserRepository } from '../../interfaces/IUserRepository';
import { User, CreateUserData, UpdateUserData } from '../../models/User';
import * as userService from './userService';

/**
 * DynamoDB implementation of user repository.
 *
 * @implements {IUserRepository}
 *
 * @remarks
 * **Delegation Pattern:**
 * This class delegates to {@link userService} module for actual implementation.
 * Provides clean interface while keeping business logic separate.
 *
 * **Single-Table Design:**
 * - Primary Key: `PK: USER#<id>`, `SK: USER#<id>`
 * - GSI1: `GSI1PK: USER_EMAIL#<email>`, `GSI1SK: USER#<id>` (for email lookups)
 *
 * **Access Patterns:**
 * 1. Find by ID: Direct PK lookup (consistent read)
 * 2. Find by email: GSI1 query (eventually consistent)
 * 3. List users: Table scan with filter (inefficient for large datasets)
 *
 * **Cascade Deletes:**
 * Manual cascade - deleting user does NOT auto-delete related API keys or reset tokens.
 * Application must explicitly delete related entities via respective repositories.
 *
 * @example
 * ```typescript
 * const repo = new DynamoDBUserRepository();
 * const user = await repo.findByEmail('user@example.com');
 * ```
 */
export class DynamoDBUserRepository implements IUserRepository {
  async create(data: CreateUserData): Promise<User> {
    return userService.createUser(data);
  }

  async findById(id: string): Promise<User | null> {
    return userService.findUserById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return userService.findUserByEmail(email);
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return userService.updateUser(id, data);
  }

  async delete(id: string): Promise<void> {
    return userService.deleteUser(id);
  }

  async list(options?: {
    limit?: number;
    offset?: number;
    role?: string;
  }): Promise<{ users: User[]; total: number }> {
    return userService.listUsers(options);
  }

  async countByRole(role: string): Promise<number> {
    return userService.countUsersByRole(role);
  }
}
