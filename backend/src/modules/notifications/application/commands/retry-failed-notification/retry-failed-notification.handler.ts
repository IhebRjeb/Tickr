import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../../ports/notification.repository.port';

import {
  RetryFailedNotificationCommand,
  type RetryFailedNotificationError,
  type RetryFailedNotificationResult,
} from './retry-failed-notification.command';

// Re-export types
export type {
  RetryFailedNotificationResult,
  RetryFailedNotificationError,
};

/**
 * Handler for RetryFailedNotificationCommand
 *
 * Increments retry count and resets notification to PENDING
 * with exponential backoff scheduling.
 */
@Injectable()
export class RetryFailedNotificationHandler {
  private readonly logger = new Logger(
    RetryFailedNotificationHandler.name,
  );

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(
    command: RetryFailedNotificationCommand,
  ): Promise<
    Result<RetryFailedNotificationResult, RetryFailedNotificationError>
  > {
    this.logger.debug(
      `Retrying notification ${command.notificationId}`,
    );

    // ============================================
    // 1. Find notification
    // ============================================
    const notification = await this.notificationRepo.findById(
      command.notificationId,
    );

    if (!notification) {
      return Result.fail({
        type: 'NOT_FOUND',
        message: `Notification ${command.notificationId} not found`,
      });
    }

    // ============================================
    // 2. Increment retry (validates canRetry internally)
    // ============================================
    const retryResult = notification.incrementRetry();
    if (retryResult.isFailure) {
      return Result.fail({
        type: 'NOT_RETRYABLE',
        message: retryResult.error.message,
      });
    }

    // ============================================
    // 3. Persist and publish events
    // ============================================
    try {
      await this.notificationRepo.save(notification);
      await this.eventPublisher.publishFromAggregate(notification);

      this.logger.log(
        `Notification ${notification.id} scheduled for retry #${notification.retryCount}`,
      );

      return Result.ok({
        notificationId: notification.id,
        retryCount: notification.retryCount,
        nextRetryAt: notification.scheduledFor!,
      });
    } catch (error) {
      return Result.fail({
        type: 'PERSISTENCE_ERROR',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
