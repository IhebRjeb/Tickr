import { Injectable } from '@nestjs/common';

import { NotificationPreferenceEntity } from '../../../domain/entities/notification-preference.entity';
import { NotificationPreferenceOrmEntity } from '../entities/notification-preference.orm-entity';

/**
 * NotificationPreference Persistence Mapper
 */
@Injectable()
export class NotificationPreferencePersistenceMapper {
  toPersistence(
    domain: NotificationPreferenceEntity,
  ): NotificationPreferenceOrmEntity {
    const entity = new NotificationPreferenceOrmEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.emailEnabled = domain.emailEnabled;
    entity.smsEnabled = domain.smsEnabled;
    entity.marketingEnabled = domain.marketingEnabled;
    entity.eventRemindersEnabled = domain.eventRemindersEnabled;
    entity.unsubscribeToken = domain.unsubscribeToken;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  toDomain(
    raw: NotificationPreferenceOrmEntity,
  ): NotificationPreferenceEntity {
    return NotificationPreferenceEntity.reconstitute({
      id: raw.id,
      userId: raw.userId,
      emailEnabled: raw.emailEnabled,
      smsEnabled: raw.smsEnabled,
      marketingEnabled: raw.marketingEnabled,
      eventRemindersEnabled: raw.eventRemindersEnabled,
      unsubscribeToken: raw.unsubscribeToken,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
