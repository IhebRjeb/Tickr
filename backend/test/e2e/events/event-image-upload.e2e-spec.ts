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
  futureDate,
  generateTestToken,
  TEST_ORGANIZER_ID,
  TEST_OTHER_ORGANIZER_ID,
  TEST_PARTICIPANT_ID,
  TEST_EVENT_IDS,
  TEST_TICKET_IDS,
} from './helpers/test-setup';

const JWT_SECRET = 'e2e-test-secret-key-for-events-module-32-chars';

/**
 * E2E Test Suite: Event Image Upload
 *
 * Tests the image upload endpoint:
 * - POST /api/events/:id/image
 *
 * Covers:
 * - Valid image uploads (JPEG, PNG, WebP)
 * - Authentication & authorization enforcement
 * - Ownership validation
 * - Missing file handling
 * - Event state validation (cancelled/completed events)
 * - S3 upload failures
 * - Old image replacement
 */
describe('E2E: Event Image Upload', () => {
  let app: INestApplication<App>;
  let eventRepository: InMemoryEventRepository;
  let domainEventPublisher: MockDomainEventPublisher;
  let mockUserValidation: ReturnType<typeof createMockUserValidationService>;
  let mockS3Service: ReturnType<typeof createMockS3Service>;
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
    mockS3Service = createMockS3Service();

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
        { provide: S3StorageService, useValue: mockS3Service },
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

    // Reset S3 mock to default success behavior
    mockS3Service.uploadImage.mockResolvedValue({
      originalUrl: 'https://cdn.example.com/events/uploaded-image.jpg',
      thumbnailUrl: 'https://cdn.example.com/events/uploaded-thumb.jpg',
    });
    mockS3Service.deleteImage.mockResolvedValue(undefined);
  });

  // Helper to create a small valid JPEG-like buffer
  const createFakeImageBuffer = (sizeInBytes = 1024): Buffer => {
    const buf = Buffer.alloc(sizeInBytes);
    // JPEG magic bytes
    buf[0] = 0xff;
    buf[1] = 0xd8;
    buf[2] = 0xff;
    buf[3] = 0xe0;
    return buf;
  };

  // ============================================
  // Seed Helpers
  // ============================================

  const seedDraftEvent = (id = TEST_EVENT_IDS.draft) =>
    eventRepository.seedEvent({
      id,
      title: 'Draft Event',
      status: EventStatus.DRAFT,
      organizerId,
      category: EventCategory.CONCERT,
      startDate: futureDate(48),
      endDate: futureDate(52),
      location: { city: 'Tunis', country: 'Tunisia' },
      ticketTypes: [],
    });

  const seedPublishedEvent = (id = TEST_EVENT_IDS.published) =>
    eventRepository.seedEvent({
      id,
      title: 'Published Event',
      status: EventStatus.PUBLISHED,
      organizerId,
      category: EventCategory.CONCERT,
      startDate: futureDate(48),
      endDate: futureDate(52),
      location: { city: 'Tunis', country: 'Tunisia' },
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
      publishedAt: new Date(),
    });

  // ============================================
  // Valid Image Uploads
  // ============================================

  describe('POST /api/events/:id/image — Valid Uploads', () => {
    it('should upload a JPEG image for a draft event', async () => {
      await seedDraftEvent();

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event-photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(response.body).toHaveProperty('imageUrl');
      expect(response.body.imageUrl).toContain('https://');
    });

    it('should upload a PNG image', async () => {
      await seedDraftEvent();

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event-banner.png',
          contentType: 'image/png',
        })
        .expect(HttpStatus.OK);

      expect(response.body.imageUrl).toBeDefined();
    });

    it('should upload a WebP image', async () => {
      await seedDraftEvent();

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event-cover.webp',
          contentType: 'image/webp',
        })
        .expect(HttpStatus.OK);

      expect(response.body.imageUrl).toBeDefined();
    });

    it('should upload image for a published event', async () => {
      await seedPublishedEvent();

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.published}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'updated-cover.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(response.body.imageUrl).toBeDefined();
    });

    it('should return thumbnailUrl when available', async () => {
      await seedDraftEvent();

      mockS3Service.uploadImage.mockResolvedValue({
        originalUrl: 'https://cdn.example.com/events/original.jpg',
        thumbnailUrl: 'https://cdn.example.com/events/thumb.jpg',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(response.body.thumbnailUrl).toBe('https://cdn.example.com/events/thumb.jpg');
    });

    it('should update event imageUrl in repository after upload', async () => {
      await seedDraftEvent();

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      const event = await eventRepository.findById(TEST_EVENT_IDS.draft);
      expect(event!.imageUrl).toBe('https://cdn.example.com/events/uploaded-image.jpg');
    });

    it('should call S3 service with correct parameters', async () => {
      await seedDraftEvent();

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(2048), {
          filename: 'my-concert-photo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(mockS3Service.uploadImage).toHaveBeenCalledTimes(1);
      expect(mockS3Service.uploadImage).toHaveBeenCalledWith(
        expect.any(Buffer),
        TEST_EVENT_IDS.draft,
        'my-concert-photo.jpg',
        'image/jpeg',
      );
    });
  });

  // ============================================
  // Old Image Replacement
  // ============================================

  describe('POST /api/events/:id/image — Old Image Replacement', () => {
    it('should delete old image before uploading new one', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.withImage,
        title: 'Event With Existing Image',
        status: EventStatus.DRAFT,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        imageUrl: 'https://cdn.example.com/events/old-image.jpg',
      });

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.withImage}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'new-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(mockS3Service.deleteImage).toHaveBeenCalledWith(
        'https://cdn.example.com/events/old-image.jpg',
      );
    });

    it('should not call deleteImage when event has no existing image', async () => {
      await seedDraftEvent();

      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'first-image.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.OK);

      expect(mockS3Service.deleteImage).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // Authentication & Authorization
  // ============================================

  describe('POST /api/events/:id/image — Auth & Authorization', () => {
    beforeEach(async () => {
      await seedDraftEvent();
    });

    it('should reject upload without authentication', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.UNAUTHORIZED);
    });

    it('should reject upload by participant role', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${participantToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should reject upload by non-owner organizer', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${otherOrganizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.FORBIDDEN);
    });
  });

  // ============================================
  // Missing / Invalid File
  // ============================================

  describe('POST /api/events/:id/image — File Validation', () => {
    beforeEach(async () => {
      await seedDraftEvent();
    });

    it('should reject upload without a file', async () => {
      await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject unsupported file types (e.g. GIF)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'animation.gif',
          contentType: 'image/gif',
        });

      // Multer's fileFilter rejects with 415
      expect(response.status).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    });

    it('should reject non-image file types (e.g. PDF)', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'document.pdf',
          contentType: 'application/pdf',
        });

      expect(response.status).toBe(HttpStatus.UNSUPPORTED_MEDIA_TYPE);
    });
  });

  // ============================================
  // Event State Validation
  // ============================================

  describe('POST /api/events/:id/image — Event State Validation', () => {
    it('should reject upload for a cancelled event', async () => {
      await eventRepository.seedEvent({
        id: TEST_EVENT_IDS.cancelled,
        title: 'Cancelled Event',
        status: EventStatus.CANCELLED,
        organizerId,
        category: EventCategory.CONCERT,
        startDate: futureDate(48),
        endDate: futureDate(52),
        location: { city: 'Tunis', country: 'Tunisia' },
        ticketTypes: [],
        cancelledAt: new Date(),
        cancellationReason: 'No venue',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.cancelled}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        });

      // Handler returns EVENT_NOT_MODIFIABLE → controller maps to 400 or similar
      expect([HttpStatus.BAD_REQUEST, HttpStatus.FORBIDDEN]).toContain(response.status);
    });

    it('should reject upload for a non-existent event', async () => {
      await request(app.getHttpServer())
        .post('/api/events/00000000-0000-0000-0000-000000000000/image')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should reject upload with invalid UUID', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/events/not-a-uuid/image')
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        });

      // Guard runs before ParseUUIDPipe, so may return 404 or 400
      expect([HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND]).toContain(response.status);
    });
  });

  // ============================================
  // S3 Upload Failure
  // ============================================

  describe('POST /api/events/:id/image — S3 Failure Handling', () => {
    it('should return error when S3 upload fails', async () => {
      await seedDraftEvent();

      mockS3Service.uploadImage.mockRejectedValue(
        new Error('S3 connection timeout'),
      );

      const response = await request(app.getHttpServer())
        .post(`/api/events/${TEST_EVENT_IDS.draft}/image`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .attach('file', createFakeImageBuffer(), {
          filename: 'event.jpg',
          contentType: 'image/jpeg',
        });

      expect(response.status).toBe(HttpStatus.BAD_REQUEST);
    });
  });
});
