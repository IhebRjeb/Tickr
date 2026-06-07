import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { NotificationPreferenceEntity } from '../../domain/entities/notification-preference.entity';

/**
 * Injection token for NotificationPreferenceRepository
 */
export const NOTIFICATION_PREFERENCE_REPOSITORY = Symbol(
  'NOTIFICATION_PREFERENCE_REPOSITORY',
);

/**
 * NotificationPreference Repository Port
 *
 * Defines the contract for notification preference persistence.
 */
export interface NotificationPreferenceRepositoryPort
  extends IRepository<NotificationPreferenceEntity> {
  findByUserId(
    userId: string,
  ): Promise<NotificationPreferenceEntity | null>;

  findByUnsubscribeToken(
    token: string,
  ): Promise<NotificationPreferenceEntity | null>;
}
