/**
 * @file RetryFailedNotificationHandler Unit Tests
 */


import { RetryFailedNotificationCommand } from '@modules/notifications/application/commands/retry-failed-notification/retry-failed-notification.command';
import { RetryFailedNotificationHandler } from '@modules/notifications/application/commands/retry-failed-notification/retry-failed-notification.handler';
import type { NotificationRepositoryPort } from '@modules/notifications/application/ports/notification.repository.port';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  RecipientVO,
} from '@modules/notifications/domain';
import { Logger } from '@nestjs/common';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';

describe('RetryFailedNotificationHandler', () => {
  let handler: RetryFailedNotificationHandler;
  let mockNotificationRepo: jest.Mocked<NotificationRepositoryPort>;
  let mockEventPublisher: jest.Mocked<DomainEventPublisher>;

  const notificationId = '550e8400-e29b-41d4-a716-446655440010';

  const createFailedNotification = (
    retryCount = 0,
    maxRetries = 3,
  ): NotificationEntity => {
    return NotificationEntity.reconstitute({
      id: notificationId,
      userId: '550e8400-e29b-41d4-a716-446655440001',
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      subject: 'Order Confirmed',
      content: '<p>Your order is confirmed</p>',
      templateId: null,
      templateData: {},
      recipient: RecipientVO.reconstitute('user@example.com', null),
      status: NotificationStatus.FAILED,
      scheduledFor: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: 'Connection timeout',
      retryCount,
      maxRetries,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockNotificationRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockEventPublisher = {
      publishFromAggregate: jest.fn().mockResolvedValue(undefined),
    } as any;

    handler = new RetryFailedNotificationHandler(
      mockNotificationRepo,
      mockEventPublisher,
    );

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
  });

  describe('Success', () => {
    it('should retry a failed notification', async () => {
      const notification = createFailedNotification(0, 3);
      mockNotificationRepo.findById.mockResolvedValue(notification);

      const command = new RetryFailedNotificationCommand(notificationId);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.notificationId).toBe(notificationId);
      expect(result.value.retryCount).toBe(1);
      expect(result.value.nextRetryAt).toBeDefined();
      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(1);
      expect(mockEventPublisher.publishFromAggregate).toHaveBeenCalledTimes(1);
    });

    it('should increment retry count correctly', async () => {
      const notification = createFailedNotification(1, 3);
      mockNotificationRepo.findById.mockResolvedValue(notification);

      const command = new RetryFailedNotificationCommand(notificationId);
      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value.retryCount).toBe(2);
    });
  });

  describe('Failures', () => {
    it('should fail when notification not found', async () => {
      mockNotificationRepo.findById.mockResolvedValue(null);

      const command = new RetryFailedNotificationCommand(notificationId);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
    });

    it('should fail when max retries exceeded', async () => {
      const notification = createFailedNotification(3, 3);
      mockNotificationRepo.findById.mockResolvedValue(notification);

      const command = new RetryFailedNotificationCommand(notificationId);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_RETRYABLE');
    });

    it('should fail on persistence error', async () => {
      const notification = createFailedNotification(0, 3);
      mockNotificationRepo.findById.mockResolvedValue(notification);
      mockNotificationRepo.save.mockRejectedValue(new Error('DB error'));

      const command = new RetryFailedNotificationCommand(notificationId);
      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('PERSISTENCE_ERROR');
    });
  });
});
