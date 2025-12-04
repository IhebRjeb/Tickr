import { Injectable, Inject } from '@nestjs/common';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import { UserDto } from '../dtos/user.dto';
import { UserMapper } from '../mappers/user.mapper';
import { USER_REPOSITORY } from '../ports/user.repository.port';
import type { UserRepositoryPort } from '../ports/user.repository.port';

import { GetUsersByRoleQuery } from './get-users-by-role.query';

/**
 * Handler for GetUsersByRoleQuery
 *
 * Follows CQRS pattern - read-only operation with pagination
 */
@Injectable()
export class GetUsersByRoleHandler {
  private readonly userRepository: UserRepositoryPort;

  constructor(
    @Inject(USER_REPOSITORY) userRepository: UserRepositoryPort,
  ) {
    this.userRepository = userRepository;
  }

  /**
   * Execute the query
   */
  async execute(query: GetUsersByRoleQuery): Promise<PaginatedResult<UserDto>> {
    const result = await this.userRepository.findByRole(
      query.role,
      query.paginationOptions,
    );

    return {
      ...result,
      data: UserMapper.toDtoList(result.data),
    };
  }
}
