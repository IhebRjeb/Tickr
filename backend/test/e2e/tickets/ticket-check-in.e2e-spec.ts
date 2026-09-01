/**
 * @file Ticket Check-In E2E Tests
 * @description Check-in flow including QR validation, time window, and duplicate detection
 */


import { CancelTicketsHandler } from '@modules/tickets/application/commands/cancel-tickets/cancel-tickets.handler';
import { CheckInTicketHandler } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.handler';
import { ConfirmTicketsHandler } from '@modules/tickets/application/commands/confirm-tickets/confirm-tickets.handler';
import { ExpireTicketsHandler } from '@modules/tickets/application/commands/expire-tickets/expire-tickets.handler';
import { ReserveTicketsHandler } from '@modules/tickets/application/commands/reserve-tickets/reserve-tickets.handler';
import { TransferTicketHandler } from '@modules/tickets/application/commands/transfer-ticket/transfer-ticket.handler';
import { CHECK_IN_REPOSITORY } from '@modules/tickets/application/ports/check-in.repository.port';
import { EVENT_CHECK_IN_ACCESS_PORT } from '@modules/tickets/application/ports/event-check-in-access.port';
import { EVENT_QUERY_PORT } from '@modules/tickets/application/ports/event-query.port';
import { TICKET_CHECK_IN_PERSISTENCE_PORT } from '@modules/tickets/application/ports/ticket-check-in-persistence.port';
import { TICKET_REPOSITORY } from '@modules/tickets/application/ports/ticket.repository.port';
import { USER_QUERY_PORT } from '@modules/tickets/application/ports/user-query.port';
import { GetEventCheckInStatsHandler } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventTicketsHandler } from '@modules/tickets/application/queries/get-event-tickets/get-event-tickets.handler';
import { GetTicketByIdHandler } from '@modules/tickets/application/queries/get-ticket-by-id/get-ticket-by-id.handler';
import { GetTicketByQRCodeHandler } from '@modules/tickets/application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.handler';
import { GetUserTicketsHandler } from '@modules/tickets/application/queries/get-user-tickets/get-user-tickets.handler';
import { TicketStatus } from '@modules/tickets/domain/value-objects/ticket-status.vo';
import { TicketsController } from '@modules/tickets/infrastructure/controllers/tickets.controller';
import { TicketS3StorageService } from '@modules/tickets/infrastructure/services/ticket-s3-storage.service';
import { HttpStatus, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { DOMAIN_EVENT_PUBLISHER } from '@shared/application/interfaces/domain-event-publisher.port';
import { JwtAuthGuard } from '@shared/infrastructure/common/guards/jwt-auth.guard';
import { RolesGuard } from '@shared/infrastructure/common/guards/roles.guard';
import request from 'supertest';

import {
  InMemoryTicketRepository,
  InMemoryCheckInRepository,
  InMemoryTicketCheckInPersistence,
  MockEventCheckInAccessAdapter,
  MockEventQueryAdapter,
  MockUserQueryAdapter,
  MockDomainEventPublisher,
  MockTicketS3StorageService,
  TEST_USER_IDS,
  TEST_EVENT_IDS,
  generateTestToken,
} from './helpers/test-setup';

describe('Ticket Check-In E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ticketRepository: InMemoryTicketRepository;
  let checkInRepository: InMemoryCheckInRepository;
  let checkInPersistence: InMemoryTicketCheckInPersistence;
  let eventCheckInAccess: MockEventCheckInAccessAdapter;
  let eventQueryAdapter: MockEventQueryAdapter;
  let organizerToken: string;
  let participantToken: string;

  beforeAll(async () => {
    ticketRepository = new InMemoryTicketRepository();
    checkInRepository = new InMemoryCheckInRepository();
    eventQueryAdapter = new MockEventQueryAdapter();
    eventCheckInAccess = new MockEventCheckInAccessAdapter(eventQueryAdapter);
    checkInPersistence = new InMemoryTicketCheckInPersistence(
      ticketRepository,
      checkInRepository,
    );
    const userQueryAdapter = new MockUserQueryAdapter();
    const eventPublisher = new MockDomainEventPublisher();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [TicketsController],
      providers: [
        { provide: TICKET_REPOSITORY, useValue: ticketRepository },
        { provide: CHECK_IN_REPOSITORY, useValue: checkInRepository },
        { provide: EVENT_CHECK_IN_ACCESS_PORT, useValue: eventCheckInAccess },
        { provide: EVENT_QUERY_PORT, useValue: eventQueryAdapter },
        {
          provide: TICKET_CHECK_IN_PERSISTENCE_PORT,
          useValue: checkInPersistence,
        },
        { provide: USER_QUERY_PORT, useValue: userQueryAdapter },
        { provide: DOMAIN_EVENT_PUBLISHER, useValue: eventPublisher },
        { provide: TicketS3StorageService, useValue: new MockTicketS3StorageService() },
        JwtAuthGuard,
        RolesGuard,
        ReserveTicketsHandler,
        ConfirmTicketsHandler,
        CancelTicketsHandler,
        CheckInTicketHandler,
        TransferTicketHandler,
        ExpireTicketsHandler,
        GetTicketByIdHandler,
        GetTicketByQRCodeHandler,
        GetUserTicketsHandler,
        GetEventTicketsHandler,
        GetEventCheckInStatsHandler,
      ],
    }).compile();

    app = module.createNestApplication();

    const jwtSvc = module.get<JwtService>(JwtService);
    app.use((req: any, _res: any, next: any) => {
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const payload = jwtSvc.verify(authHeader.substring(7));
          req.user = { userId: payload.sub, email: payload.email, role: payload.role };
        } catch { /* leave req.user undefined */ }
      }
      next();
    });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    await app.init();

    jwtService = module.get(JwtService);
    organizerToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.organizer,
      email: 'organizer@example.com',
      role: 'ORGANIZER',
    });
    participantToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.participant,
      email: 'john@example.com',
      role: 'PARTICIPANT',
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(() => {
    ticketRepository.clear();
    checkInRepository.clear();
    checkInPersistence.clear();
    eventCheckInAccess.clear();
    eventQueryAdapter.clear();
  });

  // ============================================
  // POST /api/tickets/check-in
  // ============================================

  describe('POST /api/tickets/check-in', () => {
    beforeEach(() => {
      // Set event to be happening now (check-in window open)
      eventQueryAdapter.setEventOverride(TEST_EVENT_IDS.published, {
        startDate: new Date(Date.now() - 30 * 60 * 1000), // started 30min ago
        endDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // ends in 4h
      });
    });

    it('should check in a confirmed ticket', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });

      const response = await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: ticket.qrCode.value,
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.OK);

      expect(response.body.isValid).toBe(true);
      expect(response.body.ticketId).toBe(ticket.id);
      expect(response.body.holderName).toBe('John Doe');
      expect(response.body.checkedInAt).toBeDefined();
    });

    it('should reject check-in with invalid QR code', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: 'invalid-qr-code',
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject check-in for non-existent QR code', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: 'v1-99999999-0000-4000-8000-000000000099-abcd',
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject duplicate check-in', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
        userId: TEST_USER_IDS.participant,
      });

      // First check-in succeeds
      await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: ticket.qrCode.value,
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.OK);

      // Second check-in fails
      await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: ticket.qrCode.value,
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should reject an unassigned participant', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
      });

      await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: ticket.qrCode.value,
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should allow a participant assigned to the event', async () => {
      const ticket = ticketRepository.seedTicket({
        status: TicketStatus.CONFIRMED,
      });
      eventCheckInAccess.assign(
        TEST_EVENT_IDS.published,
        TEST_USER_IDS.participant,
      );

      const response = await request(app.getHttpServer())
        .post('/api/tickets/check-in')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          qrCode: ticket.qrCode.value,
          deviceId: 'scanner-gate-a',
          locationGate: 'Gate A',
        })
        .expect(HttpStatus.OK);

      expect(response.body.isValid).toBe(true);
    });
  });

  // ============================================
  // GET /api/tickets/event/:eventId/stats
  // ============================================

  describe('GET /api/tickets/event/:eventId/stats', () => {
    it('should return check-in statistics', async () => {
      ticketRepository.seedTicket({
        eventId: TEST_EVENT_IDS.published,
        status: TicketStatus.CONFIRMED,
      });
      ticketRepository.seedTicket({
        eventId: TEST_EVENT_IDS.published,
        status: TicketStatus.CHECKED_IN,
      });

      const response = await request(app.getHttpServer())
        .get(`/api/tickets/event/${TEST_EVENT_IDS.published}/stats`)
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.totalTickets).toBe(2);
      expect(response.body.checkedIn).toBe(1);
      expect(response.body.checkInRate).toBe(50);
    });

    it('should deny statistics when no event access can be resolved', async () => {
      await request(app.getHttpServer())
        .get('/api/tickets/event/99999999-0000-4000-8000-000000000099/stats')
        .set('Authorization', `Bearer ${organizerToken}`)
        .expect(HttpStatus.FORBIDDEN);
    });
  });
});
