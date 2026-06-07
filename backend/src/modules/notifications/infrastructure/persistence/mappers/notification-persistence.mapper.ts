import { Injectable } from '@nestjs/common';

import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import { NotificationStatus } from '../../../domain/value-objects/notification-status.vo';
import { NotificationType } from '../../../domain/value-objects/notification-type.vo';
import { RecipientVO } from '../../../domain/value-objects/recipient.vo';
import { NotificationOrmEntity } from '../entities/notification.orm-entity';

/**
 * Notification Persistence Mapper
 *
 * Transforms between domain entities and TypeORM entities.
 */
@Injectable()
export class NotificationPersistenceMapper {
  toPersistence(domain: NotificationEntity): NotificationOrmEntity {
    const entity = new NotificationOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.type = domain.type;
    entity.channel = domain.channel;
    entity.priority = domain.priority;
    entity.subject = domain.subject;
    entity.content = domain.content;
    entity.templateId = domain.templateId;
    entity.templateData = domain.templateData;
    entity.recipientEmail = domain.recipient.email;
    entity.recipientPhone = domain.recipient.phone;
    entity.status = domain.status;
    entity.scheduledFor = domain.scheduledFor;
    entity.sentAt = domain.sentAt;
    entity.deliveredAt = domain.deliveredAt;
    entity.failureReason = domain.failureReason;
    entity.retryCount = domain.retryCount;
    entity.maxRetries = domain.maxRetries;
    entity.metadata = domain.metadata;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  toDomain(raw: NotificationOrmEntity): NotificationEntity {
    const recipient = RecipientVO.reconstitute(
      raw.recipientEmail,
      raw.recipientPhone,
    );

    return NotificationEntity.reconstitute({
      id: raw.id,
      userId: raw.userId,
      type: raw.type as NotificationType,
      channel: raw.channel as NotificationChannel,
      priority: raw.priority as NotificationPriority,
      subject: raw.subject,
      content: raw.content,
      templateId: raw.templateId,
      templateData: raw.templateData ?? {},
      recipient,
      status: raw.status as NotificationStatus,
      scheduledFor: raw.scheduledFor,
      sentAt: raw.sentAt,
      deliveredAt: raw.deliveredAt,
      failureReason: raw.failureReason,
      retryCount: raw.retryCount,
      maxRetries: raw.maxRetries,
      metadata: raw.metadata ?? {},
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  toDomainArray(raws: NotificationOrmEntity[]): NotificationEntity[] {
    return raws.map((raw) => this.toDomain(raw));
  }
}
