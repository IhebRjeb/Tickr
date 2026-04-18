import { BaseQuery } from '@shared/application/interfaces/query.interface';

import type { NotificationEntity } from '../../../domain/entities/notification.entity';

/**
 * Result type for GetUserNotifications
 */
export interface GetUserNotificationsResultQuery {
  data: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
}

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
