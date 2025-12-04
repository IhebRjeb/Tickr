import { BaseQuery } from '@shared/application/interfaces/query.interface';
import { PaginatedResult } from '@shared/application/interfaces/repository.interface';

import { UserRole } from '../../domain/value-objects/user-role.vo';
import { UserDto } from '../dtos/user.dto';

/**
 * Query to get users by role with pagination
 *
 * Immutable query object following CQRS pattern
 */
export class GetUsersByRoleQuery extends BaseQuery<PaginatedResult<UserDto>> {
  constructor(
    public readonly role: UserRole,
    public readonly page: number = 1,
    public readonly limit: number = 10,
  ) {
    super();
    Object.freeze(this);
  }

  /**
   * Get pagination options
   */
  get paginationOptions() {
    return {
      page: this.page,
      limit: this.limit,
    };
  }
}
