import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';

import { TokenService } from '../../services/token.service';
import {
  TokenType,
  VerificationTokenEntity,
} from '../entities/verification-token.orm-entity';

/**
 * Verification Token Repository
 *
 * Handles storage and retrieval of verification tokens for:
 * - Email verification
 * - Password reset
 */
@Injectable()
export class VerificationTokenRepository {
  constructor(
    @InjectRepository(VerificationTokenEntity)
    private readonly repository: Repository<VerificationTokenEntity>,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Create an email verification token
   *
   * @param userId - User ID to create token for
   * @param expiryHours - Hours until token expires (default: 24)
   * @returns The generated token string
   */
  async createEmailVerificationToken(
    userId: string,
    expiryHours: number = 24,
  ): Promise<string> {
    // Invalidate any existing tokens for this user and type
    await this.invalidateUserTokens(userId, TokenType.EMAIL_VERIFICATION);

    const { token, expiresAt } = this.tokenService.generateTokenWithExpiry(expiryHours);

    const entity = this.repository.create({
      userId,
      token,
      tokenType: TokenType.EMAIL_VERIFICATION,
      expiresAt,
    });

    await this.repository.save(entity);

    return token;
  }

  /**
   * Create a password reset token
   *
   * @param userId - User ID to create token for
   * @param expiryHours - Hours until token expires (default: 1)
   * @returns The generated token string
   */
  async createPasswordResetToken(
    userId: string,
    expiryHours: number = 1,
  ): Promise<string> {
    // Invalidate any existing tokens for this user and type
    await this.invalidateUserTokens(userId, TokenType.PASSWORD_RESET);

    const { token, expiresAt } = this.tokenService.generateTokenWithExpiry(expiryHours);

    const entity = this.repository.create({
      userId,
      token,
      tokenType: TokenType.PASSWORD_RESET,
      expiresAt,
    });

    await this.repository.save(entity);

    return token;
  }

  /**
   * Find and validate a token
   *
   * @param token - Token string to find
   * @param tokenType - Expected token type
   * @returns Token entity if valid, null otherwise
   */
  async findValidToken(
    token: string,
    tokenType: TokenType,
  ): Promise<VerificationTokenEntity | null> {
    const entity = await this.repository.findOne({
      where: {
        token,
        tokenType,
        usedAt: undefined, // Not used
      },
    });

    if (!entity || entity.isExpired() || entity.isUsed()) {
      return null;
    }

    return entity;
  }

  /**
   * Mark a token as used
   *
   * @param tokenId - Token ID to mark as used
   */
  async markAsUsed(tokenId: string): Promise<void> {
    await this.repository.update(tokenId, {
      usedAt: new Date(),
    });
  }

  /**
   * Invalidate all tokens for a user of a specific type
   *
   * @param userId - User ID
   * @param tokenType - Token type to invalidate
   */
  async invalidateUserTokens(userId: string, tokenType: TokenType): Promise<void> {
    await this.repository.update(
      {
        userId,
        tokenType,
        usedAt: undefined,
      },
      {
        usedAt: new Date(),
      },
    );
  }

  /**
   * Clean up expired tokens
   * Should be called periodically via a scheduled job
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });

    return result.affected ?? 0;
  }

  /**
   * Delete all tokens for a user
   *
   * @param userId - User ID
   */
  async deleteUserTokens(userId: string): Promise<void> {
    await this.repository.delete({ userId });
  }
}
