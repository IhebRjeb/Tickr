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
  GetEventByIdHandler,
  GetPublishedEventsHandler,
  GetEventsByCategoryHandler,
  GetOrganizerEventsHandler,
  GetUpcomingEventsHandler,
  SearchEventsHandler,
} from '../../../src/modules/events/application';
import { EVENT_REPOSITORY } from '../../../src/modules/events/application/ports/event.repository.port';
import { USER_VALIDATION_SERVICE } from '../../../src/modules/events/application/ports/user-validation.service.port';
import { Currency } from '../../../src/modules/events/domain/value-objects/currency.vo';
import { EventCategory } from '../../../src/modules/events/domain/value-objects/event-category.vo';
import { EventStatus } from '../../../src/modules/events/domain/value-objects/event-status.vo';
import { EventsController } from '../../../src/modules/events/infrastructure/controllers/events.controller';
import { IsEventOwnerGuard } from '../../../src/modules/events/infrastructure/guards/is-event-owner.guard';
import { EventMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { S3StorageService } from '../../../src/modules/events/infrastructure/services/s3-storage.service';
import { DOMAIN_EVENT_PUBLISHER } from '../../../src/shared/application/interfaces/domain-event-publisher.port';
import { JwtAuthGuard } from '../../../src/shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../src/shared/infrastructure/common/guards/roles.guard';

import {
  InMemoryEventRepository,
  MockDomainEventPublisher,
  createMockUserValidationService,
  createMockS3Service,
  createTestEventDto,
  createTestTicketTypeDto,
  futureDate,
  generateTestToken,
  TEST_ORGANIZER_ID,
  TEST_OTHER_ORGANIZER_ID,
  TEST_PARTICIPANT_ID,
  TEST_ADMIN_ID,
  TEST_NO_EVENTS_ORGANIZER_ID,
  TEST_EVENT_IDS,
  TEST_TICKET_IDS,
} from './helpers/test-setup';

const JWT_SECRET = 'e2e-test-secret-key-for-events-module-32-chars';

/**
 * E2E Test Suite: Event Lifecycle
 *
 * Tests the full event lifecycle including:
 * - Event creation (POST /api/events)
 * - Event retrieval (GET /api/events/:id)
 * - Event update (PUT /api/events/:id)
 * - Event publishing (POST /api/events/:id/publish)
 * - Event cancellation (DELETE /api/events/:id)
 * - Authentication & authorization enforcement
 * - Ownership validation
 */
describe('E2E: Event Lifecycle', () => {
  let app: INestApplication<App>;
  let eventRepository: InMemoryEventRepository;
  let domainEventPublisher: MockDomainEventPublisher;
  let mockUserValidation: ReturnType<typeof createMockUserValidationService>;
  let jwtService: JwtService;
  let organizerToken: string;
  let otherOrganizerToken: string;
  let participantToken: string;
  let adminToken: string;

  const organizerId = TEST_ORGANIZER_ID;
  const otherOrganizerId = TEST_OTHER_ORGANIZER_ID;
  const participantId = TEST_PARTICIPANT_ID;
  const adminId = TEST_ADMIN_ID;

  beforeAll(async () => {
    eventRepository = new InMemoryEventRepository();
    domainEventPublisher = new MockDomainEventPublisher();
    mockUserValidation = createMockUserValidationService();

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
        // Mappers
        EventMapper,
        TicketTypeMapper,

        // Repository
        { provide: EVENT_REPOSITORY, useValue: eventRepository },

        // User Validation Service
        { provide: USER_VALIDATION_SERVICE, useValue: mockUserValidation },

        // Domain Event Publisher
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: domainEventPublisher },

        // S3 Storage Service
        { provide: S3StorageService, useValue: createMockS3Service() },

        // Guards
        JwtAuthGuard,
        RolesGuard,
        IsEventOwnerGuard,

        // Command Handlers
        CreateEventHandler,
        UpdateEventHandler,
        PublishEventHandler,
        CancelEventHandler,
        AddTicketTypeHandler,
        UpdateTicketTypeHandler,
        RemoveTicketTypeHandler,
        CompleteEventHandler,
        UploadEventImageHandler,

        // Query Handlers
        GetEventByIdHandler,
        GetPublishedEventsHandler,
        GetEventsByCategoryHandler,
        GetOrganizerEventsHandler,
        GetUpcomingEventsHandler,
        SearchEventsHandler,
      ],
    }).compile();

    app = module.createNestApplication();

    // Apply JWT middleware to populate request.user from Bearer token
    const jwtSvc = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtSvc.verify(authHeader.substring(7));
          req.user = {
            userId: payload.sub,
            email: payload.email,
            role: payload.role,
          };
        } catch {
          // leave request.user undefined
        }
      }
      next();
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.setGlobalPrefix('api');

    jwtService = module.get<JwtService>(JwtService);

    // Generate test tokens
    organizerToken = generateTestToken(jwtService, {
      sub: organizerId,
      email: 'organizer@test.com',
      role: 'ORGANIZER',
    });

    otherOrganizerToken = generateTestToken(jwtService, {
      sub: otherOrganizerId,
      email: 'other-organizer@test.com',
      role: 'ORGANIZER',
    });

    participantToken = generateTestToken(jwtService, {
      sub: participantId,
      email: 'participant@test.com',
      role: 'PARTICIPANT',
    });

    adminToken = generateTestToken(jwtService, {
      sub: adminId,
      email: 'admin@test.com',
      role: 'ADMIN',
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    eventRepository.clear();
    domainEventPublisher.clear();
    jest.clearAllMocks();

    // Reset mock to default behavior
    mockUserValidation.validateOrganizer.mockResolvedValue({
      exists: true,
      isActive: true,
      isOrganizer: true,
      firstName: 'Test',
      lastName: 'Organizer',
    });
  });

  // ============================================
  // Event Creation
  // ============================================

  describe('POST /api/events — Create Event', () => {
    it('should create an event successfully with valid data', async () => {
      const dto = createTestEventDto();

      const response = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('eventId');
      expect(response.body.status).toBe('DRAFT');
      expect(response.body.message).toBe('Event created successfully');
    });

    it('should persist the created event in the repository', async () => {
      const dto = createTestEventDto({ title: 'Persisted Event' });

      const response = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.CREATED);

      const savedEvent = await eventRepository.findById(response.body.eventId);
      expect(savedEvent).not.toBeNull();
      expect(savedEvent!.title).toBe('Persisted Event');
    });

    it('should reject event creation without authentication', async () => {
      const dto = createTestEventDto();

      await request(app.getHttpServer())
        .post('/api/events')
        .send(dto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject event creation with PARTICIPANT role', async () => {
      const dto = createTestEventDto();

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${participantToken}`)
        .send(dto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject event creation with missing required fields', async () => {
      const invalidDto = { title: 'Only Title' };

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event creation with empty title', async () => {
      const dto = createTestEventDto({ title: '' });

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event with invalid category', async () => {
      const dto = createTestEventDto({ category: 'INVALID_CATEGORY' });

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event with missing location', async () => {
      const dto = createTestEventDto();
      delete (dto as any).location;

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event with invalid date format', async () => {
      const dto = createTestEventDto({ startDate: 'not-a-date' });

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event with invalid JWT token', async () => {
      const dto = createTestEventDto();

      await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .send(dto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================
  // Event Retrieval by ID
  // ============================================

  describe('GET /api/events/:id — Get Event By ID', () => {
    it('should return a published event without authentication', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.published,
        title: 'Public Concert',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        publishedAt: new Date(),
      });

      const response = await request(app.getHttpServer())
        .get(`/api/events/${TEST_EVENT_IDS.published}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(TEST_EVENT_IDS.published);
      expect(response.body.title).toBe('Public Concert');
    });

    it('should return 404 for non-existent event', async () => {
      await request(app.getHttpServer())
        .get('/api/events/00000000-0000-0000-0000-000000000000')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 400 for invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/events/not-a-uuid')
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should allow organizer to view their own draft event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.draftOwn,
        title: 'My Draft Event',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
      });

      const response = await request(app.getHttpServer())
        .get(`/api/events/${TEST_EVENT_IDS.draftOwn}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(TEST_EVENT_IDS.draftOwn);
      expect(response.body.status).toBe('DRAFT');
    });
  });

  // ============================================
  // Event Update
  // ============================================

  describe('PUT /api/events/:id — Update Event', () => {
    let draftEventId: string;

    beforeEach(async () => {
      draftEventId = TEST_EVENT_IDS.draftUpdate;
      await eventRepository.seedEvent({
        id: draftEventId,
        title: 'Original Title',
        description: 'Original description',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '123 St', postalCode: '1000' },
        ticketTypes: [],
      });
    });

    it('should update event title successfully', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/events/${draftEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ title: 'Updated Title' })
        .expect(HttpStatus.OK);

      expect(response.body).toBeDefined();
    });

    it('should reject update without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${draftEventId}`)
        .send({ title: 'Hacked Title' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject update from non-owner organizer', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${draftEventId}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .send({ title: 'Stolen Event' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject update from participant role', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${draftEventId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ title: 'Not Allowed' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject update for non-existent event', async () => {
      await request(app.getHttpServer())
        .put('/api/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ title: 'Ghost Event' })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // Event Publishing
  // ============================================

  describe('POST /api/events/:id/publish — Publish Event', () => {
    let draftEventId: string;

    beforeEach(async () => {
      draftEventId = TEST_EVENT_IDS.toPublish;
      await eventRepository.seedEvent({
        id: draftEventId,
        title: 'Event Ready to Publish',
        description: 'A complete event with ticket types',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '123 Main St', postalCode: '1000' },
        ticketTypes: [
          {
            id: TEST_TICKET_IDS.tkt1,
            name: 'General Admission',
            priceAmount: 50,
            priceCurrency: Currency.TND,
            quantity: 100,
            soldQuantity: 0,
            salesStartDate: futureDate(2),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
      });
    });

    it('should publish a valid draft event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/events/${draftEventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Event published successfully');
    });

    it('should reject publishing without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${draftEventId}/publish`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject publishing by non-owner', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${draftEventId}/publish`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject publishing by participant', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${draftEventId}/publish`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject publishing an event without ticket types', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.noTickets,
        title: 'Event Without Tickets',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '123 St', postalCode: '1000' },
        ticketTypes: [],
      });

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.noTickets}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject publishing a non-existent event', async () => {
      await request(app.getHttpServer())
        .post('/api/events/00000000-0000-0000-0000-000000000000/publish')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // Event Cancellation
  // ============================================

  describe('DELETE /api/events/:id — Cancel Event', () => {
    let publishedEventId: string;

    beforeEach(async () => {
      publishedEventId = TEST_EVENT_IDS.toCancel;
      await eventRepository.seedEvent({
        id: publishedEventId,
        title: 'Event to Cancel',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        publishedAt: new Date(),
      });
    });

    it('should cancel event with a valid reason', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Venue no longer available' })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Event cancelled successfully');
    });

    it('should reject cancellation without reason', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject cancellation without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${publishedEventId}`)
        .send({ reason: 'Unauthorized cancel' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject cancellation by non-owner', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .send({ reason: 'Not my event' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject cancellation by participant role', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${publishedEventId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ reason: 'No access' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject cancellation of non-existent event', async () => {
      await request(app.getHttpServer())
        .delete('/api/events/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Ghost event' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject cancellation of already cancelled event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.alreadyCancelled,
        title: 'Already Cancelled',
        status: EventStatus.CANCELLED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        cancelledAt: new Date(),
        cancellationReason: 'Original reason',
      });

      await request(app.getHttpServer())
        .delete(`/api/events/${TEST_EVENT_IDS.alreadyCancelled}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Cancel again' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // Organizer Events
  // ============================================

  describe('GET /api/events/organizer/:organizerId — Get Organizer Events', () => {
    beforeEach(async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.org1,
        title: 'My Concert',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(24),
        endDate: futureDate(28),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        publishedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.org2,
        title: 'My Draft',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONFERENCE,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Paris', country: 'France' },
        ticketTypes: [],
      });

      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.otherOrg,
        title: 'Other Organizer Event',
        status: EventStatus.PUBLISHED,
        organizerId: otherOrganizerId,
        category: EventCategory.SPORT,
        startDate: futureDate(72),
        endDate: futureDate(76),
        location: { city: 'London', country: 'UK' },
        ticketTypes: [],
        publishedAt: new Date(),
      });
    });

    it('should return organizer own events', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(
        response.body.data.every((e: any) => e.organizer.id === organizerId),
      ).toBe(true);
    });

    it('should reject viewing another organizer events', async () => {
      await request(app.getHttpServer())
        .get(`/api/events/organizer/${otherOrganizerId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject unauthenticated access', async () => {
      await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should filter organizer events by DRAFT status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}?status=DRAFT`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('My Draft');
    });

    it('should filter organizer events by PUBLISHED status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}?status=PUBLISHED`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('My Concert');
    });

    it('should return empty list when filtering by status with no matches', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}?status=CANCELLED`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('should allow admin to view another organizer events', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${otherOrganizerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Other Organizer Event');
    });

    it('should paginate organizer events', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${organizerId}?page=1&limit=1`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.total).toBe(2);
      expect(response.body.hasNextPage).toBe(true);
    });

    it('should return empty list for organizer with no events', async () => {
      const noEventsOrganizerId = TEST_NO_EVENTS_ORGANIZER_ID;
      const noEventsToken = generateTestToken(jwtService, {
        sub: noEventsOrganizerId,
        email: 'no-events@test.com',
        role: 'ORGANIZER',
      });

      const response = await request(app.getHttpServer())
        .get(`/api/events/organizer/${noEventsOrganizerId}`)
        .set('Authorization', `Bearer ${noEventsToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });
  });

  // ============================================
  // State Machine Edge Cases
  // ============================================

  describe('Event State Machine Edge Cases', () => {
    it('should reject publishing an already published event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.alreadyPublished,
        title: 'Already Published Event',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '1 Ave', postalCode: '1000' },
        ticketTypes: [
          {
            id: TEST_TICKET_IDS.tktPub,
            name: 'GA',
            priceAmount: 30,
            priceCurrency: Currency.TND,
            quantity: 50,
            soldQuantity: 0,
            salesStartDate: futureDate(2),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
        publishedAt: new Date(),
      });

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.alreadyPublished}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject publishing a cancelled event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.cancelledPublish,
        title: 'Cancelled Event',
        status: EventStatus.CANCELLED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '1 Ave', postalCode: '1000' },
        ticketTypes: [
          {
            id: TEST_TICKET_IDS.tktCancel,
            name: 'GA',
            priceAmount: 30,
            priceCurrency: Currency.TND,
            quantity: 50,
            soldQuantity: 0,
            salesStartDate: futureDate(2),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
        cancelledAt: new Date(),
        cancellationReason: 'Cancelled for testing',
      });

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.cancelledPublish}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject updating a cancelled event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.cancelledUpdate,
        title: 'Cancelled Event',
        status: EventStatus.CANCELLED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        cancelledAt: new Date(),
        cancellationReason: 'No longer available',
      });

      await request(app.getHttpServer())
        .put(`/api/events/${TEST_EVENT_IDS.cancelledUpdate}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ title: 'Trying to update cancelled event' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject cancelling a draft event without a reason', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.draftCancel,
        title: 'Draft Event',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
      });

      await request(app.getHttpServer())
        .delete(`/api/events/${TEST_EVENT_IDS.draftCancel}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should allow cancelling a draft event with a reason', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.draftCancelOk,
        title: 'Draft Event to Cancel',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
      });

      const response = await request(app.getHttpServer())
        .delete(`/api/events/${TEST_EVENT_IDS.draftCancelOk}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Changed my mind' })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Event cancelled successfully');
    });

    it('should allow limited updates to a published event (title, description)', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.pubUpdate,
        title: 'Published Event',
        description: 'Original description',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '1 Ave', postalCode: '1000' },
        ticketTypes: [
          {
            id: TEST_TICKET_IDS.tktPubUpd,
            name: 'GA',
            priceAmount: 30,
            priceCurrency: Currency.TND,
            quantity: 50,
            soldQuantity: 0,
            salesStartDate: futureDate(2),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
        publishedAt: new Date(),
      });

      await request(app.getHttpServer())
        .put(`/api/events/${TEST_EVENT_IDS.pubUpdate}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ title: 'Updated Title' })
        .expect(HttpStatus.OK);

      const updated = await eventRepository.findById(TEST_EVENT_IDS.pubUpdate);
      expect(updated!.title).toBe('Updated Title');
    });
  });

  // ============================================
  // Full Lifecycle Integration
  // ============================================

  describe('Full Event Lifecycle — Create → Ticket Type → Publish → Cancel', () => {
    it('should complete the full event lifecycle', async () => {
      // Step 1: Create event
      const createRes = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestEventDto())
        .expect(HttpStatus.CREATED);

      const eventId = createRes.body.eventId;
      expect(eventId).toBeDefined();

      // Step 2: Add ticket type
      const ticketRes = await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestTicketTypeDto())
        .expect(HttpStatus.CREATED);

      expect(ticketRes.body).toHaveProperty('ticketTypeId');

      // Step 3: Publish event
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      // Step 4: Cancel event
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Lifecycle test complete' })
        .expect(HttpStatus.OK);
    });
  });
});
