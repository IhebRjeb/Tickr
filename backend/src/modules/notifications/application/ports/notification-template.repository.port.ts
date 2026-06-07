import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { NotificationTemplateEntity } from '../../domain/entities/notification-template.entity';
import type { NotificationChannel } from '../../domain/value-objects/notification-channel.vo';

/**
 * Injection token for NotificationTemplateRepository
 */
export const NOTIFICATION_TEMPLATE_REPOSITORY = Symbol(
  'NOTIFICATION_TEMPLATE_REPOSITORY',
);

/**
 * NotificationTemplate Repository Port
 *
 * Defines the contract for notification template persistence.
 */
export interface NotificationTemplateRepositoryPort
  extends IRepository<NotificationTemplateEntity> {
  findBySlug(slug: string): Promise<NotificationTemplateEntity | null>;

  findByChannel(
    channel: NotificationChannel,
  ): Promise<NotificationTemplateEntity[]>;

  findActive(): Promise<NotificationTemplateEntity[]>;
}
