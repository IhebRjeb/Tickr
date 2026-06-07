/**
 * @file GetUserNotificationsHandler Unit Tests
 */

import type { NotificationRepositoryPort } from '@modules/notifications/application/ports/notification.repository.port';
import { GetUserNotificationsHandler } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserNotificationsQuery } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.query';
import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  RecipientVO,
} from '@modules/notifications/domain';

describe('GetUserNotificationsHandler', () => {
  let handler: GetUserNotificationsHandler;
  let mockNotificationRepo: jest.Mocked<NotificationRepositoryPort>;

  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createNotification = (id: string): NotificationEntity => {
    return NotificationEntity.reconstitute({
      id,
      userId: validUserId,
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      subject: 'Test',
      content: 'Test content',
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
      findByUserId: jest.fn(),
    } as any;

    handler = new GetUserNotificationsHandler(mockNotificationRepo);
  });

  describe('Success', () => {
    it('should return paginated notifications', async () => {
      const notifications = [
        createNotification('550e8400-e29b-41d4-a716-446655440010'),
        createNotification('550e8400-e29b-41d4-a716-446655440011'),
      ];
      mockNotificationRepo.findByUserId.mockResolvedValue({
        data: notifications,
        total: 5,
      });

      const query = new GetUserNotificationsQuery(validUserId, 1, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(2);
      expect(result.value.total).toBe(5);
      expect(result.value.page).toBe(1);
      expect(result.value.limit).toBe(10);
    });

    it('should return empty data when user has no notifications', async () => {
      mockNotificationRepo.findByUserId.mockResolvedValue({
        data: [],
        total: 0,
      });

      const query = new GetUserNotificationsQuery(validUserId, 1, 10);
      const result = await handler.execute(query);

      expect(result.isSuccess).toBe(true);
      expect(result.value.data).toHaveLength(0);
      expect(result.value.total).toBe(0);
    });

    it('should pass pagination params to repository', async () => {
      mockNotificationRepo.findByUserId.mockResolvedValue({
        data: [],
        total: 0,
      });

      const query = new GetUserNotificationsQuery(validUserId, 3, 25);
      await handler.execute(query);

      expect(mockNotificationRepo.findByUserId).toHaveBeenCalledWith(
        validUserId,
        3,
        25,
      );
    });
  });
});
