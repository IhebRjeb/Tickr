import { Inject, Injectable, Logger } from '@nestjs/common';

import { Result } from '@shared/domain/result';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import type { DomainEventPublisherPort } from '@shared/application/interfaces/domain-event-publisher.port';

import { NotificationEntity } from '../../../domain/entities/notification.entity';
import { NotificationChannel } from '../../../domain/value-objects/notification-channel.vo';
import { NotificationPriority } from '../../../domain/value-objects/notification-priority.vo';
import { RecipientVO } from '../../../domain/value-objects/recipient.vo';
import {
  EMAIL_PROVIDER,
  type EmailProviderPort,
} from '../../ports/email-provider.port';
import {
  NOTIFICATION_PREFERENCE_REPOSITORY,
  type NotificationPreferenceRepositoryPort,
} from '../../ports/notification-preference.repository.port';
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
import {
  TEMPLATE_RENDERER,
  type TemplateRendererPort,
} from '../../ports/template-renderer.port';

import {
  SendNotificationCommand,
  type SendNotificationError,
  type SendNotificationResultCommand,
} from './send-notification.command';

// Re-export types
export type { SendNotificationResultCommand, SendNotificationError };

/**
 * Handler for SendNotificationCommand
 *
 * Orchestrates the full notification send lifecycle:
 * 1. Validate inputs and create Recipient VO
 * 2. Check user preferences (opt-out)
 * 3. Check rate limits (unless HIGH priority)
 * 4. Render template if templateSlug provided
 * 5. Create Notification entity
 * 6. Dispatch via channel provider (or schedule for later)
 * 7. Update status and persist
 * 8. Publish domain events
 */
@Injectable()
export class SendNotificationHandler {
  private readonly logger = new Logger(SendNotificationHandler.name);

  constructor(
    @Inject(NOTIFICATION_REPOSITORY)
    private readonly notificationRepo: NotificationRepositoryPort,
    @Inject(NOTIFICATION_PREFERENCE_REPOSITORY)
    private readonly preferenceRepo: NotificationPreferenceRepositoryPort,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProviderPort,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: SmsProviderPort,
    @Inject(TEMPLATE_RENDERER)
    private readonly templateRenderer: TemplateRendererPort,
    @Inject(RATE_LIMITER)
    private readonly rateLimiter: RateLimiterPort,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisherPort,
  ) {}

  async execute(
    command: SendNotificationCommand,
  ): Promise<Result<SendNotificationResultCommand, SendNotificationError>> {
    this.logger.debug(
      `Sending ${command.channel} notification to user ${command.userId}`,
    );

    // ============================================
    // 1. Create Recipient VO
    // ============================================
    let recipient: RecipientVO;
    try {
      if (command.recipient.email && command.recipient.phone) {
        recipient = RecipientVO.fromBoth(
          command.recipient.email,
          command.recipient.phone,
        );
      } else if (command.recipient.email) {
        recipient = RecipientVO.fromEmail(command.recipient.email);
      } else if (command.recipient.phone) {
        recipient = RecipientVO.fromPhone(command.recipient.phone);
      } else {
        return Result.fail({
          type: 'VALIDATION_ERROR',
          message: 'Recipient must have at least an email or phone number',
        });
      }
    } catch (error) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message:
          error instanceof Error ? error.message : 'Invalid recipient',
      });
    }

    // ============================================
    // 2. Check user preferences
    // ============================================
    const preferences = await this.preferenceRepo.findByUserId(
      command.userId,
    );
    if (preferences) {
      const channelKey =
        command.channel === NotificationChannel.EMAIL ? 'EMAIL' : 'SMS';
      if (!preferences.canReceive(command.type, channelKey)) {
        return Result.fail({
          type: 'USER_OPTED_OUT',
          message: `User has opted out of ${command.type} notifications via ${command.channel}`,
        });
      }
    }

    // ============================================
    // 3. Check rate limits (HIGH priority bypasses)
    // ============================================
    const priority = command.priority ?? NotificationPriority.MEDIUM;
    if (priority !== NotificationPriority.HIGH) {
      const userAllowed = await this.rateLimiter.isAllowed(command.userId);
      if (!userAllowed) {
        return Result.fail({
          type: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for user ${command.userId}`,
        });
      }

      if (command.channel === NotificationChannel.EMAIL) {
        const emailAllowed = await this.rateLimiter.isEmailAllowed();
        if (!emailAllowed) {
          return Result.fail({
            type: 'RATE_LIMIT_EXCEEDED',
            message: 'Global email rate limit exceeded',
          });
        }
      } else if (command.channel === NotificationChannel.SMS) {
        const smsAllowed = await this.rateLimiter.isSmsAllowed();
        if (!smsAllowed) {
          return Result.fail({
            type: 'RATE_LIMIT_EXCEEDED',
            message: 'Global SMS rate limit exceeded',
          });
        }
      }
    }

    // ============================================
    // 4. Render template if provided
    // ============================================
    let subject = command.subject;
    let content = command.content ?? '';

    if (command.templateSlug) {
      try {
        const rendered = await this.templateRenderer.render(
          command.templateSlug,
          command.templateData,
        );
        subject = rendered.subject ?? subject;
        content = rendered.htmlBody;
      } catch (error) {
        return Result.fail({
          type: 'TEMPLATE_RENDERING_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Template rendering failed',
        });
      }
    }

    if (!content || content.trim().length === 0) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message:
          'Notification must have content or a valid template slug',
      });
    }

    // ============================================
    // 5. Create Notification entity
    // ============================================
    const createResult = NotificationEntity.create({
      userId: command.userId,
      type: command.type,
      channel: command.channel,
      priority,
      subject,
      content,
      templateId: command.templateSlug,
      templateData: command.templateData,
      recipient,
      scheduledFor: command.scheduledFor,
      metadata: command.metadata,
    });

    if (createResult.isFailure) {
      return Result.fail({
        type: 'VALIDATION_ERROR',
        message: createResult.error.message,
      });
    }

    const notification = createResult.value;

    // ============================================
    // 6. If scheduled for later, just persist
    // ============================================
    if (command.scheduledFor && command.scheduledFor > new Date()) {
      try {
        await this.notificationRepo.save(notification);
        await this.eventPublisher.publishFromAggregate(notification);

        this.logger.log(
          `Scheduled notification ${notification.id} for ${command.scheduledFor.toISOString()}`,
        );

        return Result.ok({
          notificationId: notification.id,
          status: notification.status,
        });
      } catch (error) {
        return Result.fail({
          type: 'PERSISTENCE_ERROR',
          message: `Failed to save notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // ============================================
    // 7. Send immediately
    // ============================================
    const sendingResult = notification.markAsSending();
    if (sendingResult.isFailure) {
      return Result.fail({
        type: 'SEND_FAILED',
        message: sendingResult.error.message,
      });
    }

    try {
      let messageId: string;

      if (command.channel === NotificationChannel.EMAIL) {
        const emailResult = await this.emailProvider.send({
          to: recipient.email!,
          subject: subject ?? '',
          htmlBody: content,
        });
        messageId = emailResult.messageId;
        await this.rateLimiter.recordEmail();
      } else {
        const smsResult = await this.smsProvider.send({
          phoneNumber: recipient.phone!,
          message: content,
        });
        messageId = smsResult.messageId;
        await this.rateLimiter.recordSms();
      }

      await this.rateLimiter.record(command.userId);
      notification.markAsSent(messageId);

      await this.notificationRepo.save(notification);
      await this.eventPublisher.publishFromAggregate(notification);

      this.logger.log(
        `Sent ${command.channel} notification ${notification.id} (messageId: ${messageId})`,
      );

      return Result.ok({
        notificationId: notification.id,
        status: notification.status,
      });
    } catch (error) {
      notification.markAsFailed(
        error instanceof Error ? error.message : 'Unknown send error',
      );

      try {
        await this.notificationRepo.save(notification);
        await this.eventPublisher.publishFromAggregate(notification);
      } catch (persistError) {
        this.logger.error(
          `Failed to persist failed notification: ${persistError}`,
        );
      }

      return Result.fail({
        type: 'SEND_FAILED',
        message: `Failed to send notification: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}
