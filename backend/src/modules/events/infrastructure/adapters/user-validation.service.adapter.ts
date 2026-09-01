
import {
  USER_REPOSITORY,
} from '@modules/users/application/ports/user.repository.port';
import type { UserRepositoryPort } from '@modules/users/application/ports/user.repository.port';
import { UserRole } from '@modules/users/domain/value-objects/user-role.vo';
import { Injectable, Inject, Logger } from '@nestjs/common';

import type {
  EventStaffUserDirectoryPort,
  EventStaffUserInterface,
} from '../../application/ports/event-staff-user-directory.port';
import {
  UserValidationServicePort,
  UserValidationResult,
  USER_VALIDATION_SERVICE,
} from '../../application/ports/user-validation.service.port';

/**
 * User Validation Service Adapter
 *
 * Infrastructure adapter that implements the UserValidationServicePort.
 * Acts as an anti-corruption layer between Events and Users bounded contexts.
 *
 * Design Decisions:
 * - Uses the Users module's repository port (not direct entity access)
 * - Maps Users domain concepts to Events module's needs
 * - Provides simple validation methods for organizer checks
 * - Implements caching-ready interface (can add Redis later)
 *
 * Cross-Module Communication:
 * - Imports USER_REPOSITORY from Users module
 * - Does NOT import domain entities directly
 * - Uses type-safe interfaces for data transfer
 */
@Injectable()
export class UserValidationServiceAdapter
  implements UserValidationServicePort, EventStaffUserDirectoryPort
{
  private readonly logger = new Logger(UserValidationServiceAdapter.name);

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async getUserById(userId: string): Promise<EventStaffUserInterface | null> {
    const user = await this.userRepository.findById(userId);
    return user ? this.toEventStaffUser(user) : null;
  }

  async getUserByEmail(email: string): Promise<EventStaffUserInterface | null> {
    const user = await this.userRepository.findByEmail(email.trim().toLowerCase());
    return user ? this.toEventStaffUser(user) : null;
  }

  async getUsersByIds(userIds: string[]): Promise<EventStaffUserInterface[]> {
    const users = await this.userRepository.findByIds(userIds);
    return users.map((user) => this.toEventStaffUser(user));
  }

  /**
   * Validate that a user exists and has ORGANIZER role
   *
   * @param userId - The user's UUID
   * @returns Validation result with user details
   */
  async validateOrganizer(userId: string): Promise<UserValidationResult> {
    this.logger.debug(`Validating organizer: ${userId}`);

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        this.logger.debug(`User not found: ${userId}`);
        return {
          exists: false,
          isOrganizer: false,
          isActive: false,
        };
      }

      const isOrganizer = user.role === UserRole.ORGANIZER || user.role === UserRole.ADMIN;

      this.logger.debug(
        `User validated: ${userId} - exists=${true}, isOrganizer=${isOrganizer}, isActive=${user.isActive}`,
      );

      return {
        exists: true,
        isOrganizer,
        isActive: user.isActive,
        role: user.role as 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT',
      };
    } catch (error) {
      this.logger.error(
        `Error validating organizer ${userId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Check if a user exists
   *
   * @param userId - The user's UUID
   * @returns True if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    this.logger.debug(`Checking if user exists: ${userId}`);

    try {
      const user = await this.userRepository.findById(userId);
      const exists = user !== null;

      this.logger.debug(`User ${userId} exists: ${exists}`);
      return exists;
    } catch (error) {
      this.logger.error(
        `Error checking user existence ${userId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Check if a user is the owner of an event
   *
   * Compares the requesting user's ID with the event organizer's ID.
   * Admin users bypass ownership checks.
   *
   * @param userId - The requesting user's UUID
   * @param organizerId - The event organizer's UUID
   * @returns True if user is the owner or an admin
   */
  isEventOwner(userId: string, organizerId: string): boolean {
    // Direct ownership check
    if (userId === organizerId) {
      return true;
    }

    // Note: For admin bypass, the caller should check the user's role separately
    // This keeps the method simple and focused on ownership comparison
    return false;
  }

  /**
   * Check if a user has admin privileges
   *
   * @param userId - The user's UUID
   * @returns True if user is an admin
   */
  async isAdmin(userId: string): Promise<boolean> {
    this.logger.debug(`Checking if user is admin: ${userId}`);

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return false;
      }

      const isAdmin = user.role === UserRole.ADMIN;
      this.logger.debug(`User ${userId} isAdmin: ${isAdmin}`);

      return isAdmin;
    } catch (error) {
      this.logger.error(
        `Error checking admin status ${userId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  /**
   * Check if a user has a specific role
   *
   * @param userId - The user's UUID
   * @param role - The role to check
   * @returns True if user has the specified role
   */
  async hasRole(
    userId: string,
    role: 'ADMIN' | 'ORGANIZER' | 'PARTICIPANT',
  ): Promise<boolean> {
    this.logger.debug(`Checking if user ${userId} has role: ${role}`);

    try {
      const user = await this.userRepository.findById(userId);

      if (!user) {
        return false;
      }

      const hasRole = user.role === role;
      this.logger.debug(`User ${userId} hasRole(${role}): ${hasRole}`);

      return hasRole;
    } catch (error) {
      this.logger.error(
        `Error checking role for user ${userId}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  private toEventStaffUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    emailVerified?: boolean;
  }): EventStaffUserInterface {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified ?? false,
    };
  }
}

/**
 * Provider configuration for dependency injection
 */
export const UserValidationServiceProvider = {
  provide: USER_VALIDATION_SERVICE,
  useClass: UserValidationServiceAdapter,
};
