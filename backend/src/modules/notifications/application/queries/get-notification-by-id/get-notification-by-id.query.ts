import { BaseQuery } from '@shared/application/interfaces/query.interface';

/**
 * Error types for GetNotificationById
 */
export type GetNotificationByIdError =
  | { type: 'NOT_FOUND'; message: string };

/**
 * Query to get a single notification by ID
 */
export class GetNotificationByIdQuery extends BaseQuery<void> {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string,
  ) {
    super();
    Object.freeze(this);
  }
}
