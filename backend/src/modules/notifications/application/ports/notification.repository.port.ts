import { IRepository } from '@shared/application/interfaces/repository.interface';

import type { NotificationEntity } from '../../domain/entities/notification.entity';
import type { NotificationStatus } from '../../domain/value-objects/notification-status.vo';

/**
 * Injection token for NotificationRepository
 */
export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

/**
 * Notification Repository Port
 *
 * Defines the contract for notification persistence operations.
 * Implementation is in infrastructure layer (TypeORM).
 */
export interface NotificationRepositoryPort
  extends IRepository<NotificationEntity> {
  // ============================================
  // Query Methods
  // ============================================

  findByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: NotificationEntity[]; total: number }>;

  findByStatus(
    status: NotificationStatus,
    limit: number,
  ): Promise<NotificationEntity[]>;

  findReadyToSend(limit: number): Promise<NotificationEntity[]>;

  findFailedRetryable(limit: number): Promise<NotificationEntity[]>;

  // ============================================
  // Analytics
  // ============================================

  countByUserSince(userId: string, since: Date): Promise<number>;

  countByStatusSince(
    status: NotificationStatus,
    since: Date,
  ): Promise<number>;
}
