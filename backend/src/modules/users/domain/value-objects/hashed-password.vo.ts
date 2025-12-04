import { ValueObject } from '@shared/domain/value-object.base';
import * as bcrypt from 'bcrypt';

import { WeakPasswordException } from '../exceptions/weak-password.exception';

interface HashedPasswordProps {
  hash: string;
}

/**
 * Password Policy Configuration
 */
interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

/**
 * HashedPasswordVO Value Object
 *
 * Handles password hashing with bcrypt and policy validation.
 * Passwords are hashed with cost factor 10 for security.
 *
 * @example
 * ```typescript
 * const password = await HashedPasswordVO.create('SecurePass123!');
 * const isValid = await password.compare('SecurePass123!');
 * // isValid === true
 * ```
 */
export class HashedPasswordVO extends ValueObject<HashedPasswordProps> {
  private static readonly SALT_ROUNDS = 10;
  private static readonly SPECIAL_CHARS = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

  /**
   * Get the hashed password value
   */
  get hash(): string {
    return this.props.hash;
  }

  /**
   * Create a HashedPasswordVO from plain text
   * Validates password policy and hashes with bcrypt
   *
   * @param plainPassword - Plain text password
   * @param policy - Optional custom password policy
   * @returns Promise<HashedPasswordVO>
   * @throws WeakPasswordException if password doesn't meet policy
   */
  static async create(
    plainPassword: string,
    policy: PasswordPolicy = DEFAULT_POLICY,
  ): Promise<HashedPasswordVO> {
    HashedPasswordVO.validatePolicy(plainPassword, policy);

    const hash = await bcrypt.hash(plainPassword, HashedPasswordVO.SALT_ROUNDS);
    return new HashedPasswordVO({ hash });
  }

  /**
   * Create a HashedPasswordVO from an existing hash (from DB)
   * Skips validation since hash is already created
   *
   * @param hash - Existing bcrypt hash
   * @returns HashedPasswordVO
   */
  static fromHash(hash: string): HashedPasswordVO {
    return new HashedPasswordVO({ hash });
  }

  /**
   * Validate password against policy
   * @throws WeakPasswordException if policy not met
   */
  private static validatePolicy(password: string, policy: PasswordPolicy): void {
    if (!password || password.length < policy.minLength) {
      throw WeakPasswordException.tooShort();
    }

    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
      throw WeakPasswordException.missingUppercase();
    }

    if (policy.requireNumber && !/[0-9]/.test(password)) {
      throw WeakPasswordException.missingNumber();
    }

    if (policy.requireSpecialChar && !HashedPasswordVO.SPECIAL_CHARS.test(password)) {
      throw WeakPasswordException.missingSpecialChar();
    }
  }

  /**
   * Compare a plain text password with this hash
   * Uses constant-time comparison to prevent timing attacks
   *
   * @param plainPassword - Plain text password to compare
   * @returns Promise<boolean> - True if matches
   */
  async compare(plainPassword: string): Promise<boolean> {
    if (!plainPassword) {
      return false;
    }
    return bcrypt.compare(plainPassword, this.props.hash);
  }

  /**
   * Validate props - hash format check
   */
  protected validate(props: HashedPasswordProps): void {
    if (!props.hash || props.hash.length === 0) {
      throw new Error('Password hash cannot be empty');
    }

    // bcrypt hashes start with $2a$, $2b$, or $2y$
    const bcryptPattern = /^\$2[aby]\$\d{2}\$.{53}$/;
    if (!bcryptPattern.test(props.hash)) {
      throw new Error('Invalid bcrypt hash format');
    }
  }

  /**
   * Check if a plain password meets the policy without hashing
   * Useful for client-side validation before submission
   *
   * @param password - Plain text password to validate
   * @param policy - Password policy to check against
   * @returns true if valid, false otherwise
   */
  static isValidPassword(
    password: string,
    policy: PasswordPolicy = DEFAULT_POLICY,
  ): boolean {
    try {
      HashedPasswordVO.validatePolicy(password, policy);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get password requirements as human-readable string
   */
  static getRequirements(policy: PasswordPolicy = DEFAULT_POLICY): string[] {
    const requirements: string[] = [];
    requirements.push(`At least ${policy.minLength} characters`);
    if (policy.requireUppercase) {
      requirements.push('At least 1 uppercase letter');
    }
    if (policy.requireNumber) {
      requirements.push('At least 1 number');
    }
    if (policy.requireSpecialChar) {
      requirements.push('At least 1 special character (!@#$%^&*...)');
    }
    return requirements;
  }
}
