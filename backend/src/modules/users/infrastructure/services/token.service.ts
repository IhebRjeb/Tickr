import { randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';

/**
 * Token with expiry information
 */
export interface TokenWithExpiry {
  token: string;
  expiresAt: Date;
}

/**
 * Token Service
 *
 * Generates secure random tokens for various purposes:
 * - Email verification tokens
 * - Password reset tokens
 * - Refresh tokens
 * - CSRF tokens
 *
 * Uses Node.js crypto module for cryptographically secure random bytes.
 *
 * @example
 * ```typescript
 * const token = tokenService.generateToken(32);
 * const { token, expiresAt } = tokenService.generateTokenWithExpiry(24);
 * ```
 */
@Injectable()
export class TokenService {
  /**
   * Default token length in bytes
   * 32 bytes = 64 hex characters = 256 bits of entropy
   */
  private static readonly DEFAULT_LENGTH = 32;

  /**
   * Generate a secure random token
   *
   * @param length - Number of bytes to generate (default: 32)
   * @returns string - Hex-encoded random token
   */
  generateToken(length: number = TokenService.DEFAULT_LENGTH): string {
    if (length <= 0) {
      throw new Error('Token length must be greater than 0');
    }

    if (length > 256) {
      throw new Error('Token length must not exceed 256 bytes');
    }

    return randomBytes(length).toString('hex');
  }

  /**
   * Generate a secure random token with an expiration date
   *
   * @param expiryHours - Hours until token expires
   * @param tokenLength - Number of bytes for token (default: 32)
   * @returns TokenWithExpiry - Object containing token and expiration date
   */
  generateTokenWithExpiry(
    expiryHours: number,
    tokenLength: number = TokenService.DEFAULT_LENGTH,
  ): TokenWithExpiry {
    if (expiryHours <= 0) {
      throw new Error('Expiry hours must be greater than 0');
    }

    const token = this.generateToken(tokenLength);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Generate a token with expiry in minutes
   *
   * @param expiryMinutes - Minutes until token expires
   * @param tokenLength - Number of bytes for token (default: 32)
   * @returns TokenWithExpiry - Object containing token and expiration date
   */
  generateTokenWithExpiryMinutes(
    expiryMinutes: number,
    tokenLength: number = TokenService.DEFAULT_LENGTH,
  ): TokenWithExpiry {
    if (expiryMinutes <= 0) {
      throw new Error('Expiry minutes must be greater than 0');
    }

    const token = this.generateToken(tokenLength);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Generate a token with expiry in days
   *
   * @param expiryDays - Days until token expires
   * @param tokenLength - Number of bytes for token (default: 32)
   * @returns TokenWithExpiry - Object containing token and expiration date
   */
  generateTokenWithExpiryDays(
    expiryDays: number,
    tokenLength: number = TokenService.DEFAULT_LENGTH,
  ): TokenWithExpiry {
    if (expiryDays <= 0) {
      throw new Error('Expiry days must be greater than 0');
    }

    const token = this.generateToken(tokenLength);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    return {
      token,
      expiresAt,
    };
  }

  /**
   * Check if a token has expired
   *
   * @param expiresAt - Expiration date to check
   * @returns boolean - True if token has expired
   */
  isExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Calculate remaining time until expiration
   *
   * @param expiresAt - Expiration date
   * @returns number - Milliseconds remaining (negative if expired)
   */
  getTimeRemaining(expiresAt: Date): number {
    return expiresAt.getTime() - Date.now();
  }
}
