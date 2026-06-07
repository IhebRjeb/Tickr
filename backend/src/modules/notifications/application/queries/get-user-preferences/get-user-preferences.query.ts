import { BaseQuery } from '@shared/application/interfaces/query.interface';

/**
 * Query to get a user's notification preferences
 */
export class GetUserPreferencesQuery extends BaseQuery<void> {
  constructor(public readonly userId: string) {
    super();
    Object.freeze(this);
  }
}
