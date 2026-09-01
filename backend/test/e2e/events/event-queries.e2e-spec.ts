import { INestApplication, ValidationPipe, HttpStatus } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import {
  CreateEventHandler,
  UpdateEventHandler,
  PublishEventHandler,
  CancelEventHandler,
  AddTicketTypeHandler,
  UpdateTicketTypeHandler,
  RemoveTicketTypeHandler,
  CompleteEventHandler,
  UploadEventImageHandler,
  SetEventCommissionOverrideHandler,
  GetEventByIdHandler,
  GetPublishedEventsHandler,
  GetEventsByCategoryHandler,
  GetOrganizerEventsHandler,
  GetUpcomingEventsHandler,
  SearchEventsHandler,
} from '../../../src/modules/events/application';
import { EVENT_REPOSITORY } from '../../../src/modules/events/application/ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../../src/modules/events/application/ports/user-validation.service.port';
import { EventCategory } from '../../../src/modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '../../../src/modules/events/domain/value-objects/event-status.vo';
import { EventsController } from '../../../src/modules/events/infrastructure/controllers/events.controller';
import { IsEventOwnerGuard } from '../../../src/modules/events/infrastructure/guards/is-event-owner.guard';
import { EventMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { S3StorageService } from '../../../src/modules/events/infrastructure/services/s3-storage.service';
import { JwtStrategy } from '../../../src/modules/users/infrastructure/strategies/jwt.strategy';
import { DOMAIN_EVENT_PUBLISHER } from '../../../src/shared/application/interfaces/domain-event-publisher.port';
import { JwtAuthGuard } from '../../../src/shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/shared/infrastructure/common/guards/roles.guard';

import {
  InMemoryEventRepository,
  MockDomainEventPublisher,
  createMockUserValidationService,
  createMockS3Service,
  futureDate,
  TEST_ORGANIZER_ID,
  TEST_EVENT_IDS,
} from './helpers/test-setup';

const JWT_SECRET = 'e2e-test-secret-key-for-events-queries-32-chars';

/**
 * E2E Test Suite: Event Queries
 *
 * Tests all public query endpoints:
 * - GET /api/events          — Published events with filters
 * - GET /api/events/search   — Search by title
 * - GET /api/events/category/:category — Filter by category
 * - GET /api/events/upcoming — Upcoming events
 */
describe('E2E: Event Queries', () => {
  let app: INestApplication<App>;
  let eventRepository: InMemoryEventRepository;
  let domainEventPublisher: MockDomainEventPublisher;

  const organizerId = TEST_ORGANIZER_ID;

  beforeAll(async () => {
    eventRepository = new InMemoryEventRepository();
    domainEventPublisher = new MockDomainEventPublisher();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ JWT_SECRET })],
        }),
        CqrsModule,
        JwtModule.register({
          secret: JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
        ScheduleModule.forRoot(),
      ],
      controllers: [EventsController],
      providers: [
        EventMapper,
        TicketTypeMapper,
        { provide: EVENT_REPOSITORY, useValue: eventRepository },
        { provide: USER_VALIDATION_SERVICE, useValue: createMockUserValidationService() },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: domainEventPublisher },
        { provide: S3StorageService, useValue: createMockS3Service() },
        JwtAuthGuard,
        JwtStrategy,
        RolesGuard,
        IsEventOwnerGuard,
        CreateEventHandler,
        UpdateEventHandler,
        PublishEventHandler,
        CancelEventHandler,
        AddTicketTypeHandler,
        UpdateTicketTypeHandler,
        RemoveTicketTypeHandler,
        CompleteEventHandler,
        UploadEventImageHandler,
        SetEventCommissionOverrideHandler,
        GetEventByIdHandler,
        GetPublishedEventsHandler,
        GetEventsByCategoryHandler,
        GetOrganizerEventsHandler,
        GetUpcomingEventsHandler,
        SearchEventsHandler,
      ],
    }).compile();

    app = module.createNestApplication();

    // Apply JWT middleware
    const jwtService = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtService.verify(authHeader.substring(7));
          req.user = {
            userId: payload.userId ?? payload.sub,
            email: payload.email,
            role: payload.role,
          };
        } catch { /* noop */ }
      }
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    eventRepository.clear();
    domainEventPublisher.clear();
  });

  // ============================================
  // Seed Helpers
  // ============================================

  const seedPublishedEvents = async () => {
    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.concert1,
      title: 'Amazing Rock Festival',
      status: EventStatus.PUBLISHED,
      category: EventCategory.CONCERT,
      organizerId,
      startDate: futureDate(24),
      endDate: futureDate(28),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
      publishedAt: new Date(),
    });

    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.concert2,
      title: 'Jazz Night',
      status: EventStatus.PUBLISHED,
      category: EventCategory.CONCERT,
      organizerId,
      startDate: futureDate(48),
      endDate: futureDate(52),
      location: { city: 'Paris', country: 'France' },
      ticketTypes: [],
      publishedAt: new Date(),
    });

    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.conference1,
      title: 'Tech Conference 2026',
      status: EventStatus.PUBLISHED,
      category: EventCategory.CONFERENCE,
      organizerId,
      startDate: futureDate(72),
      endDate: futureDate(76),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
      publishedAt: new Date(),
    });

    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.sport1,
      title: 'Marathon Tunis',
      status: EventStatus.PUBLISHED,
      category: EventCategory.SPORT,
      organizerId,
      startDate: futureDate(96),
      endDate: futureDate(100),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
      publishedAt: new Date(),
    });

    // Draft event — should NOT appear in public queries
    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.draft1,
      title: 'Unpublished Draft',
      status: EventStatus.DRAFT,
      category: EventCategory.CONCERT,
      organizerId,
      startDate: futureDate(120),
      endDate: futureDate(124),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
    });

    // Cancelled event — should NOT appear in public queries
    await eventRepository.seedEvent({
      id: TEST_EVENT_IDS.cancelled1,
      title: 'Cancelled Concert',
      status: EventStatus.CANCELLED,
      category: EventCategory.CONCERT,
      organizerId,
      startDate: futureDate(144),
      endDate: futureDate(148),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
      cancelledAt: new Date(),
      cancellationReason: 'Test cancellation',
    });
  };

  // ============================================
  // GET /api/events — Published Events
  // ============================================

  describe('GET /api/events — Get Published Events', () => {
    beforeEach(async () => {
      await seedPublishedEvents();
    });

    it('should return only published events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(4);
      expect(
        response.body.data.every((e: any) => e.status === 'PUBLISHED'),
      ).toBe(true);
    });

    it('should not include draft events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .expect(HttpStatus.OK);

      const titles = response.body.data.map((e: any) => e.title);
      expect(titles).not.toContain('Unpublished Draft');
    });

    it('should not include cancelled events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .expect(HttpStatus.OK);

      const titles = response.body.data.map((e: any) => e.title);
      expect(titles).not.toContain('Cancelled Concert');
    });

    it('should support pagination with page and limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .query({ page: 1, limit: 2 })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBe(4);
    });

    it('should return page 2 with correct items', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .query({ page: 2, limit: 2 })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.page).toBe(2);
    });

    it('should be accessible without authentication (public endpoint)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // GET /api/events/search — Search Events
  // ============================================

  describe('GET /api/events/search — Search Events', () => {
    beforeEach(async () => {
      await seedPublishedEvents();
    });

    it('should find events matching search term', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'Rock' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Rock');
    });

    it('should find events with case-insensitive search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'jazz' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Jazz');
    });

    it('should return empty for non-matching search', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'Classical Piano' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
    });

    it('should reject search without query parameter', async () => {
      await request(app.getHttpServer())
        .get('/api/events/search')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject search with empty query', async () => {
      await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: '' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject search with whitespace-only query', async () => {
      await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: '   ' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should only search published events (not drafts)', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'Unpublished' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'Festival' })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });

    it('should support pagination for search results', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/search')
        .query({ q: 'az', page: 1, limit: 1 })
        .expect(HttpStatus.OK);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });
  });

  // ============================================
  // GET /api/events/category/:category — Events by Category
  // ============================================

  describe('GET /api/events/category/:category — Events By Category', () => {
    beforeEach(async () => {
      await seedPublishedEvents();
    });

    it('should return events for CONCERT category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/CONCERT')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.every((e: any) => e.category === 'CONCERT'),
      ).toBe(true);
    });

    it('should return events for CONFERENCE category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/CONFERENCE')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('CONFERENCE');
    });

    it('should return events for SPORT category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/SPORT')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('SPORT');
    });

    it('should return empty list for category with no events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/THEATER')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
    });

    it('should handle case-insensitive category', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/concert')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
    });

    it('should reject invalid category', async () => {
      await request(app.getHttpServer())
        .get('/api/events/category/INVALID_CATEGORY')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/CONCERT')
        .query({ page: 1, limit: 1 })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(2);
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/category/CONCERT')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });
  });

  // ============================================
  // GET /api/events/upcoming — Upcoming Events
  // ============================================

  describe('GET /api/events/upcoming — Upcoming Events', () => {
    beforeEach(async () => {
      await seedPublishedEvents();
    });

    it('should return only future published events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/upcoming')
        .expect(HttpStatus.OK);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(
        response.body.data.every((e: any) => e.status === 'PUBLISHED'),
      ).toBe(true);
    });

    it('should not include past events', async () => {
      // Seed a past event
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.pastEvent,
        title: 'Past Concert',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONCERT,
        organizerId,
        startDate: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
        endDate: new Date(Date.now() - 44 * 60 * 60 * 1000),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        publishedAt: new Date(Date.now() - 96 * 60 * 60 * 1000),
      });

      const response = await request(app.getHttpServer())
        .get('/api/events/upcoming')
        .expect(HttpStatus.OK);

      const ids = response.body.data.map((e: any) => e.id);
      expect(ids).not.toContain(TEST_EVENT_IDS.pastEvent);
    });

    it('should not include draft events', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/upcoming')
        .expect(HttpStatus.OK);

      const titles = response.body.data.map((e: any) => e.title);
      expect(titles).not.toContain('Unpublished Draft');
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/upcoming')
        .query({ page: 1, limit: 2 })
        .expect(HttpStatus.OK);

      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should be accessible without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/events/upcoming')
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('data');
    });
  });
});
