import { Injectable, Inject } from '@nestjs/common';

import { UserDto } from '../dtos/user.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { GetUserByIdQuery } from './get-user-by-id.query';

/**
 * Handler for GetUserByIdQuery
 *
 * Follows CQRS pattern - read-only operation
 */
@Injectable()
export class GetUserByIdHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the query
   */
  async execute(query: GetUserByIdQuery): Promise<UserDto | null> {
    const user = await this.userRepository.findById(query.userId);

    if (!user) {
      return null;
    }

    return UserMapper.toDto(user);
  }
}
