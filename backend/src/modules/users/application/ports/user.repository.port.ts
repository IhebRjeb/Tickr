import {
  IRepository,
  PaginatedResult,
  PaginationOptions,
} from '@shared/application/interfaces/repository.interface';

import { UserRole } from '../../domain/value-objects/user-role.vo';

/**
 * User entity interface for repository operations
 * This defines what the repository works with
 */
export interface UserEntityPort {
  readonly id: string;
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly role: UserRole;
  readonly phone: string | null;
  readonly passwordHash?: string | null;
  readonly emailVerified?: boolean;
  readonly isActive: boolean;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * User with password hash for authentication
 */
export interface UserWithPasswordPort extends UserEntityPort {
  readonly passwordHash: string | null;
  readonly emailVerified: boolean;
}

/**
 * User Repository Port
 *
 * Defines the contract for user persistence operations.
 * Implementation is in infrastructure layer.
 */
export interface UserRepositoryPort extends IRepository<UserEntityPort> {
  /**
   * Find user by email address
   */
  findByEmail(email: string): Promise<UserEntityPort | null>;

  /**
   * Find user by email with password hash (for authentication)
   */
  findByEmailWithPassword(email: string): Promise<UserWithPasswordPort | null>;

  /**
   * Find users by role with pagination
   */
  findByRole(
    role: UserRole,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<UserEntityPort>>;

  /**
   * Check if email already exists
   */
  existsByEmail(email: string): Promise<boolean>;

  /**
   * Count users by role
   */
  countByRole(role: UserRole): Promise<number>;

  /**
   * Find active users with pagination
   */
  findActiveUsers(options?: PaginationOptions): Promise<PaginatedResult<UserEntityPort>>;

  /**
   * Update last login timestamp
   */
  updateLastLogin(userId: string): Promise<void>;

  /**
   * Update user's email verified status
   */
  updateEmailVerified(userId: string, verified: boolean): Promise<void>;

  /**
   * Update user's password hash
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;
}

/**
 * Injection token for UserRepository
 */
export const USER_REPOSITORY = Symbol('UserRepositoryPort');
