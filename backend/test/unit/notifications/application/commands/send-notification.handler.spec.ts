/**
 * @file SendNotificationHandler Unit Tests
 * @description Tests for the send notification command handler
 */

import { Logger } from '@nestjs/common';

import type { EmailProviderPort } from '@modules/notifications/application/ports/email-provider.port';
import type { NotificationPreferenceRepositoryPort } from '@modules/notifications/application/ports/notification-preference.repository.port';
import type { NotificationRepositoryPort } from '@modules/notifications/application/ports/notification.repository.port';
import type { RateLimiterPort } from '@modules/notifications/application/ports/rate-limiter.port';
import type { SmsProviderPort } from '@modules/notifications/application/ports/sms-provider.port';
import type { TemplateRendererPort } from '@modules/notifications/application/ports/template-renderer.port';
import { SendNotificationCommand } from '@modules/notifications/application/commands/send-notification/send-notification.command';
import { SendNotificationHandler } from '@modules/notifications/application/commands/send-notification/send-notification.handler';
import {
  NotificationChannel,
  NotificationPriority,
  NotificationType,
  NotificationPreferenceEntity,
} from '@modules/notifications/domain';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('SendNotificationHandler', () => {
  let handler: SendNotificationHandler;
  let mockNotificationRepo: jest.Mocked<NotificationRepositoryPort>;
  let mockPreferenceRepo: jest.Mocked<NotificationPreferenceRepositoryPort>;
  let mockEmailProvider: jest.Mocked<EmailProviderPort>;
  let mockSmsProvider: jest.Mocked<SmsProviderPort>;
  let mockTemplateRenderer: jest.Mocked<TemplateRendererPort>;
  let mockRateLimiter: jest.Mocked<RateLimiterPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createCommand = (
    overrides: Partial<ConstructorParameters<typeof SendNotificationCommand>> = {},
  ) => {
    const defaults = [
      validUserId,
      NotificationType.ORDER_CONFIRMATION,
      NotificationChannel.EMAIL,
      { email: 'user@example.com' },
      'Order Confirmed',
      '<p>Your order is confirmed</p>',
      null, // templateSlug
      {}, // templateData
      null, // priority
      null, // scheduledFor
      {}, // metadata
    ] as const;

    const args = [...defaults];
    if (overrides[0] !== undefined) args[0] = overrides[0];
    if (overrides[1] !== undefined) args[1] = overrides[1];
    if (overrides[2] !== undefined) args[2] = overrides[2];
    if (overrides[3] !== undefined) args[3] = overrides[3];
    if (overrides[4] !== undefined) args[4] = overrides[4];
    if (overrides[5] !== undefined) args[5] = overrides[5];
    if (overrides[6] !== undefined) args[6] = overrides[6];
    if (overrides[7] !== undefined) args[7] = overrides[7];
    if (overrides[8] !== undefined) args[8] = overrides[8];
    if (overrides[9] !== undefined) args[9] = overrides[9];
    if (overrides[10] !== undefined) args[10] = overrides[10];

    return new SendNotificationCommand(
      args[0] as string,
      args[1] as NotificationType,
      args[2] as NotificationChannel,
      args[3] as { email?: string; phone?: string },
      args[4] as string | null,
      args[5] as string | null,
      args[6] as string | null,
      args[7] as Record<string, unknown>,
      args[8] as NotificationPriority | null,
      args[9] as Date | null,
      args[10] as Record<string, unknown>,
    );
  };

  beforeEach(() => {
    mockNotificationRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByStatus: jest.fn(),
      findReadyToSend: jest.fn(),
      findFailedRetryable: jest.fn(),
      countByUserSince: jest.fn(),
      countByStatusSince: jest.fn(),
    } as any;

    mockPreferenceRepo = {
      findByUserId: jest.fn().mockResolvedValue(null),
      findByUnsubscribeToken: jest.fn(),
      save: jest.fn(),
    } as any;

    mockEmailProvider = {
      send: jest.fn().mockResolvedValue({ messageId: 'msg-001', success: true }),
    };

    mockSmsProvider = {
      send: jest.fn().mockResolvedValue({ messageId: 'sms-001', success: true }),
    };

    mockTemplateRenderer = {
      render: jest.fn(),
    };

    mockRateLimiter = {
      isAllowed: jest.fn().mockResolvedValue(true),
      isEmailAllowed: jest.fn().mockResolvedValue(true),
      isSmsAllowed: jest.fn().mockResolvedValue(true),
      record: jest.fn().mockResolvedValue(undefined),
      recordEmail: jest.fn().mockResolvedValue(undefined),
      recordSms: jest.fn().mockResolvedValue(undefined),
    };

    mockEventPublisher = {
      publishFromAggregate: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new SendNotificationHandler(
      mockNotificationRepo,
      mockPreferenceRepo,
      mockEmailProvider,
      mockSmsProvider,
      mockTemplateRenderer,
      mockRateLimiter,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  // ============================================
  // Success Cases
  // ============================================

  describe('Success Cases', () => {
    it('should send an email notification successfully', async () => {
      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.notificationId).toBeDefined();
      expect(result.value.status).toBe('SENT');
      expect(mockEmailProvider.send).toHaveBeenCalledTimes(1);
      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should send an SMS notification successfully', async () => {
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.PASSWORD_RESET,
        NotificationChannel.SMS,
        { phone: '+21650000000' },
        null,
        'Your reset code is 123456',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockSmsProvider.send).toHaveBeenCalledTimes(1);
      expect(mockRateLimiter.recordSms).toHaveBeenCalledTimes(1);
    });

    it('should record rate limit after sending', async () => {
      const command = createCommand();
      await handler.execute(command);

      expect(mockRateLimiter.record).toHaveBeenCalledWith(validUserId);
      expect(mockRateLimiter.recordEmail).toHaveBeenCalledTimes(1);
    });

    it('should publish domain events after sending', async () => {
      const command = createCommand();
      await handler.execute(command);

      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should render template when templateSlug provided', async () => {
      mockTemplateRenderer.render.mockResolvedValue({
        subject: 'Rendered Subject',
        htmlBody: '<h1>Rendered Body</h1>',
        textBody: 'Rendered Body',
      });

      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.WELCOME,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        null,
        null,
        'welcome-email',
        { name: 'John' },
        null,
        null,
        {},
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(mockTemplateRenderer.render).toHaveBeenCalledWith(
        'welcome-email',
        { name: 'John' },
      );
    });

    it('should schedule notification for future without sending', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000);
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.EVENT_REMINDER,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        'Reminder',
        'Your event is tomorrow',
        null,
        {},
        null,
        futureDate,
        {},
      );

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.status).toBe('PENDING');
      expect(mockEmailProvider.send).not.toHaveBeenCalled();
      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should bypass rate limit for HIGH priority', async () => {
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.SECURITY_ALERT,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        'Security Alert',
        'New login from unknown device',
        null,
        {},
        NotificationPriority.HIGH,
        null,
        {},
      );

      await handler.execute(command);

      expect(mockRateLimiter.isAllowed).not.toHaveBeenCalled();
      expect(mockRateLimiter.isEmailAllowed).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Validation Failures
  // ============================================

  describe('Validation Failures', () => {
    it('should fail with no recipient contact', async () => {
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        {},
        'Subject',
        'Content',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });

    it('should fail with invalid email', async () => {
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'invalid' },
        'Subject',
        'Content',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });

    it('should fail when no content and no template', async () => {
      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        'Subject',
        null,
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('VALIDATION_ERROR');
    });
  });

  // ============================================
  // User Opt-Out
  // ============================================

  describe('User Opt-Out', () => {
    it('should fail when user opted out of notification type', async () => {
      const preference = NotificationPreferenceEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        emailEnabled: true,
        smsEnabled: true,
        marketingEnabled: false,
        eventRemindersEnabled: true,
        unsubscribeToken: 'a'.repeat(64),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPreferenceRepo.findByUserId.mockResolvedValue(preference);

      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.MARKETING_PROMO,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        'Sale!',
        'Big sale',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_OPTED_OUT');
    });

    it('should allow transactional even when marketing disabled', async () => {
      const preference = NotificationPreferenceEntity.reconstitute({
        id: '550e8400-e29b-41d4-a716-446655440099',
        userId: validUserId,
        emailEnabled: true,
        smsEnabled: true,
        marketingEnabled: false,
        eventRemindersEnabled: false,
        unsubscribeToken: 'a'.repeat(64),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPreferenceRepo.findByUserId.mockResolvedValue(preference);

      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
    });
  });

  // ============================================
  // Rate Limiting
  // ============================================

  describe('Rate Limiting', () => {
    it('should fail when user rate limit exceeded', async () => {
      mockRateLimiter.isAllowed.mockResolvedValue(false);

      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should fail when global email rate limit exceeded', async () => {
      mockRateLimiter.isEmailAllowed.mockResolvedValue(false);

      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should fail when global SMS rate limit exceeded', async () => {
      mockRateLimiter.isSmsAllowed.mockResolvedValue(false);

      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.PASSWORD_RESET,
        NotificationChannel.SMS,
        { phone: '+21650000000' },
        null,
        'Code: 1234',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  // ============================================
  // Template Rendering
  // ============================================

  describe('Template Rendering', () => {
    it('should fail when template rendering throws', async () => {
      mockTemplateRenderer.render.mockRejectedValue(
        new Error('Template not found'),
      );

      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.WELCOME,
        NotificationChannel.EMAIL,
        { email: 'user@example.com' },
        null,
        null,
        'welcome-email',
        { name: 'John' },
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('TEMPLATE_RENDERING_ERROR');
    });
  });

  // ============================================
  // Send Failures
  // ============================================

  describe('Send Failures', () => {
    it('should handle email provider failure', async () => {
      mockEmailProvider.send.mockRejectedValue(
        new Error('SES connection failed'),
      );

      const command = createCommand();
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('SEND_FAILED');
      // Should still persist the failed notification
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });

    it('should handle SMS provider failure', async () => {
      mockSmsProvider.send.mockRejectedValue(
        new Error('SNS connection failed'),
      );

      const command = new SendNotificationCommand(
        validUserId,
        NotificationType.PASSWORD_RESET,
        NotificationChannel.SMS,
        { phone: '+21650000000' },
        null,
        'Code: 1234',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await handler.execute(command);
      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('SEND_FAILED');
    });
  });
});
