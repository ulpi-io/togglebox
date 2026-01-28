import { IPasswordResetRepository } from "../../interfaces/IPasswordResetRepository";
import {
  PasswordResetToken,
  CreatePasswordResetTokenData,
} from "../../models/PasswordResetToken";
import * as passwordResetService from "./passwordResetService";

/**
 * DynamoDB implementation of password reset token repository.
 *
 * @implements {IPasswordResetRepository}
 *
 * @remarks
 * **Delegation Pattern:**
 * This class delegates to {@link passwordResetService} module for actual implementation.
 * Provides clean interface while keeping business logic separate.
 *
 * **Single-Table Design:**
 * - Primary Key: `PK: RESET#<id>`, `SK: RESET#<id>`
 * - GSI1: `GSI1PK: USER#<userId>`, `GSI1SK: RESET#<expiresAt>` (for user's tokens)
 * - GSI2: `GSI2PK: RESET_HASH#<tokenHash>`, `GSI2SK: RESET#<id>` (for verification)
 *
 * **Access Patterns:**
 * 1. Find by ID: Direct PK lookup (consistent read)
 * 2. Find by hash: GSI2 query (for token verification)
 * 3. Find valid by user: GSI1 query with range condition on expiration
 * 4. Delete expired: Table scan with filter (batch cleanup job)
 *
 * **Token Lifecycle:**
 * - Created with 1-hour TTL (`expiresAt`)
 * - Single-use (deleted after password reset completes)
 * - Expired tokens cleaned up via `deleteExpired()` cron job
 *
 * **Security:**
 * - Tokens hashed with bcrypt (never stored plaintext)
 * - Expiration enforced at application level (not DynamoDB TTL)
 * - User enumeration prevented (same response for valid/invalid tokens)
 *
 * @example
 * ```typescript
 * const repo = new DynamoDBPasswordResetRepository();
 * const token = await repo.findByTokenHash(hashedToken);
 * if (token && token.expiresAt > new Date()) {
 *   // Valid token
 * }
 * ```
 */
export class DynamoDBPasswordResetRepository implements IPasswordResetRepository {
  async create(
    data: CreatePasswordResetTokenData,
  ): Promise<PasswordResetToken> {
    return passwordResetService.createPasswordResetToken(data);
  }

  async findById(id: string): Promise<PasswordResetToken | null> {
    return passwordResetService.findPasswordResetTokenById(id);
  }

  async findByTokenHash(tokenHash: string): Promise<PasswordResetToken | null> {
    return passwordResetService.findPasswordResetTokenByTokenHash(tokenHash);
  }

  async findValidByUser(userId: string): Promise<PasswordResetToken[]> {
    return passwordResetService.findValidPasswordResetTokensByUser(userId);
  }

  async delete(id: string): Promise<void> {
    return passwordResetService.deletePasswordResetToken(id);
  }

  async deleteByUser(userId: string): Promise<void> {
    return passwordResetService.deletePasswordResetTokensByUser(userId);
  }

  async deleteExpired(): Promise<number> {
    return passwordResetService.deleteExpiredPasswordResetTokens();
  }
}
