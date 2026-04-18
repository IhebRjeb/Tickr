import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { RetryFailedNotificationCommand } from '../../application/commands/retry-failed-notification/retry-failed-notification.command';
import { RetryFailedNotificationHandler } from '../../application/commands/retry-failed-notification/retry-failed-notification.handler';

/**
 * Cross-Module Event Handlers (Infrastructure)
 *
 * Handles internal notification domain events that require
 * infrastructure-level actions like auto-retry on failure.
 */
@Injectable()
export class NotificationInfraEventHandlers {
  private readonly logger = new Logger(
    NotificationInfraEventHandlers.name,
  );

  constructor(
    private readonly retryHandler: RetryFailedNotificationHandler,
  ) {}

  /**
   * Auto-retry failed notifications that still have retries remaining
   */
  @OnEvent('notification.failed')
  async onNotificationFailed(payload: {
    notificationId: string;
    willRetry: boolean;
  }): Promise<void> {
    if (!payload.willRetry) {
      this.logger.debug(
        `Notification ${payload.notificationId} failed permanently, no retry`,
      );
      return;
    }

    this.logger.debug(
      `Auto-retrying notification ${payload.notificationId}`,
    );

    const command = new RetryFailedNotificationCommand(
      payload.notificationId,
    );

    const result = await this.retryHandler.execute(command);
    if (result.isFailure) {
      this.logger.warn(
        `Auto-retry failed for ${payload.notificationId}: ${result.error.message}`,
      );
    }
  }
}
