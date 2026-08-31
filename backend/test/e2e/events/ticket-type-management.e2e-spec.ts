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
import { Currency } from '../../../src/modules/events/domain/value-objects/currency.vo';
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
  createTestTicketTypeDto,
  futureDate,
  generateTestToken,
  TEST_ORGANIZER_ID,
  TEST_OTHER_ORGANIZER_ID,
  TEST_PARTICIPANT_ID,
  TEST_EVENT_IDS,
  TEST_TICKET_IDS,
} from './helpers/test-setup';

const JWT_SECRET = 'e2e-test-secret-key-for-ticket-types-32-chars';

/**
 * E2E Test Suite: Ticket Type Management
 *
 * Tests ticket type CRUD operations on events:
 * - POST /api/events/:id/ticket-types        — Add ticket type
 * - PUT /api/events/:id/ticket-types/:typeId  — Update ticket type
 * - DELETE /api/events/:id/ticket-types/:typeId — Remove ticket type
 */
describe('E2E: Ticket Type Management', () => {
  let app: INestApplication<App>;
  let eventRepository: InMemoryEventRepository;
  let domainEventPublisher: MockDomainEventPublisher;
  let mockUserValidation: ReturnType<typeof createMockUserValidationService>;
  let jwtService: JwtService;
  let organizerToken: string;
  let otherOrganizerToken: string;
  let participantToken: string;

  const organizerId = TEST_ORGANIZER_ID;
  const otherOrganizerId = TEST_OTHER_ORGANIZER_ID;
  const participantId = TEST_PARTICIPANT_ID;

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
        EventMapper,
        TicketTypeMapper,
        { provide: EVENT_REPOSITORY, useValue: eventRepository },
        { provide: USER_VALIDATION_SERVICE, useValue: mockUserValidation },
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
    const jwtSvc = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtSvc.verify(authHeader.substring(7));
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

    jwtService = module.get<JwtService>(JwtService);

    organizerToken = generateTestToken(jwtService, {
      sub: organizerId,
      email: 'organizer-ticket@test.com',
      role: 'ORGANIZER',
    });

    otherOrganizerToken = generateTestToken(jwtService, {
      sub: otherOrganizerId,
      email: 'other-ticket-organizer@test.com',
      role: 'ORGANIZER',
    });

    participantToken = generateTestToken(jwtService, {
      sub: participantId,
      email: 'participant-ticket@test.com',
      role: 'PARTICIPANT',
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

    mockUserValidation.validateOrganizer.mockResolvedValue({
      exists: true,
      isActive: true,
      isOrganizer: true,
      firstName: 'Test',
      lastName: 'Organizer',
    });
  });

  // ============================================
  // Helper: Seed draft event
  // ============================================

  const seedDraftEvent = async (id: string, overrides: Record<string, any> = {}) => {
    return eventRepository.seedEvent({
      id,
      title: 'Event for Ticket Types',
      status: EventStatus.DRAFT,
      organizerId,
      category: EventCategory.CONCERT,
      startDate: futureDate(48),
      endDate: futureDate(52),
      location: { city: 'Tunis', country: 'Tunisia', address: '123 St', postalCode: '1000' },
      ticketTypes: [],
      ...overrides,
    });
  };

  // ============================================
  // POST /api/events/:id/ticket-types — Add Ticket Type
  // ============================================

  describe('POST /api/events/:id/ticket-types — Add Ticket Type', () => {
    let eventId: string;

    beforeEach(async () => {
      eventId = TEST_EVENT_IDS.addTicket;
      await seedDraftEvent(eventId);
    });

    it('should add a ticket type to a draft event', async () => {
      const dto = createTestTicketTypeDto();

      const response = await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(dto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('ticketTypeId');
      expect(response.body.message).toBe('Ticket type added successfully');
    });

    it('should add multiple ticket types to an event', async () => {
      // First ticket type
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestTicketTypeDto({ name: 'General Admission' }))
        .expect(HttpStatus.CREATED);

      // Second ticket type
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestTicketTypeDto({ name: 'VIP Access', price: 150 }))
        .expect(HttpStatus.CREATED);
    });

    it('should reject adding ticket type without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .send(createTestTicketTypeDto())
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject adding ticket type with PARTICIPANT role', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send(createTestTicketTypeDto())
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject adding ticket type by non-owner organizer', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .send(createTestTicketTypeDto())
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject adding ticket type with missing name', async () => {
      const invalidDto = createTestTicketTypeDto();
      delete (invalidDto as any).name;

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject adding ticket type with missing price', async () => {
      const invalidDto = createTestTicketTypeDto();
      delete (invalidDto as any).price;

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject adding ticket type with negative price', async () => {
      const invalidDto = createTestTicketTypeDto({ price: -10 });

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject adding ticket type with zero quantity', async () => {
      const invalidDto = createTestTicketTypeDto({ quantity: 0 });

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject adding ticket type with missing currency', async () => {
      const invalidDto = createTestTicketTypeDto();
      delete (invalidDto as any).currency;

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject adding ticket type to non-existent event', async () => {
      await request(app.getHttpServer())
        .post('/api/events/00000000-0000-0000-0000-000000000000/ticket-types')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestTicketTypeDto())
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject adding ticket type with invalid date format', async () => {
      const invalidDto = createTestTicketTypeDto({ salesStartDate: 'not-a-date' });

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // PUT /api/events/:id/ticket-types/:typeId — Update Ticket Type
  // ============================================

  describe('PUT /api/events/:id/ticket-types/:typeId — Update Ticket Type', () => {
    let eventId: string;
    const ticketTypeId = TEST_TICKET_IDS.tktUpdate1;

    beforeEach(async () => {
      eventId = TEST_EVENT_IDS.updateTicket;
      await seedDraftEvent(eventId, {
        ticketTypes: [
          {
            id: ticketTypeId,
            name: 'Original Ticket',
            description: 'Original description',
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

    it('should update ticket type name', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Updated Ticket Name' })
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Ticket type updated successfully');
    });

    it('should update ticket type price', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ price: 75, currency: 'TND' })
        .expect(HttpStatus.OK);
    });

    it('should update ticket type quantity', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ quantity: 200 })
        .expect(HttpStatus.OK);
    });

    it('should reject update without authentication', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .send({ name: 'Hacked Ticket' })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject update by non-owner', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .send({ name: 'Not My Ticket' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject update by participant', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ name: 'No Access' })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject update for non-existent event', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/00000000-0000-0000-0000-000000000000/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Ghost Event Ticket' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject update for non-existent ticket type', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Ghost Ticket' })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject invalid UUID for ticket type ID', async () => {
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/not-a-uuid`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Bad UUID' })
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // DELETE /api/events/:id/ticket-types/:typeId — Remove Ticket Type
  // ============================================

  describe('DELETE /api/events/:id/ticket-types/:typeId — Remove Ticket Type', () => {
    let eventId: string;
    const ticketTypeId = TEST_TICKET_IDS.tktRemove1;

    beforeEach(async () => {
      eventId = TEST_EVENT_IDS.removeTicket;
      await seedDraftEvent(eventId, {
        ticketTypes: [
          {
            id: ticketTypeId,
            name: 'Removable Ticket',
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

    it('should remove a ticket type from a draft event', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('Ticket type removed successfully');
    });

    it('should reject removal without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject removal by non-owner', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject removal by participant', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject removal for non-existent event', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/00000000-0000-0000-0000-000000000000/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject removal of non-existent ticket type', async () => {
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/00000000-0000-0000-0000-000000000000`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject removal from published event with sales', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.publishedSales,
        title: 'Published with Sales',
        status: EventStatus.PUBLISHED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [
          {
            id: TEST_TICKET_IDS.tktWithSales,
            name: 'Sold Ticket',
            priceAmount: 50,
            priceCurrency: Currency.TND,
            quantity: 100,
            soldQuantity: 10,
            salesStartDate: futureDate(-24),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
        publishedAt: new Date(),
      });

      await request(app.getHttpServer())
        .delete(`/api/events/${TEST_EVENT_IDS.publishedSales}/ticket-types/${TEST_TICKET_IDS.tktWithSales}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // Full Ticket Type Lifecycle
  // ============================================

  describe('Ticket Type Lifecycle — Add → Update → Remove', () => {
    it('should complete the full ticket type lifecycle', async () => {
      // Create the event first
      const createRes = await request(app.getHttpServer())
        .post('/api/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          title: 'Ticket Lifecycle Event',
          description: 'Testing ticket type lifecycle',
          category: 'CONCERT',
          startDate: futureDate(48).toISOString(),
          endDate: futureDate(52).toISOString(),
          location: {
            city: 'Tunis',
            country: 'Tunisia',
            address: '123 Test St',
            postalCode: '1000',
          },
        })
        .expect(HttpStatus.CREATED);

      const eventId = createRes.body.eventId;

      // Step 1: Add ticket type
      const addRes = await request(app.getHttpServer())
        .post(`/api/events/${eventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createTestTicketTypeDto({ name: 'Standard' }))
        .expect(HttpStatus.CREATED);

      const ticketTypeId = addRes.body.ticketTypeId;
      expect(ticketTypeId).toBeDefined();

      // Step 2: Update ticket type
      await request(app.getHttpServer())
        .put(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ name: 'Premium', price: 100, currency: 'TND' })
        .expect(HttpStatus.OK);

      // Step 3: Remove ticket type
      await request(app.getHttpServer())
        .delete(`/api/events/${eventId}/ticket-types/${ticketTypeId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);
    });
  });
});
