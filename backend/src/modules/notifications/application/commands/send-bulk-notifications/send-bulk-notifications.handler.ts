import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';

import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import { SendNotificationCommand } from '../send-notification/send-notification.command';
import { SendNotificationHandler } from '../send-notification/send-notification.handler';

import {
  SendBulkNotificationsCommand,
  type SendBulkNotificationsError,
  type SendBulkNotificationsResult,
} from './send-bulk-notifications.command';

// Re-export types
export type {
  SendBulkNotificationsResult,
  SendBulkNotificationsError,
};

/**
 * Handler for SendBulkNotificationsCommand
 *
 * Delegates to SendNotificationHandler for each recipient.
 * Collects results and returns aggregate stats.
 */
@Injectable()
export class SendBulkNotificationsHandler {
  private readonly logger = new Logger(
    SendBulkNotificationsHandler.name,
  );

  constructor(
    private readonly sendHandler: SendNotificationHandler,
  ) {}

  async execute(
    command: SendBulkNotificationsCommand,
  ): Promise<
    Result<SendBulkNotificationsResult, SendBulkNotificationsError>
  > {
    if (!command.recipients || command.recipients.length === 0) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: 'At least one recipient is required',
      });
    }

    this.logger.debug(
      `Sending bulk ${command.channel} notifications to ${command.recipients.length} recipients`,
    );

    const notificationIds: string[] = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const recipient of command.recipients) {
      const mergedData = {
        ...command.metadata,
        ...recipient.templateData,
      };

      const sendCommand = new SendNotificationCommand(
        recipient.userId,
        command.type,
        command.channel,
        { email: recipient.email, phone: recipient.phone },
        command.subject,
        command.content,
        command.templateSlug,
        mergedData,
        command.priority,
        null, // no scheduling for bulk
        command.metadata,
      );

      const result = await this.sendHandler.execute(sendCommand);

      if (result.isSuccess) {
        notificationIds.push(result.value.notificationId);
        totalSent++;
      } else {
        this.logger.warn(
          `Bulk send failed for user ${recipient.userId}: ${result.error.message}`,
        );
        totalFailed++;
      }
    }

    this.logger.log(
      `Bulk send complete: ${totalSent} sent, ${totalFailed} failed`,
    );

    return Result.ok({
      totalSent,
      totalFailed,
      notificationIds,
    });
  }
}
