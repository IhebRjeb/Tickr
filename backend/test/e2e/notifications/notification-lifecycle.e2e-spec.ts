/**
 * @file Notification Send & Lifecycle E2E Tests
 * @description POST /notifications — send, rate limit, schedule, preferences opt-out
 */

import { SendNotificationHandler } from '@modules/notifications/application/commands/send-notification/send-notification.handler';
import { UpdatePreferencesHandler } from '@modules/notifications/application/commands/update-preferences/update-preferences.handler';
import { UnsubscribeHandler } from '@modules/notifications/application/commands/unsubscribe/unsubscribe.handler';
import { EMAIL_PROVIDER } from '@modules/notifications/application/ports/email-provider.port';
import { NOTIFICATION_PREFERENCE_REPOSITORY } from '@modules/notifications/application/ports/notification-preference.repository.port';
import { NOTIFICATION_TEMPLATE_REPOSITORY } from '@modules/notifications/application/ports/notification-template.repository.port';
import { NOTIFICATION_REPOSITORY } from '@modules/notifications/application/ports/notification.repository.port';
import { RATE_LIMITER } from '@modules/notifications/application/ports/rate-limiter.port';
import { SMS_PROVIDER } from '@modules/notifications/application/ports/sms-provider.port';
import { TEMPLATE_RENDERER } from '@modules/notifications/application/ports/template-renderer.port';
import { NotificationMapper } from '@modules/notifications/application/mappers/notification.mapper';
import { GetNotificationByIdHandler } from '@modules/notifications/application/queries/get-notification-by-id/get-notification-by-id.handler';
import { GetUserNotificationsHandler } from '@modules/notifications/application/queries/get-user-notifications/get-user-notifications.handler';
import { GetUserPreferencesHandler } from '@modules/notifications/application/queries/get-user-preferences/get-user-preferences.handler';
import { NotificationsController } from '@modules/notifications/infrastructure/controllers/notifications.controller';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { DomainEventPublisher } from '@shared/infrastructure/events/domain-event.publisher';
import request from 'supertest';

import {
  InMemoryNotificationRepository,
  InMemoryNotificationPreferenceRepository,
  InMemoryNotificationTemplateRepository,
  MockEmailProvider,
  MockSmsProvider,
  MockTemplateRenderer,
  MockRateLimiter,
  MockDomainEventPublisher,
  TEST_USER_IDS,
  generateTestToken,
} from './helpers/test-setup';

describe('Notification Lifecycle E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let notificationRepo: InMemoryNotificationRepository;
  let preferenceRepo: InMemoryNotificationPreferenceRepository;
  let templateRepo: InMemoryNotificationTemplateRepository;
  let emailProvider: MockEmailProvider;
  let smsProvider: MockSmsProvider;
  let rateLimiter: MockRateLimiter;
  let userToken: string;

  beforeAll(async () => {
    notificationRepo = new InMemoryNotificationRepository();
    preferenceRepo = new InMemoryNotificationPreferenceRepository();
    templateRepo = new InMemoryNotificationTemplateRepository();
    emailProvider = new MockEmailProvider();
    smsProvider = new MockSmsProvider();
    rateLimiter = new MockRateLimiter();
    const templateRenderer = new MockTemplateRenderer();
    const eventPublisher = new MockDomainEventPublisher();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [NotificationsController],
      providers: [
        { provide: NOTIFICATION_REPOSITORY, useValue: notificationRepo },
        { provide: NOTIFICATION_PREFERENCE_REPOSITORY, useValue: preferenceRepo },
        { provide: NOTIFICATION_TEMPLATE_REPOSITORY, useValue: templateRepo },
        { provide: EMAIL_PROVIDER, useValue: emailProvider },
        { provide: SMS_PROVIDER, useValue: smsProvider },
        { provide: TEMPLATE_RENDERER, useValue: templateRenderer },
        { provide: RATE_LIMITER, useValue: rateLimiter },
        { provide: DomainEventPublisher, useValue: eventPublisher },
        JwtAuthGuard,
        SendNotificationHandler,
        UpdatePreferencesHandler,
        UnsubscribeHandler,
        GetNotificationByIdHandler,
        GetUserNotificationsHandler,
        GetUserPreferencesHandler,
        NotificationMapper,
      ],
    }).compile();

    app = module.createNestApplication();

    jwtService = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtService.verify(authHeader.substring(7));
          req.user = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
          };
        } catch {
          /* leave req.user undefined */
        }
      }
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );

    await app.init();

    userToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.user1,
      email: 'user1@tickr.tn',
      role: 'USER',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    notificationRepo.clear();
    preferenceRepo.clear();
    templateRepo.clear();
    emailProvider.clear();
    smsProvider.clear();
    rateLimiter.clear();
  });

  // ============================================
  // POST /notifications — Send Notification
  // ============================================

  describe('POST /notifications', () => {
    it('should send an email notification with direct content', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          subject: 'Ticket Confirmed',
          content: '<p>Your ticket is confirmed!</p>',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.notificationId).toBeDefined();
      expect(response.body.status).toBeDefined();

      // Verify notification was stored
      const stored = notificationRepo.getAll();
      expect(stored).toHaveLength(1);
    });

    it('should send an email notification using template', async () => {
      templateRepo.seedTemplate('welcome');

      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          templateSlug: 'welcome',
          templateData: { name: 'John' },
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.notificationId).toBeDefined();
    });

    it('should send an SMS notification', async () => {
      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'SMS',
          recipientPhone: '+21612345678',
          content: 'Your code is 1234',
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.notificationId).toBeDefined();
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/notifications')
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          content: 'test',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject when rate limited', async () => {
      rateLimiter.setAllowed(false);

      const response = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          subject: 'Test',
          content: '<p>Hello</p>',
        })
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toMatch(/rate/i);
    });
  });

  // ============================================
  // GET /notifications/me — My Notifications
  // ============================================

  describe('GET /notifications/me', () => {
    it('should return empty list for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toEqual([]);
      expect(response.body.total).toBe(0);
    });

    it('should return user notifications after sending', async () => {
      // Send a notification first
      await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          subject: 'Test',
          content: '<p>Hello</p>',
        })
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .get('/notifications/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      expect(response.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .get('/notifications/me')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================
  // GET /notifications/:id — Get Notification by ID
  // ============================================

  describe('GET /notifications/:id', () => {
    it('should return notification by ID', async () => {
      // Send first
      const sendRes = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          subject: 'Test',
          content: '<p>Hello</p>',
        })
        .expect(HttpStatus.CREATED);

      const notificationId = sendRes.body.notificationId;

      const response = await request(app.getHttpServer())
        .get(`/notifications/${notificationId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(notificationId);
      expect(response.body.userId).toBe(TEST_USER_IDS.user1);
    });

    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer())
        .get('/notifications/00000000-0000-4000-8000-000000000099')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 404 when accessing another user notification', async () => {
      // user1 sends notification
      const sendRes = await request(app.getHttpServer())
        .post('/notifications')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          userId: TEST_USER_IDS.user1,
          type: 'TRANSACTIONAL',
          channel: 'EMAIL',
          recipientEmail: 'user1@tickr.tn',
          subject: 'Test',
          content: '<p>Hello</p>',
        })
        .expect(HttpStatus.CREATED);

      // user2 tries to access
      const user2Token = generateTestToken(jwtService, {
        userId: TEST_USER_IDS.user2,
        email: 'user2@tickr.tn',
        role: 'USER',
      });

      await request(app.getHttpServer())
        .get(`/notifications/${sendRes.body.notificationId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // Preferences Endpoints
  // ============================================

  describe('GET /notifications/preferences/me', () => {
    it('should return default preferences for new user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/preferences/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.userId).toBe(TEST_USER_IDS.user1);
      expect(response.body.emailEnabled).toBe(true);
      expect(response.body.smsEnabled).toBe(true);
    });
  });

  describe('PUT /notifications/preferences/me', () => {
    it('should update notification preferences', async () => {
      // Create initial preferences first
      await request(app.getHttpServer())
        .get('/notifications/preferences/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(HttpStatus.OK);

      const response = await request(app.getHttpServer())
        .put('/notifications/preferences/me')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          emailEnabled: true,
          smsEnabled: false,
          marketingEnabled: false,
          eventRemindersEnabled: true,
        })
        .expect(HttpStatus.OK);

      expect(response.body.smsEnabled).toBe(false);
      expect(response.body.marketingEnabled).toBe(false);
    });
  });

  // ============================================
  // Unsubscribe Endpoint (Public)
  // ============================================

  describe('GET /notifications/unsubscribe/:token/:category', () => {
    it('should return 400 for invalid category', async () => {
      await request(app.getHttpServer())
        .get('/notifications/unsubscribe/some-token/invalid_category')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should return 400 for invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications/unsubscribe/invalid-token/marketing')
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toMatch(/invalid|token/i);
    });
  });
});
