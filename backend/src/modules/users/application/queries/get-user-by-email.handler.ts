import { Injectable, Inject } from '@nestjs/common';

import { UserDto } from '../dtos/user.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { GetUserByEmailQuery } from './get-user-by-email.query';

/**
 * Handler for GetUserByEmailQuery
 *
 * Follows CQRS pattern - read-only operation
 */
@Injectable()
export class GetUserByEmailHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the query
   */
  async execute(query: GetUserByEmailQuery): Promise<UserDto | null> {
    const user = await this.userRepository.findByEmail(query.email);

    if (!user) {
      return null;
    }

    return UserMapper.toDto(user);
  }
}
