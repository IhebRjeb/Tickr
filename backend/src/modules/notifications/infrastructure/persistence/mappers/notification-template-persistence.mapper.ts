import { Injectable } from '@nestjs/common';

import { NotificationTemplateEntity } from '../../../domain/entities/notification-template.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { TemplateCategory } from '../../../domain/value-objects/template-category.vo';
import { NotificationTemplateOrmEntity } from '../entities/notification-template.orm-entity';

/**
 * NotificationTemplate Persistence Mapper
 */
@Injectable()
export class NotificationTemplatePersistenceMapper {
  toPersistence(
    domain: NotificationTemplateEntity,
  ): NotificationTemplateOrmEntity {
    const entity = new NotificationTemplateOrmEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.slug = domain.slug;
    entity.channel = domain.channel;
    entity.category = domain.category;
    entity.subject = domain.subject;
    entity.body = domain.body;
    entity.requiredVariables = domain.requiredVariables;
    entity.defaultVariables = domain.defaultVariables;
    entity.isActive = domain.isActive;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  toDomain(
    raw: NotificationTemplateOrmEntity,
  ): NotificationTemplateEntity {
    return NotificationTemplateEntity.reconstitute({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      channel: raw.channel as NotificationChannel,
      category: raw.category as TemplateCategory,
      subject: raw.subject,
      body: raw.body,
      requiredVariables: raw.requiredVariables ?? [],
      defaultVariables: raw.defaultVariables ?? {},
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}
