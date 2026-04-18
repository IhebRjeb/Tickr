import { Inject, Injectable } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../../ports/notification.repository.port';

import { GetUserNotificationsQuery } from './get-user-notifications.query';

import type { NotificationEntity } from '../../../domain/entities/notification.entity';

/**
 * Result type for GetUserNotifications
 */
export interface GetUserNotificationsResult {
  data: NotificationEntity[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Handler for GetUserNotificationsQuery
 */
@Injectable()
export class GetUserNotificationsHandler {
  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
  ) {}

  async execute(
    query: GetUserNotificationsQuery,
  ): Promise<Result<GetUserNotificationsResult, never>> {
    const { data, total } = await this.notificationRepo.findByUserId(
      query.userId,
      query.page,
      query.limit,
    );

    return Result.ok({
      data,
      total,
      page: query.page,
      limit: query.limit,
    });
  }
}
