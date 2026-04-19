import { Inject, Injectable, Logger } from '@nestjs/common';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import {
  EMAIL_PROVIDER,
  type EmailProviderPort,
} from '../../ports/email-provider.port';
import {
  NOTIFICATION_REPOSITORY,
  type NotificationRepositoryPort,
} from '../../ports/notification.repository.port';
import {
  RATE_LIMITER,
  type RateLimiterPort,
} from '../../ports/rate-limiter.port';
import {
  SMS_PROVIDER,
  type SmsProviderPort,
} from '../../ports/sms-provider.port';

const BATCH_SIZE = 50;

/**
 * Process Scheduled Notifications Handler
 *
 * Called by the cron job scheduler to process notifications
 * that are ready to send (PENDING + scheduledFor <= now).
 *
 * Also picks up retryable failed notifications.
 */
@Injectable()
export class ProcessScheduledNotificationsHandler {
  private readonly logger = new Logger(
    ProcessScheduledNotificationsHandler.name,
  );

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProviderPort,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: SmsProviderPort,
    @Inject(RATE_LIMITER)
    private readonly rateLimiter: RateLimiterPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(): Promise<{ processed: number; failed: number }> {
    this.logger.debug('Processing scheduled notifications...');

    const notifications =
      await this.notificationRepo.findReadyToSend(BATCH_SIZE);

    let processed = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        // Rate limit check (HIGH priority bypasses)
        if (notification.priority !== NotificationPriority.HIGH) {
          const allowed = await this.rateLimiter.isAllowed(
            notification.userId,
          );
          if (!allowed) {
            this.logger.warn(
              `Rate limited: notification ${notification.id}`,
            );
            continue;
          }
        }

        // Mark as sending
        const sendingResult = notification.markAsSending();
        if (sendingResult.isFailure) {
          this.logger.warn(
            `Cannot send ${notification.id}: ${sendingResult.error.message}`,
          );
          failed++;
          continue;
        }

        // Dispatch
        let messageId: string;
        if (notification.channel === NotificationChannel.EMAIL) {
          const result = await this.emailProvider.send({
            to: notification.recipient.email!,
            subject: notification.subject ?? '',
            htmlBody: notification.content,
          });
          messageId = result.messageId;
          await this.rateLimiter.recordEmail();
        } else {
          const result = await this.smsProvider.send({
            phoneNumber: notification.recipient.phone!,
            message: notification.content,
          });
          messageId = result.messageId;
          await this.rateLimiter.recordSms();
        }

        await this.rateLimiter.record(notification.userId);
        notification.markAsSent(messageId);
        await this.notificationRepo.save(notification);
        await this.eventPublisher.publishFromAggregate(notification);

        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process notification ${notification.id}: ${error}`,
        );

        notification.markAsFailed(
          error instanceof Error ? error.message : 'Unknown error',
        );

        try {
          await this.notificationRepo.save(notification);
          await this.eventPublisher.publishFromAggregate(notification);
        } catch (persistError) {
          this.logger.error(
            `Failed to persist failure for ${notification.id}: ${persistError}`,
          );
        }

        failed++;
      }
    }

    if (processed > 0 || failed > 0) {
      this.logger.log(
        `Processed ${processed} notifications, ${failed} failed`,
      );
    }

    return { processed, failed };
  }
}
