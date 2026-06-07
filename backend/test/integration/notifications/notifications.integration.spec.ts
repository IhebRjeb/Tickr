/**
 * @file Notifications Integration Tests
 * @description Tests: handler + repository interaction at application layer level
 *              using in-memory repos (no real DB).
 */

import { SendNotificationCommand } from '@modules/notifications/application/commands/send-notification/send-notification.command';
import { SendNotificationHandler } from '@modules/notifications/application/commands/send-notification/send-notification.handler';
import { UpdatePreferencesCommand } from '@modules/notifications/application/commands/update-preferences/update-preferences.command';
import { UpdatePreferencesHandler } from '@modules/notifications/application/commands/update-preferences/update-preferences.handler';
import { GetNotificationByIdHandler } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetNotificationByIdQuery } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.query';
import { GetUserNotificationsHandler } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserNotificationsQuery } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.query';
import { NotificationChannel } from '@modules/notifications/domain/value-objects/notification-channel.vo';
import { NotificationType } from '@modules/notifications/domain/value-objects/notification-type.vo';

import {
  InMemoryNotificationRepository,
  InMemoryNotificationPreferenceRepository,
  MockEmailProvider,
  MockSmsProvider,
  MockTemplateRenderer,
  MockRateLimiter,
  MockDomainEventPublisher,
  TEST_USER_IDS,
} from '../../e2e/notifications/helpers/test-setup';

describe('Notifications Integration', () => {
  let sendHandler: SendNotificationHandler;
  let updatePrefsHandler: UpdatePreferencesHandler;
  let getNotificationsHandler: GetUserNotificationsHandler;
  let getByIdHandler: GetNotificationByIdHandler;
  let notificationRepo: InMemoryNotificationRepository;
  let preferenceRepo: InMemoryNotificationPreferenceRepository;
  let emailProvider: MockEmailProvider;
  let smsProvider: MockSmsProvider;
  let rateLimiter: MockRateLimiter;
  let eventPublisher: MockDomainEventPublisher;

  beforeEach(() => {
    notificationRepo = new InMemoryNotificationRepository();
    preferenceRepo = new InMemoryNotificationPreferenceRepository();
    emailProvider = new MockEmailProvider();
    smsProvider = new MockSmsProvider();
    rateLimiter = new MockRateLimiter();
    const templateRenderer = new MockTemplateRenderer();
    eventPublisher = new MockDomainEventPublisher();

    sendHandler = new SendNotificationHandler(
      notificationRepo,
      preferenceRepo,
      emailProvider,
      smsProvider,
      templateRenderer,
      rateLimiter,
      eventPublisher as any,
    );

    updatePrefsHandler = new UpdatePreferencesHandler(
      preferenceRepo,
      eventPublisher as any,
    );

    getNotificationsHandler = new GetUserNotificationsHandler(
      notificationRepo,
    );

    getByIdHandler = new GetNotificationByIdHandler(
      notificationRepo,
    );
  });

  describe('Send → Query roundtrip', () => {
    it('should send notification and query it back', async () => {
      const command = new SendNotificationCommand(
        TEST_USER_IDS.user1,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'user@tickr.tn' },
        'Test Subject',
        '<p>Hello</p>',
        null,
        {},
        null,
        null,
        {},
      );

      const sendResult = await sendHandler.execute(command);
      expect(sendResult.isSuccess).toBe(true);

      // Query back by user
      const queryResult = await getNotificationsHandler.execute(
        new GetUserNotificationsQuery(TEST_USER_IDS.user1, 1, 10),
      );
      expect(queryResult.isSuccess).toBe(true);
      expect(queryResult.value.data).toHaveLength(1);
      expect(queryResult.value.data[0].id).toBe(
        sendResult.value.notificationId,
      );
    });

    it('should send notification and retrieve by ID', async () => {
      const command = new SendNotificationCommand(
        TEST_USER_IDS.user1,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'user@tickr.tn' },
        'Subject',
        '<p>Content</p>',
        null,
        {},
        null,
        null,
        {},
      );

      const sendResult = await sendHandler.execute(command);
      expect(sendResult.isSuccess).toBe(true);

      const getResult = await getByIdHandler.execute(
        new GetNotificationByIdQuery(
          sendResult.value.notificationId,
          TEST_USER_IDS.user1,
        ),
      );

      expect(getResult.isSuccess).toBe(true);
      expect(getResult.value.userId).toBe(TEST_USER_IDS.user1);
    });

    it('should NOT allow other user to retrieve notification', async () => {
      const command = new SendNotificationCommand(
        TEST_USER_IDS.user1,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'user@tickr.tn' },
        'Subject',
        '<p>Content</p>',
        null,
        {},
        null,
        null,
        {},
      );

      const sendResult = await sendHandler.execute(command);

      const getResult = await getByIdHandler.execute(
        new GetNotificationByIdQuery(
          sendResult.value.notificationId,
          TEST_USER_IDS.user2,
        ),
      );

      expect(getResult.isFailure).toBe(true);
    });
  });

  describe('Send multiple → paginated list', () => {
    it('should return paginated results', async () => {
      // Send 3 notifications
      for (let i = 0; i < 3; i++) {
        await sendHandler.execute(
          new SendNotificationCommand(
            TEST_USER_IDS.user1,
            NotificationType.ORDER_CONFIRMATION,
            NotificationChannel.EMAIL,
            { email: 'user@tickr.tn' },
            `Subject ${i}`,
            `<p>Content ${i}</p>`,
            null,
            {},
            null,
            null,
            {},
          ),
        );
      }

      // Page 1 with limit 2
      const page1 = await getNotificationsHandler.execute(
        new GetUserNotificationsQuery(TEST_USER_IDS.user1, 1, 2),
      );
      expect(page1.value.data).toHaveLength(2);
      expect(page1.value.total).toBe(3);

      // Page 2
      const page2 = await getNotificationsHandler.execute(
        new GetUserNotificationsQuery(TEST_USER_IDS.user1, 2, 2),
      );
      expect(page2.value.data).toHaveLength(1);
    });
  });

  describe('Preferences → Send interaction', () => {
    it('should create default preferences when queried during send', async () => {
      // First send creates default preferences internally
      const command = new SendNotificationCommand(
        TEST_USER_IDS.user1,
        NotificationType.ORDER_CONFIRMATION,
        NotificationChannel.EMAIL,
        { email: 'user@tickr.tn' },
        'Subject',
        '<p>Content</p>',
        null,
        {},
        null,
        null,
        {},
      );

      const result = await sendHandler.execute(command);
      expect(result.isSuccess).toBe(true);
    });

    it('should block marketing email when user opts out', async () => {
      // First create preferences via send (auto-created)
      await sendHandler.execute(
        new SendNotificationCommand(
          TEST_USER_IDS.user1,
          NotificationType.ORDER_CONFIRMATION,
          NotificationChannel.EMAIL,
          { email: 'user@tickr.tn' },
          'Subject',
          '<p>Content</p>',
          null,
          {},
          null,
          null,
          {},
        ),
      );

      // Update preferences to disable marketing
      await updatePrefsHandler.execute(
        new UpdatePreferencesCommand(
          TEST_USER_IDS.user1,
          true,
          true,
          false,
          true,
        ),
      );

      // Try to send marketing notification
      const result = await sendHandler.execute(
        new SendNotificationCommand(
          TEST_USER_IDS.user1,
          NotificationType.MARKETING_PROMO,
          NotificationChannel.EMAIL,
          { email: 'user@tickr.tn' },
          'Promo',
          '<p>Buy now!</p>',
          null,
          {},
          null,
          null,
          {},
        ),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('USER_OPTED_OUT');
    });
  });

  describe('Rate limiting', () => {
    it('should block send when rate limiter denies', async () => {
      rateLimiter.setAllowed(false);

      const result = await sendHandler.execute(
        new SendNotificationCommand(
          TEST_USER_IDS.user1,
          NotificationType.ORDER_CONFIRMATION,
          NotificationChannel.EMAIL,
          { email: 'user@tickr.tn' },
          'Subject',
          '<p>Content</p>',
          null,
          {},
          null,
          null,
          {},
        ),
      );

      expect(result.isFailure).toBe(true);
      expect(result.error.type).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('SMS channel', () => {
    it('should send via SMS provider', async () => {
      const result = await sendHandler.execute(
        new SendNotificationCommand(
          TEST_USER_IDS.user1,
          NotificationType.ORDER_CONFIRMATION,
          NotificationChannel.SMS,
          { phone: '+21612345678' },
          null,
          'Your code is 1234',
          null,
          {},
          null,
          null,
          {},
        ),
      );

      expect(result.isSuccess).toBe(true);
      expect(smsProvider.getSentSms()).toHaveLength(1);
      expect(smsProvider.getSentSms()[0].phoneNumber).toBe('+21612345678');
    });
  });
});
