import { UserEntityPort } from '../ports/user.repository.port';
import { UserDto } from '../dtos/user.dto';
import { UserProfileDto } from '../dtos/user-profile.dto';

/**
 * User Mapper
 *
 * Maps between domain entities and DTOs
 */
export class UserMapper {
  /**
   * Map user entity to UserDto
   */
  static toDto(user: UserEntityPort): UserDto {
    return new UserDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
    });
  }

  /**
   * Map user entity to UserProfileDto
   */
  static toProfileDto(user: UserEntityPort): UserProfileDto {
    return new UserProfileDto({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      phone: user.phone,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  /**
   * Map array of users to DTOs
   */
  static toDtoList(users: UserEntityPort[]): UserDto[] {
    return users.map((user) => UserMapper.toDto(user));
  }

  /**
   * Map array of users to Profile DTOs
   */
  static toProfileDtoList(users: UserEntityPort[]): UserProfileDto[] {
    return users.map((user) => UserMapper.toProfileDto(user));
  }
}
