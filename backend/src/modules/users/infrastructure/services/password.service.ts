import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { HashedPasswordVO } from '../../domain/value-objects/hashed-password.vo';

/**
 * Password Service
 *
 * Handles password hashing and verification using bcrypt.
 * Delegates password policy validation to HashedPasswordVO.
 *
 * Configuration via environment:
 * - BCRYPT_ROUNDS: Cost factor for bcrypt (default: 10)
 *
 * @example
 * ```typescript
 * const hash = await passwordService.hash('MySecurePass123!');
 * const isValid = await passwordService.compare('MySecurePass123!', hash);
 * ```
 */
@Injectable()
export class PasswordService {
  private readonly saltRounds: number;

  constructor(private readonly configService: ConfigService) {
    this.saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 10);
  }

  /**
   * Hash a plain text password using bcrypt
   *
   * @param password - Plain text password to hash
   * @returns Promise<string> - The bcrypt hash
   */
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compare a plain text password against a bcrypt hash
   * Uses constant-time comparison to prevent timing attacks
   *
   * @param plaintext - Plain text password to verify
   * @param hash - Bcrypt hash to compare against
   * @returns Promise<boolean> - True if password matches
   */
  async compare(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  /**
   * Create a HashedPasswordVO from plain text
   * This method validates password policy before hashing
   *
   * @param password - Plain text password
   * @returns Promise<HashedPasswordVO> - Value object containing the hash
   * @throws WeakPasswordException if password doesn't meet policy
   */
  async createHashedPassword(password: string): Promise<HashedPasswordVO> {
    return HashedPasswordVO.create(password);
  }

  /**
   * Verify a password against a HashedPasswordVO
   *
   * @param plaintext - Plain text password to verify
   * @param hashedPassword - HashedPasswordVO to compare against
   * @returns Promise<boolean> - True if password matches
   */
  async verifyHashedPassword(
    plaintext: string,
    hashedPassword: HashedPasswordVO,
  ): Promise<boolean> {
    return hashedPassword.compare(plaintext);
  }

  /**
   * Check if a hash needs to be rehashed
   * This can happen if the cost factor has changed
   *
   * @param hash - Existing bcrypt hash
   * @returns boolean - True if hash should be regenerated
   */
  needsRehash(hash: string): boolean {
    // Extract rounds from bcrypt hash format: $2b$XX$...
    const match = hash.match(/^\$2[aby]\$(\d{2})\$/);
    if (!match) {
      return true; // Invalid format, needs rehash
    }

    const currentRounds = parseInt(match[1], 10);
    return currentRounds !== this.saltRounds;
  }

  /**
   * Get the current salt rounds configuration
   */
  getSaltRounds(): number {
    return this.saltRounds;
  }
}
