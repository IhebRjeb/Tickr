import { BaseQuery } from '@shared/application/interfaces/query.interface';

/**
 * Query to get user's notifications (paginated)
 */
export class GetUserNotificationsQuery extends BaseQuery<void> {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly limit: number,
  ) {
    super();
    Object.freeze(this);
  }
}
