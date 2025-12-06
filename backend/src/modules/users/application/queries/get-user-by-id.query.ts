import { BaseQuery } from '@shared/application/interfaces/query.interface';

import { UserDto } from '../dtos/user.dto';

/**
 * Query to get user by ID
 *
 * Immutable query object following CQRS pattern
 */
export class GetUserByIdQuery extends BaseQuery<UserDto | null> {
  constructor(public readonly userId: string) {
    super();
    Object.freeze(this);
  }
}
