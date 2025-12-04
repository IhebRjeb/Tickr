import { Injectable, Inject } from '@nestjs/common';
import { Result } from '@shared/domain/result';

import { UserDto } from '../dtos/user.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { UpdateProfileCommand } from './update-profile.command';

/**
 * Error types for UpdateProfile operation
 */
export type UpdateProfileError =
  | { type: 'USER_NOT_FOUND'; message: string }
  | { type: 'NO_CHANGES'; message: string }
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'PERSISTENCE_ERROR'; message: string };

/**
 * Handler for UpdateProfileCommand
 *
 * Follows CQRS pattern - handles profile update business logic
 */
@Injectable()
export class UpdateProfileHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the update profile command
   */
  async execute(
    command: UpdateProfileCommand,
  ): Promise<Result<UserDto, UpdateProfileError>> {
    // Validate command has changes
    if (!command.hasChanges()) {
      return Result.fail({
        type: 'NO_CHANGES',
        message: 'No profile changes provided',
      });
    }

    // Find user
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      return Result.fail({
        type: 'USER_NOT_FOUND',
        message: `User with id '${command.userId}' not found`,
      });
    }

    try {
      // Build updated user object
      // Note: In a full implementation, this would call domain entity methods
      // For now, we create a new object with updated fields
      const updatedUser = {
        ...user,
        firstName: command.firstName ?? user.firstName,
        lastName: command.lastName ?? user.lastName,
        phone: command.phone !== undefined ? command.phone : user.phone,
        updatedAt: new Date(),
      };

      // Save updated user
      const savedUser = await this.userRepository.save(updatedUser);

      // Return DTO (excludes sensitive data)
      return Result.ok(UserMapper.toDto(savedUser));
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
