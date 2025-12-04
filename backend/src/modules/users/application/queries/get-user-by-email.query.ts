import { BaseQuery } from '@shared/application/interfaces/query.interface';

import { UserDto } from '../dtos/user.dto';

/**
 * Query to get user by email
 *
 * Immutable query object following CQRS pattern
 */
export class GetUserByEmailQuery extends BaseQuery<UserDto | null> {
  constructor(public readonly email: string) {
    super();
    Object.freeze(this);
  }
}
