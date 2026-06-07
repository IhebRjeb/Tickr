import { Injectable } from '@nestjs/common';

import type { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';
import type { NotificationEntity } from '../../domain/entities/notification.entity';
import {
  NotificationDto,
  NotificationPreferenceDto,
  PaginatedNotificationsDto,
} from '../dtos/notification.dto';

/**
 * Maps domain entities to response DTOs
 */
@Injectable()
export class NotificationMapper {
  toDto(entity: NotificationEntity): NotificationDto {
    const dto = new NotificationDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.type = entity.type;
    dto.channel = entity.channel;
    dto.priority = entity.priority;
    dto.subject = entity.subject;
    dto.status = entity.status;
    dto.scheduledFor = entity.scheduledFor;
    dto.sentAt = entity.sentAt;
    dto.deliveredAt = entity.deliveredAt;
    dto.failureReason = entity.failureReason;
    dto.retryCount = entity.retryCount;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }

  toPaginatedDto(
    data: NotificationEntity[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedNotificationsDto {
    const dto = new PaginatedNotificationsDto();
    dto.data = data.map((entity) => this.toDto(entity));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    return dto;
  }

  toPreferenceDto(
    entity: NotificationPreferenceEntity,
  ): NotificationPreferenceDto {
    const dto = new NotificationPreferenceDto();
    dto.userId = entity.userId;
    dto.emailEnabled = entity.emailEnabled;
    dto.smsEnabled = entity.smsEnabled;
    dto.marketingEnabled = entity.marketingEnabled;
    dto.eventRemindersEnabled = entity.eventRemindersEnabled;
    return dto;
  }
}
