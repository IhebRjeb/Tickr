/**
 * @file Ticket Reservation E2E Tests
 * @description Full reservation → confirmation → cancellation flow
 */


import { CancelTicketsHandler } from '@modules/tickets/application/commands/cancel-tickets/cancel-tickets.handler';
import { CheckInTicketHandler } from '@modules/tickets/application/commands/check-in-ticket/check-in-ticket.handler';
import { ConfirmTicketsHandler } from '@modules/tickets/application/commands/confirm-tickets/confirm-tickets.handler';
import { ExpireTicketsHandler } from '@modules/tickets/application/commands/expire-tickets/expire-tickets.handler';
import { ReserveTicketsHandler } from '@modules/tickets/application/commands/reserve-tickets/reserve-tickets.handler';
import { TransferTicketHandler } from '@modules/tickets/application/commands/transfer-ticket/transfer-ticket.handler';
import { CHECK_IN_REPOSITORY } from '@modules/tickets/application/ports/check-in.repository.port';
import { EVENT_QUERY_PORT } from '@modules/tickets/application/ports/event-query.port';
import { TICKET_REPOSITORY } from '@modules/tickets/application/ports/ticket.repository.port';
import { USER_QUERY_PORT } from '@modules/tickets/application/ports/user-query.port';
import { GetEventCheckInStatsHandler } from '@modules/tickets/application/queries/get-event-check-in-stats/get-event-check-in-stats.handler';
import { GetEventTicketsHandler } from '@modules/tickets/application/queries/get-event-tickets/get-event-tickets.handler';
import { GetTicketByIdHandler } from '@modules/tickets/application/queries/get-ticket-by-id/get-ticket-by-id.handler';
import { GetTicketByQRCodeHandler } from '@modules/tickets/application/queries/get-ticket-by-qr-code/get-ticket-by-qr-code.handler';
import { GetUserTicketsHandler } from '@modules/tickets/application/queries/get-user-tickets/get-user-tickets.handler';
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
  MockEventQueryAdapter,
  MockUserQueryAdapter,
  MockDomainEventPublisher,
  MockTicketS3StorageService,
  TEST_USER_IDS,
  TEST_EVENT_IDS,
  TEST_TICKET_TYPE_IDS,
  generateTestToken,
} from './helpers/test-setup';

describe('Ticket Reservation E2E', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let ticketRepository: InMemoryTicketRepository;
  let eventQueryAdapter: MockEventQueryAdapter;
  let participantToken: string;

  beforeAll(async () => {
    ticketRepository = new InMemoryTicketRepository();
    const checkInRepository = new InMemoryCheckInRepository();
    eventQueryAdapter = new MockEventQueryAdapter();
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
        { provide: EVENT_QUERY_PORT, useValue: eventQueryAdapter },
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
    participantToken = generateTestToken(jwtService, {
      userId: TEST_USER_IDS.participant,
      email: 'john@example.com',
      role: 'PARTICIPANT',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    ticketRepository.clear();
    eventQueryAdapter.clear();
  });

  // ============================================
  // POST /api/tickets/reserve
  // ============================================

  describe('POST /api/tickets/reserve', () => {
    const reserveDto = {
      eventId: TEST_EVENT_IDS.published,
      ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
      holders: [
        { name: 'John Doe', email: 'john@example.com' },
      ],
    };

    it('should reserve tickets successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send(reserveDto)
        .expect(HttpStatus.CREATED);

      expect(response.body.ticketIds).toHaveLength(1);
      expect(response.body.reservedUntil).toBeDefined();
    });

    it('should reserve multiple tickets for multiple holders', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          ...reserveDto,
          holders: [
            { name: 'John Doe', email: 'john@example.com' },
            { name: 'Jane Doe', email: 'jane@example.com' },
          ],
        })
        .expect(HttpStatus.CREATED);

      expect(response.body.ticketIds).toHaveLength(2);
    });

    it('should fail with insufficient availability', async () => {
      eventQueryAdapter.setAvailability(TEST_TICKET_TYPE_IDS.standard, 0);

      await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send(reserveDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail with invalid event ID', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ ...reserveDto, eventId: 'not-a-uuid' })
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('should fail when event not found', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          ...reserveDto,
          eventId: '99999999-0000-4000-8000-000000000001',
        })
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should fail without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .send(reserveDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  // ============================================
  // POST /api/tickets/confirm
  // ============================================

  describe('POST /api/tickets/confirm', () => {
    it('should confirm reserved tickets', async () => {
      // Reserve first
      const reserveResponse = await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
          holders: [{ name: 'John Doe', email: 'john@example.com' }],
        })
        .expect(HttpStatus.CREATED);

      const ticketIds = reserveResponse.body.ticketIds;

      // Confirm
      const confirmResponse = await request(app.getHttpServer())
        .post('/api/tickets/confirm')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          ticketIds,
          orderId: '40000000-0000-4000-8000-000000000001',
        })
        .expect(HttpStatus.OK);

      expect(confirmResponse.body.confirmedIds).toEqual(ticketIds);
    });

    it('should fail when tickets not found', async () => {
      await request(app.getHttpServer())
        .post('/api/tickets/confirm')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          ticketIds: ['99999999-0000-4000-8000-000000000099'],
          orderId: '40000000-0000-4000-8000-000000000001',
        })
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  // ============================================
  // POST /api/tickets/cancel
  // ============================================

  describe('POST /api/tickets/cancel', () => {
    it('should cancel reserved tickets', async () => {
      const reserveResponse = await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
          holders: [{ name: 'John Doe', email: 'john@example.com' }],
        })
        .expect(HttpStatus.CREATED);

      const ticketIds = reserveResponse.body.ticketIds;

      await request(app.getHttpServer())
        .post('/api/tickets/cancel')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ ticketIds, reason: 'Changed plans' })
        .expect(HttpStatus.OK);

      // Verify ticket is cancelled
      const ticket = await ticketRepository.findById(ticketIds[0]);
      expect(ticket!.status).toBe('CANCELLED');
    });
  });

  // ============================================
  // Full Lifecycle: Reserve → Confirm → View
  // ============================================

  describe('Full Lifecycle', () => {
    it('should complete reserve → confirm → get details flow', async () => {
      // Step 1: Reserve
      const reserveResponse = await request(app.getHttpServer())
        .post('/api/tickets/reserve')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          eventId: TEST_EVENT_IDS.published,
          ticketTypeId: TEST_TICKET_TYPE_IDS.standard,
          holders: [{ name: 'John Doe', email: 'john@example.com' }],
        })
        .expect(HttpStatus.CREATED);

      const ticketId = reserveResponse.body.ticketIds[0];
      expect(reserveResponse.body.reservedUntil).toBeDefined();

      // Step 2: Confirm
      await request(app.getHttpServer())
        .post('/api/tickets/confirm')
        .set('Authorization', `Bearer ${participantToken}`)
        .send({
          ticketIds: [ticketId],
          orderId: '40000000-0000-4000-8000-000000000001',
        })
        .expect(HttpStatus.OK);

      // Step 3: Get ticket details
      const detailsResponse = await request(app.getHttpServer())
        .get(`/api/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.OK);

      expect(detailsResponse.body.id).toBe(ticketId);
      expect(detailsResponse.body.status).toBe('CONFIRMED');
      expect(detailsResponse.body.holderName).toBe('John Doe');
      expect(detailsResponse.body.qrCode).toMatch(/^v1-/);
    });
  });

  // ============================================
  // GET /api/tickets (User's Tickets)
  // ============================================

  describe('GET /api/tickets', () => {
    it('should return paginated user tickets', async () => {
      // Seed some tickets
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.participant });
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.participant });
      ticketRepository.seedTicket({ userId: TEST_USER_IDS.otherUser });

      const response = await request(app.getHttpServer())
        .get('/api/tickets')
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(HttpStatus.OK);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should fail without auth', async () => {
      await request(app.getHttpServer())
        .get('/api/tickets')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
