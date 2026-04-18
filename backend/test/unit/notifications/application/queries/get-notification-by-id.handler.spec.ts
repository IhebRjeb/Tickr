/**
 * @file GetNotificationByIdHandler Unit Tests
 */

import { Logger } from '@nestjs/common';

import type { NotificationRepositoryPort } from '@modules/notifications/application/ports/notification.repository.port';
import { GetNotificationByIdHandler } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetNotificationByIdQuery } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.query';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  RecipientVO,
} from '@modules/notifications/domain';

describe('GetNotificationByIdHandler', () => {
  let handler: GetNotificationByIdHandler;
  let mockNotificationRepo: jest.Mocked<NotificationRepositoryPort>;

  const notificationId = '550e8400-e29b-41d4-a716-446655440010';
  const ownerId = '550e8400-e29b-41d4-a716-446655440001';
  const otherUserId = '550e8400-e29b-41d4-a716-446655440099';

  const createNotification = (): NotificationEntity => {
    return NotificationEntity.reconstitute({
      id: notificationId,
      userId: ownerId,
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      subject: 'Order Confirmed',
      content: '<p>Your order is confirmed</p>',
      templateId: null,
      templateData: {},
      recipient: RecipientVO.reconstitute('user@example.com', null),
      status: NotificationStatus.SENT,
      scheduledFor: null,
      sentAt: new Date(),
      deliveredAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: 3,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  beforeEach(() => {
    mockNotificationRepo = {
      findById: jest.fn(),
    } as any;

    handler = new GetNotificationByIdHandler(mockNotificationRepo);

    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  describe('Success', () => {
    it('should return notification for the owner', async () => {
      const notification = createNotification();
      mockNotificationRepo.findById.mockResolvedValue(notification);

      const query = new GetNotificationByIdQuery(notificationId, ownerId);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.id).toBe(notificationId);
      expect(result.value.status).toBe(NotificationStatus.SENT);
    });
  });

  describe('Failures', () => {
    it('should fail when notification not found', async () => {
      mockNotificationRepo.findById.mockResolvedValue(null);

      const query = new GetNotificationByIdQuery(notificationId, ownerId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
    });

    it('should fail when user is not the owner', async () => {
      const notification = createNotification();
      mockNotificationRepo.findById.mockResolvedValue(notification);

      const query = new GetNotificationByIdQuery(notificationId, otherUserId);
      const result = await handler.execute(query);

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('NOT_FOUND');
    });
  });
});
