/**
 * @file Notification Entity Unit Tests
 * @description Tests for Notification aggregate root - the main entity of the Notifications bounded context
 */

import {
  NotificationEntity,
  NotificationStatus,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  RecipientVO,
  NotificationScheduledEvent,
  NotificationSentEvent,
  NotificationDeliveredEvent,
  NotificationFailedEvent,
  NotificationRetryingEvent,
  InvalidNotificationException,
  NotificationNotSendableException,
  MaxRetriesExceededException,
} from '@modules/notifications/domain';

describe('NotificationEntity (Aggregate Root)', () => {
  // ============================================
  // Helper Functions
  // ============================================

  const validUUID = '550e8400-e29b-41d4-a716-446655440000';
  const validUserId = '550e8400-e29b-41d4-a716-446655440001';

  const createValidProps = (overrides: Record<string, unknown> = {}) => ({
    userId: validUserId,
    type: NotificationType.ORDER_CONFIRMATION,
    channel: NotificationChannel.EMAIL,
    priority: NotificationPriority.MEDIUM,
    subject: 'Order Confirmed',
    content: '<p>Your order is confirmed</p>',
    templateId: null,
    templateData: {},
    recipient: RecipientVO.fromEmail('user@example.com'),
    ...overrides,
  });

  const createNotification = (
    overrides: Record<string, unknown> = {},
  ): NotificationEntity => {
    const result = NotificationEntity.create(createValidProps(overrides));
    expect(result.isSuccess).toBe(true);
    return result.value;
  };

  const createReconstituted = (
    overrides: Record<string, unknown> = {},
  ): NotificationEntity => {
    return NotificationEntity.reconstitute({
      id: validUUID,
      userId: validUserId,
      type: NotificationType.ORDER_CONFIRMATION,
      channel: NotificationChannel.EMAIL,
      priority: NotificationPriority.MEDIUM,
      subject: 'Order Confirmed',
      content: '<p>Your order is confirmed</p>',
      templateId: null,
      templateData: {},
      recipient: RecipientVO.fromEmail('user@example.com'),
      status: NotificationStatus.PENDING,
      scheduledFor: null,
      sentAt: null,
      deliveredAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: 3,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    });
  };

  // ============================================
  // create()
  // ============================================

  describe('create()', () => {
    describe('Success Cases', () => {
      it('should create a valid notification with all properties', () => {
        const result = NotificationEntity.create(createValidProps());

        expect(result.isSuccess).toBe(true);
        const notification = result.value;
        expect(notification.userId).toBe(validUserId);
        expect(notification.type).toBe(NotificationType.ORDER_CONFIRMATION);
        expect(notification.channel).toBe(NotificationChannel.EMAIL);
        expect(notification.priority).toBe(NotificationPriority.MEDIUM);
        expect(notification.subject).toBe('Order Confirmed');
        expect(notification.content).toBe('<p>Your order is confirmed</p>');
        expect(notification.recipient.email).toBe('user@example.com');
      });

      it('should set PENDING status by default', () => {
        const notification = createNotification();
        expect(notification.status).toBe(NotificationStatus.PENDING);
      });

      it('should have null sentAt and deliveredAt initially', () => {
        const notification = createNotification();
        expect(notification.sentAt).toBeNull();
        expect(notification.deliveredAt).toBeNull();
        expect(notification.failureReason).toBeNull();
      });

      it('should have zero retryCount', () => {
        const notification = createNotification();
        expect(notification.retryCount).toBe(0);
      });

      it('should default maxRetries to 3', () => {
        const notification = createNotification();
        expect(notification.maxRetries).toBe(3);
      });

      it('should accept custom maxRetries', () => {
        const notification = createNotification({ maxRetries: 5 });
        expect(notification.maxRetries).toBe(5);
      });

      it('should default priority to MEDIUM', () => {
        const result = NotificationEntity.create({
          userId: validUserId,
          type: NotificationType.ORDER_CONFIRMATION,
          channel: NotificationChannel.EMAIL,
          subject: 'Test',
          content: 'body',
          templateId: null,
          templateData: {},
          recipient: RecipientVO.fromEmail('test@test.com'),
        });
        expect(result.isSuccess).toBe(true);
        expect(result.value.priority).toBe(NotificationPriority.MEDIUM);
      });

      it('should accept scheduledFor date', () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000);
        const notification = createNotification({ scheduledFor: futureDate });
        expect(notification.scheduledFor).toEqual(futureDate);
      });

      it('should generate unique IDs', () => {
        const n1 = createNotification();
        const n2 = createNotification();
        expect(n1.id).not.toBe(n2.id);
      });

      it('should emit NotificationScheduledEvent', () => {
        const notification = createNotification();
        const events = notification.domainEvents;

        const scheduledEvent = events.find(
          (e): e is NotificationScheduledEvent =>
            e instanceof NotificationScheduledEvent,
        );
        expect(scheduledEvent).toBeDefined();
        expect(scheduledEvent!.userId).toBe(validUserId);
        expect(scheduledEvent!.type).toBe(NotificationType.ORDER_CONFIRMATION);
        expect(scheduledEvent!.channel).toBe(NotificationChannel.EMAIL);
      });

      it('should accept metadata', () => {
        const metadata = { orderId: '123', source: 'checkout' };
        const notification = createNotification({ metadata });
        expect(notification.metadata).toEqual(metadata);
      });

      it('should return defensive copy of templateData', () => {
        const templateData = { name: 'John' };
        const notification = createNotification({ templateData });
        const returned = notification.templateData;
        returned['injected'] = true;
        expect(notification.templateData).not.toHaveProperty('injected');
      });

      it('should return defensive copy of metadata', () => {
        const metadata = { key: 'val' };
        const notification = createNotification({ metadata });
        const returned = notification.metadata;
        returned['injected'] = true;
        expect(notification.metadata).not.toHaveProperty('injected');
      });
    });

    describe('Validation Failures', () => {
      it('should fail with invalid userId', () => {
        const result = NotificationEntity.create(
          createValidProps({ userId: 'not-a-uuid' }),
        );
        expect(result.isFailure).toBe(true);
        expect(result.error).toBeInstanceOf(InvalidNotificationException);
      });

      it('should fail with empty userId', () => {
        const result = NotificationEntity.create(
          createValidProps({ userId: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with empty content', () => {
        const result = NotificationEntity.create(
          createValidProps({ content: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail with whitespace-only content', () => {
        const result = NotificationEntity.create(
          createValidProps({ content: '   ' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail when EMAIL channel has no subject', () => {
        const result = NotificationEntity.create(
          createValidProps({ subject: null }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should fail when EMAIL channel has empty subject', () => {
        const result = NotificationEntity.create(
          createValidProps({ subject: '' }),
        );
        expect(result.isFailure).toBe(true);
      });

      it('should allow null subject for SMS channel', () => {
        const result = NotificationEntity.create(
          createValidProps({
            channel: NotificationChannel.SMS,
            subject: null,
            recipient: RecipientVO.fromPhone('+21650000000'),
          }),
        );
        expect(result.isSuccess).toBe(true);
      });

      it('should fail without recipient', () => {
        const result = NotificationEntity.create(
          createValidProps({ recipient: null }),
        );
        expect(result.isFailure).toBe(true);
      });
    });
  });

  // ============================================
  // reconstitute()
  // ============================================

  describe('reconstitute()', () => {
    it('should reconstitute with all properties', () => {
      const notification = createReconstituted();
      expect(notification.id).toBe(validUUID);
      expect(notification.userId).toBe(validUserId);
      expect(notification.status).toBe(NotificationStatus.PENDING);
    });

    it('should not emit any domain events', () => {
      const notification = createReconstituted();
      expect(notification.domainEvents).toHaveLength(0);
    });

    it('should reconstitute with non-default status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.sentAt).toBeDefined();
    });

    it('should reconstitute with retry data', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 2,
        failureReason: 'Connection timeout',
      });
      expect(notification.retryCount).toBe(2);
      expect(notification.failureReason).toBe('Connection timeout');
    });
  });

  // ============================================
  // Query Methods
  // ============================================

  describe('canRetry()', () => {
    it('should return true for FAILED with retries remaining', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 1,
        maxRetries: 3,
      });
      expect(notification.canRetry()).toBe(true);
    });

    it('should return false when retryCount equals maxRetries', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 3,
        maxRetries: 3,
      });
      expect(notification.canRetry()).toBe(false);
    });

    it('should return false for non-FAILED status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.PENDING,
        retryCount: 0,
      });
      expect(notification.canRetry()).toBe(false);
    });

    it('should return false for SENT status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
        retryCount: 0,
      });
      expect(notification.canRetry()).toBe(false);
    });
  });

  describe('isExpired()', () => {
    it('should return false when no scheduledFor', () => {
      const notification = createReconstituted({ scheduledFor: null });
      expect(notification.isExpired()).toBe(false);
    });

    it('should return false when within 24h window', () => {
      const scheduledFor = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12h ago
      const notification = createReconstituted({ scheduledFor });
      expect(notification.isExpired()).toBe(false);
    });

    it('should return true when past 24h window', () => {
      const scheduledFor = new Date(
        Date.now() - 25 * 60 * 60 * 1000,
      ); // 25h ago
      const notification = createReconstituted({ scheduledFor });
      expect(notification.isExpired()).toBe(true);
    });
  });

  describe('isReadyToSend()', () => {
    it('should return true for PENDING with no scheduledFor', () => {
      const notification = createReconstituted({
        status: NotificationStatus.PENDING,
        scheduledFor: null,
      });
      expect(notification.isReadyToSend()).toBe(true);
    });

    it('should return true for PENDING with past scheduledFor', () => {
      const notification = createReconstituted({
        status: NotificationStatus.PENDING,
        scheduledFor: new Date(Date.now() - 1000),
      });
      expect(notification.isReadyToSend()).toBe(true);
    });

    it('should return false for PENDING with future scheduledFor', () => {
      const notification = createReconstituted({
        status: NotificationStatus.PENDING,
        scheduledFor: new Date(Date.now() + 60 * 60 * 1000),
      });
      expect(notification.isReadyToSend()).toBe(false);
    });

    it('should return false for non-PENDING status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
        scheduledFor: null,
      });
      expect(notification.isReadyToSend()).toBe(false);
    });
  });

  // ============================================
  // schedule()
  // ============================================

  describe('schedule()', () => {
    it('should set scheduledFor when PENDING', () => {
      const notification = createNotification();
      const sendAt = new Date(Date.now() + 60 * 60 * 1000);

      const result = notification.schedule(sendAt);
      expect(result.isSuccess).toBe(true);
      expect(notification.scheduledFor).toEqual(sendAt);
    });

    it('should fail when not PENDING', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
      });
      const sendAt = new Date(Date.now() + 60 * 60 * 1000);

      const result = notification.schedule(sendAt);
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(NotificationNotSendableException);
    });
  });

  // ============================================
  // markAsSending()
  // ============================================

  describe('markAsSending()', () => {
    it('should transition PENDING → SENDING', () => {
      const notification = createNotification();

      const result = notification.markAsSending();
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.SENDING);
    });

    it('should fail from SENT status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
      });

      const result = notification.markAsSending();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(NotificationNotSendableException);
    });

    it('should fail from DELIVERED status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.DELIVERED,
      });

      const result = notification.markAsSending();
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // markAsSent()
  // ============================================

  describe('markAsSent()', () => {
    it('should transition SENDING → SENT and set sentAt', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
      });
      const before = new Date();

      const result = notification.markAsSent('msg-123');
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.SENT);
      expect(notification.sentAt).toBeDefined();
      expect(notification.sentAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('should emit NotificationSentEvent', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
      });

      notification.markAsSent('msg-456');
      const events = notification.domainEvents;
      const sentEvent = events.find(
        (e): e is NotificationSentEvent => e instanceof NotificationSentEvent,
      );
      expect(sentEvent).toBeDefined();
      expect(sentEvent!.messageId).toBe('msg-456');
    });

    it('should fail from PENDING status', () => {
      const notification = createNotification();
      const result = notification.markAsSent('msg-789');
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // markAsDelivered()
  // ============================================

  describe('markAsDelivered()', () => {
    it('should transition SENT → DELIVERED and set deliveredAt', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
      });
      const before = new Date();

      const result = notification.markAsDelivered();
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.DELIVERED);
      expect(notification.deliveredAt).toBeDefined();
      expect(notification.deliveredAt!.getTime()).toBeGreaterThanOrEqual(
        before.getTime(),
      );
    });

    it('should emit NotificationDeliveredEvent', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
      });

      notification.markAsDelivered();
      const events = notification.domainEvents;
      const deliveredEvent = events.find(
        (e): e is NotificationDeliveredEvent =>
          e instanceof NotificationDeliveredEvent,
      );
      expect(deliveredEvent).toBeDefined();
    });

    it('should fail from PENDING status', () => {
      const notification = createNotification();
      const result = notification.markAsDelivered();
      expect(result.isFailure).toBe(true);
    });

    it('should fail from FAILED status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
      });
      const result = notification.markAsDelivered();
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // markAsFailed()
  // ============================================

  describe('markAsFailed()', () => {
    it('should transition SENDING → FAILED', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
      });

      const result = notification.markAsFailed('Connection timeout');
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.FAILED);
      expect(notification.failureReason).toBe('Connection timeout');
    });

    it('should transition PENDING → FAILED', () => {
      const notification = createNotification();

      const result = notification.markAsFailed('Rate limited');
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.FAILED);
    });

    it('should transition SENT → FAILED (bounce)', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENT,
      });

      const result = notification.markAsFailed('Bounce: invalid mailbox');
      expect(result.isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.FAILED);
    });

    it('should emit NotificationFailedEvent with canRetry info', () => {
      const notification = createReconstituted({
        status: NotificationStatus.SENDING,
        retryCount: 0,
        maxRetries: 3,
      });

      notification.markAsFailed('Timeout');
      const events = notification.domainEvents;
      const failedEvent = events.find(
        (e): e is NotificationFailedEvent =>
          e instanceof NotificationFailedEvent,
      );
      expect(failedEvent).toBeDefined();
      expect(failedEvent!.reason).toBe('Timeout');
      expect(failedEvent!.willRetry).toBe(true);
    });

    it('should fail from DELIVERED status', () => {
      const notification = createReconstituted({
        status: NotificationStatus.DELIVERED,
      });
      const result = notification.markAsFailed('Late bounce');
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // incrementRetry()
  // ============================================

  describe('incrementRetry()', () => {
    it('should increment retryCount and reset to PENDING', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 0,
        maxRetries: 3,
        failureReason: 'Timeout',
      });

      const result = notification.incrementRetry();
      expect(result.isSuccess).toBe(true);
      expect(notification.retryCount).toBe(1);
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(notification.failureReason).toBeNull();
    });

    it('should set scheduledFor based on retry interval', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 0,
        maxRetries: 3,
      });

      const before = Date.now();
      notification.incrementRetry();

      // First retry: 5 minutes
      const expectedMin = before + 5 * 60 * 1000 - 1000;
      expect(notification.scheduledFor!.getTime()).toBeGreaterThanOrEqual(
        expectedMin,
      );
    });

    it('should use exponential backoff intervals', () => {
      // Retry 1: 5min, Retry 2: 30min, Retry 3: 2h
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 1,
        maxRetries: 3,
      });

      const before = Date.now();
      notification.incrementRetry();

      // Second retry: 30 minutes
      const expectedMin = before + 30 * 60 * 1000 - 1000;
      expect(notification.scheduledFor!.getTime()).toBeGreaterThanOrEqual(
        expectedMin,
      );
    });

    it('should emit NotificationRetryingEvent', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 0,
        maxRetries: 3,
      });

      notification.incrementRetry();
      const events = notification.domainEvents;
      const retryEvent = events.find(
        (e): e is NotificationRetryingEvent =>
          e instanceof NotificationRetryingEvent,
      );
      expect(retryEvent).toBeDefined();
      expect(retryEvent!.retryCount).toBe(1);
      expect(retryEvent!.nextRetryAt).toBeDefined();
    });

    it('should fail when max retries exceeded', () => {
      const notification = createReconstituted({
        status: NotificationStatus.FAILED,
        retryCount: 3,
        maxRetries: 3,
      });

      const result = notification.incrementRetry();
      expect(result.isFailure).toBe(true);
      expect(result.error).toBeInstanceOf(MaxRetriesExceededException);
    });

    it('should fail when not in FAILED status (canRetry false)', () => {
      const notification = createReconstituted({
        status: NotificationStatus.PENDING,
        retryCount: 0,
        maxRetries: 3,
      });

      const result = notification.incrementRetry();
      expect(result.isFailure).toBe(true);
    });
  });

  // ============================================
  // clone()
  // ============================================

  describe('clone()', () => {
    it('should create an independent copy', () => {
      const notification = createNotification();
      const clone = notification.clone();

      expect(clone.id).toBe(notification.id);
      expect(clone.userId).toBe(notification.userId);
      expect(clone.status).toBe(notification.status);
      expect(clone).not.toBe(notification);
    });
  });

  // ============================================
  // Full Lifecycle
  // ============================================

  describe('Full Lifecycle', () => {
    it('should support full PENDING → SENDING → SENT → DELIVERED flow', () => {
      const notification = createNotification();
      expect(notification.status).toBe(NotificationStatus.PENDING);

      expect(notification.markAsSending().isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.SENDING);

      expect(notification.markAsSent('msg-001').isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.SENT);

      expect(notification.markAsDelivered().isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.DELIVERED);
    });

    it('should support PENDING → SENDING → FAILED → PENDING (retry) flow', () => {
      const notification = createNotification();

      expect(notification.markAsSending().isSuccess).toBe(true);
      expect(notification.markAsFailed('Timeout').isSuccess).toBe(true);
      expect(notification.incrementRetry().isSuccess).toBe(true);
      expect(notification.status).toBe(NotificationStatus.PENDING);
      expect(notification.retryCount).toBe(1);
    });
  });
});
