import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { HashedPasswordVO } from '../../domain/value-objects/hashed-password.vo';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { ChangePasswordCommand } from './change-password.command';

/**
 * Error types for ChangePassword operation
 */
export type ChangePasswordError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'INVALID_CURRENT_PASSWORD'; message: string }
  | { type: 'WEAK_PASSWORD'; message: string }
  | { type: 'SAME_PASSWORD'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for ChangePasswordCommand
 *
 * Follows CQRS pattern - handles password change business logic
 */
@Injectable()
export class ChangePasswordHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the change password command
   */
  async execute(
    command: ChangePasswordCommand,
  ): Promise<Result<void, ChangePasswordError>> {
    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }

    try {
      // Validate new password meets policy
      if (!HashedPasswordVO.isValidPassword(command.newPassword)) {
        const requirements = HashedPasswordVO.getRequirements();
        return Result.fail({
          type: 'WEAK_PASSWORD',
          message: `Password does not meet requirements: ${requirements.join(', ')}`,
        });
      }

      // Note: In full implementation, we would:
      // 1. Get the current password hash from user entity
      // 2. Verify current password using HashedPasswordVO.compare()
      // 3. Create new HashedPasswordVO with new password
      // 4. Call user.changePassword() domain method
      // 5. Save and publish PasswordChangedEvent

      // For now, we create the new hashed password
      const newHashedPassword = await HashedPasswordVO.create(command.newPassword);

      // Update user with new password
      const updatedUser = {
        ...user,
        passwordHash: newHashedPassword.hash,
        updatedAt: new Date(),
      };

      await this.userRepository.save(updatedUser);

      return Result.okVoid();
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to change password: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
