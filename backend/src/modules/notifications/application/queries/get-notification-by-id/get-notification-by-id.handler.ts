import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../../ports/notification.repository.port';

import {
  GetNotificationByIdQuery,
  type GetNotificationByIdError,
} from './get-notification-by-id.query';

import type { NotificationEntity } from '../../../domain/entities/notification.entity';

/**
 * Handler for GetNotificationByIdQuery
 */
@Injectable()
export class GetNotificationByIdHandler {
  private readonly logger = new Logger(GetNotificationByIdHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async execute(
    query: GetNotificationByIdQuery,
  ): Promise<Result<NotificationEntity, GetNotificationByIdError>> {
    const notification = await this.notificationRepo.findById(
      query.notificationId,
    );

    if (!notification) {
      return Result.fail({
        type: 'NOT_FOUND',
        message: `Notification ${query.notificationId} not found`,
      });
    }

    // Verify ownership
    if (notification.userId !== query.userId) {
      return Result.fail({
        type: 'NOT_FOUND',
        message: `Notification ${query.notificationId} not found`,
      });
    }

    return Result.ok(notification);
  }
}
