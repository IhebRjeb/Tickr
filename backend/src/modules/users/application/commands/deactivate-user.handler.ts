import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { DeactivateUserCommand } from './deactivate-user.command';

/**
 * Error types for DeactivateUser operation
 */
export type DeactivateUserError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'ALREADY_DEACTIVATED'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for DeactivateUserCommand
 *
 * Follows CQRS pattern - handles user deactivation business logic
 */
@Injectable()
export class DeactivateUserHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the deactivate user command
   */
  async execute(
    command: DeactivateUserCommand,
  ): Promise<Result<void, DeactivateUserError>> {
    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }

    // Check if already deactivated
    if (!user.isActive) {
      return Result.fail({
        type: 'ALREADY_DEACTIVATED',
        message: 'User account is already deactivated',
      });
    }

    try {
      // Deactivate user
      // Note: In full implementation, would call user.deactivate() domain method
      const deactivatedUser = {
        ...user,
        isActive: false,
        updatedAt: new Date(),
      };

      await this.userRepository.save(deactivatedUser);

      // Note: Would publish UserDeactivatedEvent here

      return Result.okVoid();
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to deactivate user: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
