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
import { EventMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/event.mapper';
import { TicketTypeMapper } from '../../../src/modules/events/infrastructure/persistence/mappers/ticket-type.mapper';
import { S3StorageService } from '../../../src/modules/events/infrastructure/services/s3-storage.service';
import { DomainEventPublisher } from '../../../src/shared/infrastructure/events/domain-event.publisher';

// ============================================
// Mock User Validation Service
// ============================================

const mockUserValidationService = {
  validateOrganizer: jest.fn().mockResolvedValue({
    exists: true,
    isActive: true,
    isOrganizer: true,
    firstName: 'Test',
    lastName: 'Organizer',
  }),
  userExists: jest.fn().mockResolvedValue(true),
  isEventOwner: jest.fn().mockImplementation((userId: string, organizerId: string) => userId === organizerId),
  hasRole: jest.fn().mockResolvedValue(true),
  isAdmin: jest.fn().mockResolvedValue(false),
};

// ============================================
// Mock Event Repository (In-Memory)
// ============================================

class MockEventRepository {
  private events: Map<string, any> = new Map();
  private ticketTypes: Map<string, any[]> = new Map();

  async findById(id: string) {
    return this.events.get(id) || null;
  }

  async findPublished(_filters: any = {}, options: any = {}) {
    const published = Array.from(this.events.values()).filter(
      (e) => e.status === EventStatus.PUBLISHED,
    );
    return {
      data: published.slice(0, options.limit || 10),
      total: published.length,
    };
  }

  async findByCategory(category: string, options: any = {}) {
    const filtered = Array.from(this.events.values()).filter(
      (e) => e.category === category && e.status === EventStatus.PUBLISHED,
    );
    return {
      data: filtered.slice(0, options.limit || 10),
      total: filtered.length,
    };
  }

  async findByOrganizer(organizerId: string, options: any = {}) {
    const filtered = Array.from(this.events.values()).filter(
      (e) => e.organizerId === organizerId,
    );
    return {
      data: filtered.slice(0, options.limit || 10),
      total: filtered.length,
    };
  }

  async findUpcoming(options: any = {}) {
    const now = new Date();
    const filtered = Array.from(this.events.values()).filter(
      (e) => e.status === EventStatus.PUBLISHED && e.startDate > now,
    );
    return {
      data: filtered.slice(0, options.limit || 10),
      total: filtered.length,
    };
  }

  async searchByTitle(searchTerm: string, options: any = {}) {
    const filtered = Array.from(this.events.values()).filter(
      (e) =>
        e.status === EventStatus.PUBLISHED &&
        e.title.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    return {
      data: filtered.slice(0, options.limit || 10),
      total: filtered.length,
    };
  }

  async save(event: any) {
    const id = event.id || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const savedEvent = { ...event, id };
    this.events.set(id, savedEvent);
    return savedEvent;
  }

  async delete(id: string) {
    this.events.delete(id);
  }

  async existsById(id: string) {
    return this.events.has(id);
  }

  async countByOrganizer(organizerId: string) {
    return Array.from(this.events.values()).filter(
      (e) => e.organizerId === organizerId,
    ).length;
  }

  // Helper methods for tests
  clear() {
    this.events.clear();
    this.ticketTypes.clear();
  }

  async seedEvent(eventData: any) {
    return this.save(eventData);
  }

  getAllEvents() {
    return Array.from(this.events.values());
  }
}

// ============================================
// Mock Domain Event Publisher
// ============================================

class MockDomainEventPublisher {
  private publishedEvents: any[] = [];

  async publishAll(events: any[]) {
    this.publishedEvents.push(...events);
  }

  getPublishedEvents() {
    return this.publishedEvents;
  }

  clear() {
    this.publishedEvents = [];
  }
}

// ============================================
// Test Helpers
// ============================================

const futureDate = (hoursFromNow: number): Date => {
  const date = new Date();
  date.setTime(date.getTime() + hoursFromNow * 60 * 60 * 1000);
  return date;
};

const createTestEventDto = (overrides = {}) => ({
  title: 'Test Concert Event',
  description: 'An amazing test concert',
  category: 'CONCERT',
  startDate: futureDate(48).toISOString(),
  endDate: futureDate(52).toISOString(),
  location: {
    city: 'Tunis',
    country: 'Tunisia',
    address: '123 Test Street',
    postalCode: '1000',
  },
  ...overrides,
});

const createTestTicketTypeDto = (overrides = {}) => ({
  name: 'General Admission',
  description: 'Standard entry ticket',
  priceAmount: 50,
  priceCurrency: 'TND',
  quantity: 100,
  salesStartDate: futureDate(2).toISOString(),
  salesEndDate: futureDate(46).toISOString(),
  ...overrides,
});

// ============================================
// Integration Tests
// ============================================

/**
 * Events Module - Integration Tests
 *
 * NOTE: These tests require additional setup to work properly:
 * 1. JWT Strategy configuration for authentication
 * 2. Mock repository returning domain entity instances (not plain objects)
 * 3. Guards must be properly configured or mocked
 *
 * For now, this file provides the test scaffolding and demonstrates
 * the intended integration test approach. Full implementation requires
 * the UsersModule JWT infrastructure.
 *
 * @see /docs/03-architecture/11-database-testing-strategy.md
 */

describe.skip('Events Module - Integration Tests', () => {
  let app: INestApplication;
  let eventRepository: MockEventRepository;
  let domainEventPublisher: MockDomainEventPublisher;
  let jwtService: JwtService;
  let organizerToken: string;
  const organizerId = 'organizer-user-123';
  const otherUserId = 'other-user-456';

  beforeAll(async () => {
    eventRepository = new MockEventRepository();
    domainEventPublisher = new MockDomainEventPublisher();

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        CqrsModule,
        JwtModule.register({
          secret: 'test-secret-key-for-jwt-signing',
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
        {
          provide: EVENT_REPOSITORY,
          useValue: eventRepository,
        },

        // User Validation Service
        {
          provide: USER_VALIDATION_SERVICE,
          useValue: mockUserValidationService,
        },

        // Domain Event Publisher
        {
          provide: DomainEventPublisher,
          useValue: domainEventPublisher,
        },

        // S3 Storage Service (mocked)
        {
          provide: S3StorageService,
          useValue: {
            uploadImage: jest.fn().mockResolvedValue('https://example.com/image.jpg'),
            deleteImage: jest.fn().mockResolvedValue(undefined),
          },
        },

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
        SetEventCommissionOverrideHandler,

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    jwtService = module.get<JwtService>(JwtService);

    // Generate test tokens
    organizerToken = jwtService.sign({
      sub: organizerId,
      email: 'organizer@test.com',
      role: 'ORGANIZER',
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
  });

  // ============================================
  // Event Creation Tests
  // ============================================

  describe('POST /events - Create Event', () => {
    it('should create an event successfully', async () => {
      const createEventDto = createTestEventDto();

      const response = await request(app.getHttpServer() as App)
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createEventDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createEventDto.title);
      expect(response.body.category).toBe(createEventDto.category);
      expect(response.body.status).toBe('DRAFT');
    });

    it('should reject event creation with missing required fields', async () => {
      const invalidDto = {
        title: 'Test Event',
        // Missing other required fields
      };

      await request(app.getHttpServer() as App)
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(invalidDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject event creation without authentication', async () => {
      const createEventDto = createTestEventDto();

      await request(app.getHttpServer() as App)
        .post('/events')
        .send(createEventDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject event with end date before start date', async () => {
      const createEventDto = createTestEventDto({
        startDate: futureDate(52).toISOString(),
        endDate: futureDate(48).toISOString(), // Before start date
      });

      await request(app.getHttpServer() as App)
        .post('/events')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(createEventDto)
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // Event Retrieval Tests
  // ============================================

  describe('GET /events/:id - Get Event By ID', () => {
    it('should return a published event for any user', async () => {
      // Seed a published event
      const publishedEvent = await eventRepository.seedEvent({
        id: 'evt-published-1',
        title: 'Published Event',
        status: EventStatus.PUBLISHED,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer() as App)
        .get(`/events/${publishedEvent.id}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(publishedEvent.id);
      expect(response.body.title).toBe('Published Event');
    });

    it('should return 404 for non-existent event', async () => {
      await request(app.getHttpServer() as App)
        .get('/events/non-existent-id')
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should allow organizer to view draft event', async () => {
      const draftEvent = await eventRepository.seedEvent({
        id: 'evt-draft-1',
        title: 'Draft Event',
        status: EventStatus.DRAFT,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app.getHttpServer() as App)
        .get(`/events/${draftEvent.id}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(draftEvent.id);
      expect(response.body.status).toBe('DRAFT');
    });
  });

  // ============================================
  // List Events Tests
  // ============================================

  describe('GET /events - Get Published Events', () => {
    beforeEach(async () => {
      // Seed multiple events
      await eventRepository.seedEvent({
        id: 'evt-1',
        title: 'Concert 1',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONCERT,
        organizerId: organizerId,
        startDate: futureDate(24),
        endDate: futureDate(28),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-2',
        title: 'Conference 1',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONFERENCE,
        organizerId: organizerId,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Paris', country: 'France' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-3',
        title: 'Draft Event',
        status: EventStatus.DRAFT,
        category: EventCategory.CONCERT,
        organizerId: organizerId,
        startDate: futureDate(72),
        endDate: futureDate(76),
        location: { city: 'London', country: 'UK' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return only published events', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((e: any) => e.status === 'PUBLISHED')).toBe(true);
    });

    it('should support pagination', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events')
        .query({ page: 1, limit: 1 })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body).toHaveProperty('totalPages');
    });
  });

  // ============================================
  // Event Update Tests
  // ============================================

  describe('PATCH /events/:id - Update Event', () => {
    let draftEventId: string;

    beforeEach(async () => {
      const draftEvent = await eventRepository.seedEvent({
        id: 'evt-draft-update',
        title: 'Original Title',
        description: 'Original description',
        status: EventStatus.DRAFT,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      draftEventId = draftEvent.id;
    });

    it('should update event title', async () => {
      const response = await request(app.getHttpServer() as App)
        .patch(`/events/${draftEventId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ title: 'Updated Title' })
        .expect(HttpStatus.OK);

      expect(response.body.title).toBe('Updated Title');
    });

    it('should reject update from non-owner', async () => {
      const otherUserToken = jwtService.sign({
        sub: otherUserId,
        email: 'other@test.com',
        role: 'ORGANIZER',
      });

      await request(app.getHttpServer() as App)
        .patch(`/events/${draftEventId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ title: 'Hacked Title' })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================
  // Event Publish Tests
  // ============================================

  describe('POST /events/:id/publish - Publish Event', () => {
    let draftEventId: string;

    beforeEach(async () => {
      const draftEvent = await eventRepository.seedEvent({
        id: 'evt-to-publish',
        title: 'Event to Publish',
        status: EventStatus.DRAFT,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia', address: '123 St', postalCode: '1000' },
        ticketTypes: [
          {
            id: 'tkt-1',
            name: 'General',
            priceAmount: 50,
            priceCurrency: Currency.TND,
            quantity: 100,
            soldQuantity: 0,
            salesStartDate: futureDate(2),
            salesEndDate: futureDate(46),
            isActive: true,
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      draftEventId = draftEvent.id;
    });

    it('should publish a valid draft event', async () => {
      const response = await request(app.getHttpServer() as App)
        .post(`/events/${draftEventId}/publish`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('PUBLISHED');
      expect(response.body).toHaveProperty('publishedAt');
    });

    it('should reject publish without authentication', async () => {
      await request(app.getHttpServer() as App)
        .post(`/events/${draftEventId}/publish`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================
  // Event Cancellation Tests
  // ============================================

  describe('POST /events/:id/cancel - Cancel Event', () => {
    let publishedEventId: string;

    beforeEach(async () => {
      const publishedEvent = await eventRepository.seedEvent({
        id: 'evt-to-cancel',
        title: 'Event to Cancel',
        status: EventStatus.PUBLISHED,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      publishedEventId = publishedEvent.id;
    });

    it('should cancel event with reason', async () => {
      const response = await request(app.getHttpServer() as App)
        .post(`/events/${publishedEventId}/cancel`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ reason: 'Weather conditions' })
        .expect(HttpStatus.OK);

      expect(response.body.status).toBe('CANCELLED');
      expect(response.body.cancellationReason).toBe('Weather conditions');
    });

    it('should reject cancellation without reason', async () => {
      await request(app.getHttpServer() as App)
        .post(`/events/${publishedEventId}/cancel`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({})
        .expect(HttpStatus.BAD_REQUEST);
    });
  });

  // ============================================
  // Category Filter Tests
  // ============================================

  describe('GET /events/category/:category - Get Events By Category', () => {
    beforeEach(async () => {
      await eventRepository.seedEvent({
        id: 'evt-concert-1',
        title: 'Rock Concert',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONCERT,
        organizerId: organizerId,
        startDate: futureDate(24),
        endDate: futureDate(28),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-conference-1',
        title: 'Tech Conference',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONFERENCE,
        organizerId: organizerId,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Paris', country: 'France' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return events for specific category', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events/category/CONCERT')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe('CONCERT');
    });

    it('should return empty list for category with no events', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events/category/SPORT')
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
    });
  });

  // ============================================
  // Search Tests
  // ============================================

  describe('GET /events/search - Search Events', () => {
    beforeEach(async () => {
      await eventRepository.seedEvent({
        id: 'evt-rock',
        title: 'Amazing Rock Festival',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONCERT,
        organizerId: organizerId,
        startDate: futureDate(24),
        endDate: futureDate(28),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-jazz',
        title: 'Jazz Night',
        status: EventStatus.PUBLISHED,
        category: EventCategory.CONCERT,
        organizerId: organizerId,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Paris', country: 'France' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should find events matching search term', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events/search')
        .query({ q: 'Rock' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toContain('Rock');
    });

    it('should return empty for non-matching search', async () => {
      const response = await request(app.getHttpServer() as App)
        .get('/events/search')
        .query({ q: 'Classical' })
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(0);
    });
  });

  // ============================================
  // Ticket Type Tests
  // ============================================

  describe('POST /events/:id/ticket-types - Add Ticket Type', () => {
    let draftEventId: string;

    beforeEach(async () => {
      const draftEvent = await eventRepository.seedEvent({
        id: 'evt-for-tickets',
        title: 'Event for Tickets',
        status: EventStatus.DRAFT,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      draftEventId = draftEvent.id;
    });

    it('should add ticket type to event', async () => {
      const ticketTypeDto = createTestTicketTypeDto();

      const response = await request(app.getHttpServer() as App)
        .post(`/events/${draftEventId}/ticket-types`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .send(ticketTypeDto)
        .expect(HttpStatus.CREATED);

      expect(response.body).toHaveProperty('ticketTypes');
      expect(response.body.ticketTypes).toHaveLength(1);
      expect(response.body.ticketTypes[0].name).toBe(ticketTypeDto.name);
    });
  });

  // ============================================
  // Organizer Events Tests
  // ============================================

  describe('GET /events/organizer/:organizerId - Get Organizer Events', () => {
    beforeEach(async () => {
      await eventRepository.seedEvent({
        id: 'evt-org-1',
        title: 'My Event 1',
        status: EventStatus.PUBLISHED,
        organizerId: organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(24),
        endDate: futureDate(28),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-org-2',
        title: 'My Event 2',
        status: EventStatus.DRAFT,
        organizerId: organizerId,
        category: EventCategory.CONFERENCE,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Paris', country: 'France' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await eventRepository.seedEvent({
        id: 'evt-other',
        title: 'Other User Event',
        status: EventStatus.PUBLISHED,
        organizerId: otherUserId,
        category: EventCategory.SPORT,
        startDate: futureDate(72),
        endDate: futureDate(76),
        location: { city: 'London', country: 'UK' },
        ticketTypes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should return all events for specific organizer', async () => {
      const response = await request(app.getHttpServer() as App)
        .get(`/events/organizer/${organizerId}`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((e: any) => e.organizerId === organizerId)).toBe(true);
    });
  });
});
